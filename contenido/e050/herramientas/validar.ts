/**
 * Valida los archivos de contenido/e050 contra el esquema de importación del panel.
 * Uso (desde la raíz del repo): node_modules/.bin/tsx contenido/e050/herramientas/validar.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { importacionSchema } from "../../../packages/shared/src/importacion";

const carpeta = join(import.meta.dirname, "..");
let errores = 0;
for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith(".json")).sort()) {
  const datos = JSON.parse(readFileSync(join(carpeta, archivo), "utf8"));
  const r = importacionSchema.safeParse(datos);
  if (!r.success) {
    errores++;
    console.log(`✗ ${archivo}`);
    for (const e of r.error.issues.slice(0, 10)) console.log(`   ${e.path.join(".")}: ${e.message}`);
    continue;
  }
  const tarjetas = r.data.mazos.flatMap((m) => m.tarjetas);
  const numeros = new Set(r.data.articulos.map((a) => a.numero));
  const sinArticulo = tarjetas.flatMap((t) => t.citas).filter((c) => !numeros.has(c.articulo));
  // La opción correcta debe existir y la celda pedida de cada tabla también.
  const malas = tarjetas.filter((t) => {
    const c = t.contenido;
    if (c.tipo === "opcion_multiple") return c.correcta >= c.opciones.length;
    if (c.tipo === "tabla") return !c.filas[c.pregunta.fila]?.valores[c.pregunta.columna];
    return false;
  });
  if (sinArticulo.length || malas.length) errores++;
  console.log(`${sinArticulo.length || malas.length ? "✗" : "✓"} ${archivo}: ${r.data.articulos.length} artículos, ${tarjetas.length} tarjetas` +
    (sinArticulo.length ? `, ${sinArticulo.length} citas a artículos que no están en el archivo` : "") +
    (malas.length ? `, ${malas.length} tarjetas con la respuesta fuera de rango` : ""));
}
process.exit(errores ? 1 : 0);
