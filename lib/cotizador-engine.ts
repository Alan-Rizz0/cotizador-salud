import { CONTRIBUTION_RULES, PRICE_TABLE, SOURCE_VERSION } from "./cotizador-data";

export type Region = keyof typeof PRICE_TABLE;
export type Category = "Voluntario" | "Obligatorio";
export type PlanName = "Medifé+" | "Bronce" | "Plata" | "Platinum";
export type MemberRole = "Titular" | "Cónyuge" | "Hijo/a" | "Familiar a cargo";
export type ContributionType = "Sin aportes" | "OBRAS SOCIALES" | "Medife" | "OSPSA" | "OSSSB" | "Unificado" | keyof typeof CONTRIBUTION_RULES.monotributo;

export type Member = {
  id: number;
  role: MemberRole;
  age: number;
  contributionType?: ContributionType;
  grossSalary?: number;
};

export type QuoteInput = {
  region: Region;
  category: Category;
  filial?: string;
  members: Member[];
  promotion?: string;
  gafDiscount?: number;
  applyChildAdjustment?: boolean;
  applyYoungSegment?: boolean;
  applyFilialDiscount?: boolean;
};

export type PlanResult = {
  plan: PlanName;
  listPrice: number;
  permanentAdjustment: number;
  filialDiscount: number;
  promotionalDiscount: number;
  ivaOrContribution: number;
  firstInstallment: number;
  installment13: number;
  promotionSchedule: { from: number; to: number; rate: number }[];
  trace: string[];
};

const PLANS: PlanName[] = ["Medifé+", "Bronce", "Plata", "Platinum"];

const PROMOTIONS: Record<Category, Record<string, { from: number; to: number; rate: number }[]>> = {
  Voluntario: {
    "Sin descuento": [],
    "Opción 1": [{ from: 1, to: 3, rate: .30 }, { from: 4, to: 5, rate: .20 }, { from: 6, to: 7, rate: .10 }],
    "Opción 2": [{ from: 1, to: 3, rate: .30 }, { from: 4, to: 9, rate: .10 }],
    "Opción 3": [{ from: 1, to: 10, rate: .15 }],
    "Opción 4": [{ from: 1, to: 12, rate: .15 }],
  },
  Obligatorio: {
    "Sin descuento": [],
    "Opción 1": [{ from: 1, to: 2, rate: .45 }, { from: 3, to: 5, rate: .30 }, { from: 6, to: 7, rate: .15 }],
    "Opción 2": [{ from: 1, to: 6, rate: .30 }, { from: 7, to: 9, rate: .10 }],
    "Opción 3": [{ from: 1, to: 11, rate: .20 }],
    "Opción 4": [{ from: 1, to: 12, rate: .20 }],
  },
};

function adultBand(role: "Titular" | "Cónyuge", age: number) {
  const prefix = role === "Titular" ? "TITULAR " : "ESPOSO (A)";
  if (age <= 25) return `${prefix} 00-25`;
  if (age <= 35) return `${prefix} 26-35`;
  if (age <= 40) return `${prefix} 36-40`;
  if (age <= 50) return `${prefix} 41-50`;
  if (age <= 60) return `${prefix} 51-60`;
  if (age <= 65) return role === "Titular" ? "TITULAR L 61-65" : "ESPOSO (A) 61-65";
  return role === "Titular" ? "TITULAR  66-00" : "ESPOSO (A) 66-00";
}

export function memberPriceKey(region: Region, member: Member) {
  if (member.role === "Titular" || member.role === "Cónyuge") return adultBand(member.role, member.age);
  if (member.role === "Familiar a cargo") return "FAMILIAR A CARGO";
  if (region === "AMBA") {
    if (member.age <= 1) return "HIJO (0 a 1)";
    if (member.age <= 20) return "HIJO (2 a 20)";
    if (member.age <= 29) return "HIJO AD. (21 a 29)";
    if (member.age <= 39) return "HIJO AD. (30 a 39)";
    return "HIJO AD. (40 a 49)";
  }
  if (member.age <= 3) return "HIJO 0 A 3";
  if (member.age <= 20) return "HIJO 4 A 20";
  if (member.age <= 25) return "HIJO 21 A 25";
  return "HIJO 26 A 29";
}

function priceKeyForPlan(region: Region, member: Member, plan: PlanName, childOrdinal: number) {
  if (member.role !== "Hijo/a" || region === "AMBA") return memberPriceKey(region, member);
  if (member.age >= 30) return "HIJO MAYOR A CARGO";
  if (plan === "Medifé+") return memberPriceKey(region, member);
  return childOrdinal === 0 ? "HIJO 1" : "HIJO 2";
}

export function estimateContribution(member: Member) {
  const type = member.contributionType ?? "Sin aportes";
  const salary = Math.max(0, member.grossSalary ?? 0);
  if (type === "Sin aportes") return 0;
  if (type.startsWith("Monotributo ")) return CONTRIBUTION_RULES.monotributo[type as keyof typeof CONTRIBUTION_RULES.monotributo] ?? 0;
  if (type === "Unificado") return salary * .0612;
  const factors: Record<string, number> = { "OBRAS SOCIALES": .93, Medife: .97, OSPSA: 1, OSSSB: .93 };
  const factor = factors[type] ?? 0;
  return (salary <= CONTRIBUTION_RULES.cap
    ? salary * (.0255 + .051)
    : CONTRIBUTION_RULES.cap * .0255 + salary * .051) * factor;
}

function filialRate(filial: string | undefined, plan: PlanName, category: Category) {
  if (category !== "Obligatorio" || plan === "Medifé+") return 0;
  const normalized = (filial ?? "").toLowerCase();
  if (/tucumán|tucuman|salta|jujuy/.test(normalized)) return -.20;
  if (/misiones|corrientes/.test(normalized)) return -.25;
  if (/córdoba|cordoba/.test(normalized)) return -.10;
  if (/santa fe/.test(normalized)) return -.05;
  return 0;
}

export function calculateQuote(input: QuoteInput): PlanResult[] {
  const categoryTable = input.category;
  const contribution = input.category === "Obligatorio"
    ? input.members.reduce((sum, member) => sum + estimateContribution(member), 0)
    : 0;
  const schedule = PROMOTIONS[input.category][input.promotion ?? "Sin descuento"] ?? [];
  const firstPromo = schedule.find((x) => x.from <= 1 && x.to >= 1)?.rate ?? 0;
  const childMembers = input.members.filter((m) => m.role === "Hijo/a" && (input.region !== "AMBA" || m.age <= 29));
  const youngAdults = input.members.filter((m) => (m.role === "Titular" || m.role === "Cónyuge") && m.age <= 29);

  return PLANS.map((plan) => {
    const trace: string[] = [];
    let listPrice = 0;
    let childBase = 0;
    let youngBase = 0;
    let childOrdinal = 0;
    for (const member of input.members) {
      const key = priceKeyForPlan(input.region, member, plan, childOrdinal);
      const row = PRICE_TABLE[input.region][key as keyof (typeof PRICE_TABLE)[Region]];
      if (!row) throw new Error(`No existe precio para ${input.region} / ${key}`);
      const value = row[categoryTable][plan];
      listPrice += value;
      if (childMembers.some((x) => x.id === member.id)) childBase += value;
      if (youngAdults.some((x) => x.id === member.id)) youngBase += value;
      trace.push(`Resumen LP: ${input.region} · ${key} · ${categoryTable} · ${plan}`);
      if (member.role === "Hijo/a") childOrdinal++;
    }

    let permanentAdjustment = 0;
    if (childBase > 0 && input.applyChildAdjustment) {
      permanentAdjustment = childBase * (input.region === "AMBA" ? -.45 : -.55);
      trace.push(`Políticas Comerciales: ajuste de hijos ${input.region === "AMBA" ? "-45%" : "-55%"}`);
    } else if (youngBase > 0 && plan !== "Medifé+" && input.applyYoungSegment) {
      const youngest = Math.min(...youngAdults.map((m) => m.age));
      const rate = youngest <= 25 ? -.26 : -.13;
      permanentAdjustment = youngBase * rate;
      trace.push(`Políticas Comerciales: segmento joven ${rate * 100}%`);
    }

    const nominalPrice = listPrice + permanentAdjustment;
    const filialDiscount = input.applyFilialDiscount ? nominalPrice * filialRate(input.filial, plan, input.category) : 0;
    const gafDiscount = nominalPrice * Math.max(-.85, Math.min(0, input.gafDiscount ?? 0));
    const promotionalDiscount = nominalPrice * -firstPromo + gafDiscount;
    const discounted = nominalPrice + filialDiscount + promotionalDiscount;
    const ivaOrContribution = input.category === "Voluntario" ? discounted * .105 : -contribution;
    const firstInstallment = Math.max(0, discounted + ivaOrContribution);
    const installment13Tax = input.category === "Voluntario" ? nominalPrice * .105 : -contribution;
    const installment13 = Math.max(0, nominalPrice + installment13Tax);
    trace.push(input.category === "Voluntario" ? "AMBA/Interior: IVA 10,5%" : "C aux: aportes estimados");
    if (firstPromo) trace.push(`Políticas Comerciales: ${input.promotion}, cuota 1 -${firstPromo * 100}%`);

    return { plan, listPrice, permanentAdjustment, filialDiscount, promotionalDiscount, ivaOrContribution, firstInstallment, installment13, promotionSchedule: schedule, trace };
  });
}

export const ENGINE_SOURCE_VERSION = SOURCE_VERSION;
export const PROMOTION_OPTIONS = PROMOTIONS;
