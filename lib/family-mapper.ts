import type { Member } from "./cotizador-engine";

export type FamilyMapping = { group: string | null; errors: string[] };

export function mapFamily(members: Member[]): FamilyMapping {
  const errors: string[] = [];
  const titulares = members.filter((m) => m.role === "Titular");
  const spouses = members.filter((m) => m.role === "Cónyuge");
  const children = members.filter((m) => m.role === "Hijo/a");
  const dependants = members.filter((m) => m.role === "Familiar a cargo");

  if (titulares.length !== 1 || members[0]?.role !== "Titular") errors.push("Debe existir un único titular y ocupar la primera posición.");
  if (spouses.length > 1) errors.push("Solo puede existir un cónyuge.");
  if (children.length > 8) errors.push("El Excel admite hasta ocho hijos.");
  if (dependants.length > 1) errors.push("Esta versión admite un único familiar a cargo contemplado por la matriz.");
  for (const member of members) {
    if (!Number.isInteger(member.age) || member.age < 0 || member.age > 99) errors.push(`La edad de ${member.role} debe ser un entero entre 0 y 99.`);
    if (member.role === "Hijo/a" && member.age > 49) errors.push("La matriz no contempla hijos mayores de 49 años.");
  }
  if (errors.length) return { group: null, errors: [...new Set(errors)] };

  const titularAge = titulares[0].age;
  const band = titularAge <= 25 ? "0 a 25" : titularAge <= 35 ? "26 a 35" : titularAge <= 40 ? "36 a 40" : titularAge <= 50 ? "41 a 50" : titularAge <= 60 ? "51 a 60" : titularAge <= 65 ? "61 a 65" : "66 o más";
  let group = spouses.length ? "Matrimonio" : "Individual";
  if (children.length) group = spouses.length ? "Matrimonio con hijos" : "Titular con hijos";
  if (dependants.length) group += " + familiar a cargo";
  return { group: `${group} · titular ${band}`, errors: [] };
}
