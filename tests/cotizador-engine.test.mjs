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
  close(q.listPrice, 178824.0929005); close(q.ivaOrContribution, 18776.5297545525); close(q.firstInstallment, 197600.6226550525);
});

test("AMBA obligatorio titular 36-40 usa columna obligatoria", () => {
  const q = plan({ region: "AMBA", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38 }] }, "Bronce");
  close(q.listPrice, 230981.590031298); close(q.firstInstallment, 230981.590031298);
});

test("AMBA matrimonio con hijos suma componentes y ajuste habilitado", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", applyChildAdjustment: true, members: [{ id: 1, role: "Titular", age: 40 }, { id: 2, role: "Cónyuge", age: 40 }, { id: 3, role: "Hijo/a", age: 8 }] }, "Bronce");
  close(q.listPrice, 750398.6717117289); close(q.permanentAdjustment, -111386.265786);
});

test("Norte voluntario usa su lista regional", () => {
  const q = plan({ region: "Norte", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Plata");
  close(q.listPrice, 333589.148442863); close(q.firstInstallment, 368616.00902936363);
});

test("Norte obligatorio usa su lista regional", () => {
  const q = plan({ region: "Norte", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38 }] }, "Platinum");
  close(q.listPrice, 492301.322925493);
});

test("Sur voluntario usa su lista regional", () => {
  const q = plan({ region: "Sur", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Medifé+");
  close(q.listPrice, 210287.596261265); close(q.firstInstallment, 232367.7938686978);
});

test("Patagonia conserva precios con recargo incorporado en la lista", () => {
  const q = plan({ region: "Patagonia", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Bronce");
  close(q.listPrice, 366943.8766545871);
});

test("Bahía Mar del Plata usa lista específica", () => {
  const q = plan({ region: "Bahía / Mar del Plata", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] }, "Platinum");
  close(q.listPrice, 562312.2098945096); close(q.firstInstallment, 621354.9919334331);
});

test("titular mayor de 65 usa banda 66-00", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 70 }] }, "Plata");
  close(q.listPrice, 919562.885609726);
});

test("varios hijos usan Hijo 1 y Hijo 2 para planes interiores", () => {
  const q = plan({ region: "Norte", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 40 }, { id: 2, role: "Hijo/a", age: 2 }, { id: 3, role: "Hijo/a", age: 10 }] }, "Bronce");
  close(q.listPrice, 842575.177572143);
});

test("promoción opción 1 voluntaria afecta cuota 1 pero no cuota 13", () => {
  const q = plan({ region: "AMBA", category: "Voluntario", promotion: "Opción 1", members: [{ id: 1, role: "Titular", age: 38 }] }, "Medifé+");
  close(q.promotionalDiscount, -59722.469950349994); close(q.firstInstallment, 153984.43502198573); close(q.installment13, 219977.7643171225);
});

test("aportes e IVA se calculan por caminos distintos", () => {
  const mandatory = plan({ region: "AMBA", category: "Obligatorio", members: [{ id: 1, role: "Titular", age: 38, contributionType: "OBRAS SOCIALES", grossSalary: 1000000 }] });
  const voluntary = plan({ region: "AMBA", category: "Voluntario", members: [{ id: 1, role: "Titular", age: 38 }] });
  close(mandatory.ivaOrContribution, -71145); close(voluntary.ivaOrContribution, voluntary.listPrice * .105);
});
