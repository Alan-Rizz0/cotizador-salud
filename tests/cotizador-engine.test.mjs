import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temp = await mkdtemp(join(tmpdir(), "cotizador-engine-"));
const output = join(temp, "engine.mjs");
await build({ entryPoints: ["lib/cotizador-engine.ts"], outfile: output, bundle: true, platform: "node", format: "esm" });
const { calculateQuote } = await import(pathToFileURL(output));
const plan = (input, name = "Medifé+") => calculateQuote(input).find((x) => x.plan === name);
const close = (actual, expected, tolerance = .001) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("AMBA voluntario individual joven coincide con Resumen LP", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 22 }] });
  close(q.listPrice, 182937.04703721148); close(q.ivaOrContribution, 19208.389938907203); close(q.firstInstallment, 202145.43697611868);
});

test("AMBA obligatorio titular 36-40 usa columna obligatoria", () => {
  const q = plan({ region: "AMBA", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38 }] }, "Bronce");
  close(q.listPrice, 236294.16660201782); close(q.firstInstallment, 236294.16660201782);
});

test("AMBA matrimonio con hijos suma componentes y ajuste habilitado", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", applyChildAdjustment: true, members: [{ id: 1, role: "Titular", age: 40 }, { id: 2, role: "Cónyuge", age: 40 }, { id: 3, role: "Hijo/a", age: 8 }] }, "Bronce");
  close(q.listPrice, 767657.8411610986); close(q.permanentAdjustment, -113948.149899078);
});

test("Norte voluntario usa su lista regional", () => {
  const q = plan({ region: "Norte", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Plata");
  close(q.listPrice, 341261.6988570488); close(q.firstInstallment, 377094.17723703897);
});

test("Norte obligatorio usa su lista regional", () => {
  const q = plan({ region: "Norte", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38 }] }, "Platinum");
  close(q.listPrice, 503624.2533527793);
});

test("Sur voluntario usa su lista regional", () => {
  const q = plan({ region: "Sur", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Medifé+");
  close(q.listPrice, 215124.21097527407); close(q.firstInstallment, 237712.25312767783);
});

test("Patagonia conserva precios con recargo incorporado en la lista", () => {
  const q = plan({ region: "Patagonia", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Bronce");
  close(q.listPrice, 375383.5858176426);
});

test("Bahía Mar del Plata usa lista específica", () => {
  const q = plan({ region: "Bahía / Mar del Plata", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Platinum");
  close(q.listPrice, 575245.3907220833); close(q.firstInstallment, 635646.156747902);
});

test("titular mayor de 65 usa banda 66-00", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 70 }] }, "Plata");
  close(q.listPrice, 940712.8319787496);
});

test("varios hijos usan Hijo 1 y Hijo 2 para planes interiores", () => {
  const q = plan({ region: "Norte", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 40 }, { id: 2, role: "Hijo/a", age: 2 }, { id: 3, role: "Hijo/a", age: 10 }] }, "Bronce");
  close(q.listPrice, 861954.4066563022);
});

test("promoción opción 1 voluntaria afecta cuota 1 pero no cuota 13", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", promotion: "Opción 1", members: [{ id: 1, role: "Titular", age: 38 }] }, "Medifé+");
  close(q.promotionalDiscount, -61096.08675920804); close(q.firstInstallment, 157526.0770274914); close(q.installment13, 225037.2528964163);
});

test("aportes e IVA se calculan por caminos distintos", () => {
  const mandatory = plan({ region: "AMBA", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38, contributionType: "OBRAS SOCIALES", grossSalary: 1000000 }] });
  const voluntary = plan({ region: "AMBA", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] });
  close(mandatory.ivaOrContribution, -71145); close(voluntary.ivaOrContribution, voluntary.listPrice * .105);
});

test("descuento manual de 50% se aplica a la primera cuota", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", gafDiscount: -.50, members: [{ id: 1, role: "Titular", age: 38 }] });
  close(q.promotionalDiscount, q.listPrice * -.50);
  close(q.firstInstallment, q.listPrice * .50 * 1.105);
  close(q.installment13, q.listPrice * 1.105);
});
