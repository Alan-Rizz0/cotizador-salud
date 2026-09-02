import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { Member, PlanResult } from "./cotizador-engine";

type PdfInput = {
  quoteId: string; issueDate: string; validityDate: string;
  client: { name: string; region: string; category: string };
  familyGroup: string; members: Member[]; plans: PlanResult[];
  selectedPlans: string[]; discountPercent: number;
};

const money = (value: number) => "$ " + Math.round(value).toLocaleString("es-AR");
const safe = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
const navy = rgb(.09, .22, .29), teal = rgb(.30, .58, .54), mint = rgb(.91, .96, .95), gray = rgb(.39, .48, .53), border = rgb(.87, .91, .90);

function text(page: PDFPage, font: PDFFont, value: string, x: number, y: number, size = 9, color = navy) {
  page.drawText(value, { x, y, size, font, color, maxWidth: 500 });
}

export async function downloadQuotePdf(input: PdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const selectedPlans = input.plans.filter((plan) => input.selectedPlans.includes(plan.plan));

  page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy });
  page.drawRectangle({ x: 0, y: 744, width: 595, height: 8, color: teal });
  text(page, bold, "COTIZADOR SALUD", 42, 803, 19, rgb(1,1,1));
  text(page, regular, "Una propuesta clara para elegir tu cobertura", 42, 782, 10, rgb(.80,.90,.88));
  text(page, bold, input.quoteId, 430, 803, 10, rgb(1,1,1));
  text(page, regular, `Emitida: ${input.issueDate}`, 430, 785, 8, rgb(1,1,1));
  text(page, regular, `Vigente: ${input.validityDate}`, 430, 770, 8, rgb(1,1,1));

  page.drawRectangle({ x: 42, y: 646, width: 511, height: 72, color: mint, borderColor: border, borderWidth: 1 });
  text(page, bold, input.client.name, 58, 690, 14);
  text(page, regular, `${input.client.region}  ·  ${input.client.category}`, 58, 672, 9, gray);
  text(page, regular, input.familyGroup, 58, 655, 9, gray);
  text(page, bold, `Descuento ${input.discountPercent}%`, 435, 682, 11, teal);

  text(page, bold, "GRUPO FAMILIAR", 42, 616, 10, teal);
  let memberY = 596;
  input.members.forEach((member, index) => {
    const contribution = member.contributionType && member.contributionType !== "Sin aportes" ? ` · ${member.contributionType}` : "";
    text(page, index === 0 ? bold : regular, `${index + 1}. ${member.role} · ${member.age} años${contribution}`, 48, memberY, 9);
    memberY -= 16;
  });

  const plansTop = Math.min(memberY - 18, 550);
  text(page, bold, "PLANES SELECCIONADOS", 42, plansTop, 10, teal);
  let cardY = plansTop - 105;
  selectedPlans.forEach((plan, index) => {
    if (index === 2) cardY -= 118;
    const x = 42 + (index % 2) * 260;
    page.drawRectangle({ x, y: cardY, width: 249, height: 98, color: mint, borderColor: teal, borderWidth: 2 });
    const accent = plan.plan === "Medifé+" ? teal : plan.plan === "Bronce" ? rgb(.63,.40,.25) : plan.plan === "Plata" ? rgb(.58,.63,.65) : navy;
    page.drawRectangle({ x, y: cardY + 92, width: 249, height: 6, color: accent });
    text(page, bold, plan.plan, x + 13, cardY + 71, 12);
    text(page, bold, "SELECCIONADO", x + 150, cardY + 72, 7, teal);
    text(page, regular, "Primera cuota", x + 13, cardY + 49, 8, gray);
    text(page, bold, money(plan.firstInstallment), x + 13, cardY + 30, 15);
    text(page, regular, `Desde cuota 13: ${money(plan.installment13)}`, x + 13, cardY + 13, 8, gray);
  });

  const detailsY = cardY - 25;
  text(page, bold, "DETALLE DE LOS PLANES SELECCIONADOS", 42, detailsY, 10, teal);
  let rowY = detailsY - 20;
  selectedPlans.forEach((plan) => {
    text(page, bold, plan.plan, 48, rowY, 9);
    text(page, regular, `Nominal: ${money(plan.listPrice)} · Ajustes: ${money(plan.permanentAdjustment + plan.filialDiscount + plan.promotionalDiscount)} · IVA/aportes: ${money(plan.ivaOrContribution)}`, 120, rowY, 8, gray);
    rowY -= 16;
  });

  const legalY = Math.max(38, rowY - 84);
  page.drawRectangle({ x: 42, y: legalY, width: 511, height: 72, color: rgb(.97,.98,.98), borderColor: border, borderWidth: 1 });
  text(page, bold, "Información importante", 54, legalY + 54, 9);
  text(page, regular, "Cotización válida por siete días hábiles y sujeta a actualizaciones, aumentos y ajustes.", 54, legalY + 38, 7.5, gray);
  text(page, regular, "No contempla casos de alto costo y baja incidencia. Los aportes son estimados y pueden variar.", 54, legalY + 25, 7.5, gray);
  text(page, regular, "El monto puede cambiar si se modifican los datos informados y está sujeto a incrementos.", 54, legalY + 12, 7.5, gray);
  text(page, regular, `Cotización ${input.quoteId}`, 42, 18, 8, gray);
  text(page, regular, "Valores pendientes de homologación integral contra la matriz comercial.", 325, 18, 7, gray);

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cotizacion-${safe(input.client.name) || "asociado"}-${input.issueDate.replaceAll("/", "-")}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
