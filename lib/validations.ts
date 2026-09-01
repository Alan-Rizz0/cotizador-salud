import type { Category, Member } from "./cotizador-engine";
import { mapFamily } from "./family-mapper";

export function validateQuoteForm(input: {
  clientName: string; dni: string;
  category: Category; members: Member[];
}) {
  const errors: Record<string, string> = {};
  if (input.clientName.trim().length < 3) errors.clientName = "Ingresá el nombre completo del asociado.";
  if (!/^\d{7,9}$/.test(input.dni)) errors.dni = "El DNI debe contener entre 7 y 9 números.";
  if (input.category === "Obligatorio" && !input.members.some((m) => m.contributionType && m.contributionType !== "Sin aportes")) {
    errors.contribution = "La categoría obligatoria requiere información de aportes.";
  }
  return { errors, family: mapFamily(input.members) };
}
