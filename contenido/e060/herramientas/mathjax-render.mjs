// Lee [{id, tex}] por stdin y devuelve {id: {svg, w, h, v}} (w, h y v en ex) por stdout.
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "local" }),
});
let entrada = "";
for await (const c of process.stdin) entrada += c;
const salida = {};
for (const { id, tex } of JSON.parse(entrada)) {
  const nodo = doc.convert(tex, { display: true });
  let svg = adaptor.innerHTML(nodo);
  if (svg.includes("merror") || svg.includes('data-mjx-error')) { salida[id] = { error: tex }; continue; }
  const w = parseFloat(/width="([\d.]+)ex"/.exec(svg)[1]);
  const h = parseFloat(/height="([\d.]+)ex"/.exec(svg)[1]);
  const v = parseFloat((/vertical-align: (-?[\d.]+)ex/.exec(svg) || [0, 0])[1]);
  svg = svg.replace(/ style="[^"]*"/, "").replace(/ role="img" focusable="false"/, "").replace(/ aria-hidden="true"/g, "");
  // react-native-svg dibuja mal los <svg> anidados (MathJax los usa para estirar raíces y paréntesis):
  // se reemplazan por un grupo trasladado y recortado al mismo rectángulo.
  let k = 0;
  svg = svg.replace(/<svg width="([\d.]+)" height="([\d.]+)" y="(-?[\d.]+)" x="(-?[\d.]+)" viewBox="(-?[\d.]+) (-?[\d.]+) [\d.]+ [\d.]+">([\s\S]*?)<\/svg>/g,
    (_, W, H, Y, X, VX, VY, dentro) => {
      const clip = `${id.length}-${Object.keys(salida).length}-${k++}`.replace(/[^\w-]/g, "");
      return `<g transform="translate(${X},${Y}) translate(${-VX},${-VY})">${dentro}</g>`;
    });
  if (/<svg[^>]*>[\s\S]*<svg/.test(svg)) { salida[id] = { error: "svg anidado: " + tex }; continue; }
  salida[id] = { svg, w, h, v };
}
process.stdout.write(JSON.stringify(salida));
