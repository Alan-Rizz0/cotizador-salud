import type { Category, Member } from "./cotizador-engine";
import { mapFamily } from "./family-mapper";

export function validateQuoteForm(input: {
  clientName: string;
  category: Category; members: Member[];
}) {
  const errors: Record<string, string> = {};
  if (input.clientName.trim().length < 3) errors.clientName = "Ingresá el nombre completo del asociado.";
  if (input.category === "Obligatorio" && !input.members.some((m) => m.contributionType && m.contributionType !== "Sin aportes")) {
    errors.contribution = "La categoría obligatoria requiere información de aportes.";
  }
  return { errors, family: mapFamily(input.members) };
}
