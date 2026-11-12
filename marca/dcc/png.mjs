import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
const [, , entrada, salida, ancho, fondo] = process.argv;
const r = new Resvg(readFileSync(entrada, "utf8"), { fitTo: { mode: "width", value: Number(ancho) }, background: fondo || undefined });
writeFileSync(salida, r.render().asPng());
