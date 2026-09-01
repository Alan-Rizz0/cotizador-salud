import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Member, PlanResult } from "./cotizador-engine";

type PdfInput = {
  quoteId: string; issueDate: string; validityDate: string;
  seller: { name: string; phone: string };
  client: { name: string; dni: string; region: string; category: string };
  familyGroup: string; members: Member[]; plans: PlanResult[]; selectedPlan: string;
};

const money = (value: number) => "$ " + Math.round(value).toLocaleString("es-AR");
const safe = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

export async function downloadQuotePdf(input: PdfInput) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const ink = rgb(.09, .22, .29);
  const line = (text: string, size = 10, strong = false) => {
    if (y < 70) { page = pdf.addPage([595, 842]); y = 790; }
    page.drawText(text, { x: 45, y, size, font: strong ? bold : font, color: ink, maxWidth: 505 });
    y -= size + 7;
  };
  line("COTIZADOR SALUD", 18, true);
  line(`Cotización ${input.quoteId} · Emitida ${input.issueDate} · Vigente hasta ${input.validityDate}`, 9);
  y -= 10;
  line(`Asociado: ${input.client.name} · DNI ${input.client.dni}`, 11, true);
  line(`${input.client.region} · ${input.client.category} · ${input.familyGroup}`);
  line(`Vendedor: ${input.seller.name} · ${input.seller.phone}`);
  y -= 10;
  line("Grupo familiar", 13, true);
  input.members.forEach((m, index) => line(`${index + 1}. ${m.role} · ${m.age} años${m.contributionType && m.contributionType !== "Sin aportes" ? ` · ${m.contributionType}` : ""}`));
  y -= 10;
  line("Comparación de planes", 13, true);
  for (const plan of input.plans) {
    line(`${plan.plan}${plan.plan === input.selectedPlan ? " · SELECCIONADO" : ""}`, 11, true);
    line(`Nominal ${money(plan.listPrice)} | Ajustes ${money(plan.permanentAdjustment + plan.filialDiscount + plan.promotionalDiscount)} | IVA/aportes ${money(plan.ivaOrContribution)}`);
    line(`Primera cuota ${money(plan.firstInstallment)} | Desde cuota 13 ${money(plan.installment13)}`);
    if (plan.promotionSchedule.length) line("Promoción: " + plan.promotionSchedule.map((s) => `cuotas ${s.from}-${s.to}: ${Math.round(s.rate * 100)}%`).join(" · "), 8);
    y -= 5;
  }
  y -= 5;
  line("Información importante", 12, true);
  [
    "La presente cotización no contempla casos de alto costo y baja incidencia.",
    "La validez del presupuesto es de siete días hábiles desde su emisión.",
    "La cotización está sujeta a actualizaciones, aumentos y ajustes.",
    "Puede variar si se modifican los datos personales informados.",
    "Los aportes son estimados y pueden variar.",
    "El monto del plan está sujeto a incrementos.",
    "Validación pendiente: no constituye confirmación contractual de exactitud."
  ].forEach((note) => line("• " + note, 8));
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cotizacion-${safe(input.client.name) || "asociado"}-${input.issueDate}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
