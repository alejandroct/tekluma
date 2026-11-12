import { API_URL } from "./auth";
import { db } from "./db";

/**
 * Normas digitalizadas para leer y buscar dentro de la app.
 * Se publican como archivos estáticos en la web (`/normas/<slug>/norma.json` y sus páginas e imágenes),
 * se descargan una vez y quedan guardadas para leerlas sin conexión.
 */

export type FiguraNorma = { src: string; pie: string; w: number; h: number };
export type ArticuloNorma = { n: string; e?: string; t: string; p?: number; f?: FiguraNorma[] };
export type CapituloNorma = { n: string; titulo: string; p: number };
/** Fórmula dibujada con MathJax: SVG con su ancho y alto en «ex» (≈ 0,44 del tamaño de letra). */
export type FormulaSvg = { svg: string; w: number; h: number };

export type Norma = {
  version: string;
  codigo: string;
  titulo: string;
  dispositivo: string;
  publicadaEn: string;
  paginas: number;
  capitulos: CapituloNorma[];
  articulos: ArticuloNorma[];
  /** Expresión tal como aparece en el texto → su dibujo. */
  formulas?: Record<string, FormulaSvg>;
  /** Símbolos de la notación (2.1) que se escriben con subíndice dentro del texto: «Vc», «ℓd», «f’c». */
  simbolos?: string[];
};

/** La web vive en el mismo dominio que la API, sin el «api.» (api.dev.tekluma.app → dev.tekluma.app). */
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? (/^https:\/\/api\./.test(API_URL) ? API_URL.replace("://api.", "://") : "https://dev.tekluma.app");

/** «E.060» → «e060». */
export const slugNorma = (codigo: string) => codigo.toLowerCase().replace(/[^a-z0-9]/g, "");

export const urlNorma = (slug: string, archivo: string) => `${WEB_URL}/normas/${slug}/${archivo}`;
export const urlPagina = (slug: string, pagina: number) => urlNorma(slug, `paginas/p${String(pagina).padStart(3, "0")}.jpg`);
/** Enlace para compartir un artículo: abre el lector web en ese punto. */
export const enlaceArticulo = (slug: string, numero: string) => `${WEB_URL}/normas/${slug}/#${numero}`;

db.execSync(`
  create table if not exists normas (
    slug text primary key not null,
    version text not null,
    contenido text not null
  );
`);

const enMemoria = new Map<string, Norma>();

function guardar(slug: string, norma: Norma) {
  db.runSync(
    `insert into normas (slug, version, contenido) values (?, ?, ?)
     on conflict (slug) do update set version = excluded.version, contenido = excluded.contenido`,
    slug,
    norma.version,
    JSON.stringify(norma),
  );
  enMemoria.set(slug, norma);
}

async function descargar(slug: string): Promise<Norma> {
  const r = await fetch(urlNorma(slug, "norma.json"), { cache: "no-store" });
  if (!r.ok) throw new Error(`No se pudo descargar la norma (${r.status})`);
  const norma = (await r.json()) as Norma;
  guardar(slug, norma);
  return norma;
}

/** La norma guardada en el dispositivo, o null si nunca se descargó. */
export function normaLocal(slug: string): Norma | null {
  const lista = enMemoria.get(slug);
  if (lista) return lista;
  const fila = db.getFirstSync<{ contenido: string }>("select contenido from normas where slug = ?", slug);
  if (!fila) return null;
  try {
    const norma = JSON.parse(fila.contenido) as Norma;
    enMemoria.set(slug, norma);
    return norma;
  } catch {
    db.runSync("delete from normas where slug = ?", slug);
    return null;
  }
}

/** Abre la norma: la del dispositivo si existe (y la actualiza en segundo plano), o la descarga. */
export async function abrirNorma(slug: string, alActualizar?: (n: Norma) => void): Promise<Norma> {
  const local = normaLocal(slug);
  if (!local) return descargar(slug);
  fetch(`${WEB_URL}/normas/index.json`, { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ slug: string; version: string }[]>) : []))
    .then((indice) => {
      const remota = indice.find((n) => n.slug === slug);
      if (remota && remota.version !== local.version) return descargar(slug).then((n) => alActualizar?.(n));
    })
    .catch(() => {});
  return local;
}

// ───────── Búsqueda ─────────

/** Minúsculas, sin tildes y con comillas unificadas: «Diámetro» y «diametro» son lo mismo. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[′’´`]/g, "'")
    .replace(/[″”“]/g, '"')
    .toLowerCase();

/** Expresión que encuentra los términos en el texto original aunque lleve tildes. */
export function patronTerminos(terminos: string[]): RegExp | null {
  const variantes: Record<string, string> = { a: "aáàä", e: "eéèë", i: "iíìï", o: "oóòö", u: "uúùü", n: "nñ" };
  const partes = terminos
    .filter((t) => t.length > 1)
    .map((t) =>
      [...t]
        .map((c) => (variantes[c] ? `[${variantes[c]}]` : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .join(""),
    );
  return partes.length ? new RegExp(`(${partes.join("|")})`, "gi") : null;
}

export type Resultado = { indice: number; articulo: ArticuloNorma; fragmento: string };

const indiceTexto = new WeakMap<Norma, string[]>();

/**
 * Busca por número («21.6.4», «7.1») o por palabras («gancho sísmico»): todas las palabras deben
 * aparecer; pesa más que estén en el título del artículo. Devuelve un fragmento alrededor del hallazgo.
 */
export function buscar(norma: Norma, consulta: string, limite = 60): Resultado[] {
  const q = normalizar(consulta.trim());
  if (!q) return [];
  if (/^\d+(\.\d+)*\.?$/.test(q)) {
    const n = q.replace(/\.$/, "");
    return norma.articulos
      .map((articulo, indice) => ({ articulo, indice }))
      .filter(({ articulo }) => articulo.n === n || articulo.n.startsWith(`${n}.`))
      .slice(0, limite)
      .map((r) => ({ ...r, fragmento: fragmento(r.articulo.t, []) }));
  }
  let textos = indiceTexto.get(norma);
  if (!textos) {
    textos = norma.articulos.map((a) => normalizar(`${a.e ?? ""}\n${a.t}`));
    indiceTexto.set(norma, textos);
  }
  const terminos = q.split(/\s+/).filter(Boolean);
  const hallados: (Resultado & { puntos: number })[] = [];
  textos.forEach((texto, indice) => {
    if (!terminos.every((t) => texto.includes(t))) return;
    const articulo = norma.articulos[indice]!;
    const titulo = normalizar(articulo.e ?? "");
    const puntos = terminos.reduce((p, t) => p + (titulo.includes(t) ? 5 : 0) + Math.min(texto.split(t).length - 1, 5), 0);
    hallados.push({ indice, articulo, puntos, fragmento: fragmento(articulo.t, terminos) });
  });
  return hallados
    .sort((a, b) => b.puntos - a.puntos || a.indice - b.indice)
    .slice(0, limite)
    .map(({ puntos: _, ...r }) => r);
}

function fragmento(texto: string, terminos: string[]): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  const normal = normalizar(limpio);
  const pos = terminos.length ? Math.min(...terminos.map((t) => normal.indexOf(t)).filter((i) => i >= 0)) : 0;
  const inicio = Math.max(0, pos - 50);
  return `${inicio > 0 ? "…" : ""}${limpio.slice(inicio, inicio + 170)}${inicio + 170 < limpio.length ? "…" : ""}`;
}

// ───── Formato del texto ─────

export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "formula"; expresion: string; numero?: string; dibujo?: FormulaSvg }
  | { tipo: "definicion"; simbolo: string; dibujo: FormulaSvg; texto: string }
  | { tipo: "tabla"; titulo?: string; filas: string[][] };

/** «Vc = 0,17 √f’c bw d (11-3)»: una línea corta que termina en su número de ecuación. */
const FORMULA = /^(.+?)\s*\((\d{1,2}-\d{1,2}[a-z]?)\)$/;

/**
 * Parte el texto de un artículo en párrafos, fórmulas numeradas y tablas (filas que empiezan con «|»;
 * la primera es el encabezado). Así se transcribieron en contenido/e060/herramientas/limpieza.py.
 */
export function bloquesTexto(texto: string, formulas: Record<string, FormulaSvg> = {}, notacion = false): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrar = () => {
    if (parrafo.length) bloques.push({ tipo: "parrafo", texto: parrafo.join("\n") });
    parrafo = [];
  };
  for (const bruta of texto.split("\n")) {
    const linea = bruta.trim();
    if (linea.startsWith("|")) {
      // «TABLA 12.2 FACTOR DE …» justo antes de las filas es el rótulo de la tabla.
      const titulo = !bloques.length || bloques[bloques.length - 1]?.tipo !== "tabla" ? parrafo.findLastIndex((l) => /^tabla\s+\d/i.test(l)) : -1;
      const rotulo = titulo >= 0 ? parrafo.splice(titulo).join(" ") : undefined;
      cerrar();
      const celdas = linea.slice(1).split("|").map((c) => c.trim());
      const ultimo = bloques[bloques.length - 1];
      if (ultimo?.tipo === "tabla") ultimo.filas.push(celdas);
      else bloques.push({ tipo: "tabla", titulo: rotulo, filas: [celdas] });
      continue;
    }
    // En la notación (2.1), «Vc = resistencia nominal…»: el símbolo dibujado y su definición.
    const definicion = notacion ? /^(\S+(?: \S+)?) = (.+)$/.exec(linea) : null;
    if (definicion && formulas[definicion[1]!]) {
      cerrar();
      bloques.push({ tipo: "definicion", simbolo: definicion[1]!, dibujo: formulas[definicion[1]!]!, texto: definicion[2]! });
      continue;
    }
    const formula = linea.length <= 130 ? FORMULA.exec(linea) : null;
    if (formula && linea !== linea.toUpperCase() && (/[=≤≥<>]/.test(formula[1]!) || formula[1]!.length < 40)) {
      cerrar();
      bloques.push({ tipo: "formula", expresion: formula[1]!, numero: formula[2]!, dibujo: formulas[formula[1]!] });
      continue;
    }
    if (formulas[linea]) {
      cerrar();
      bloques.push({ tipo: "formula", expresion: linea, dibujo: formulas[linea] });
      continue;
    }
    if (linea) parrafo.push(linea);
  }
  cerrar();
  return bloques;
}

/**
 * Parte un párrafo en texto y símbolos de la notación («Vc», «f’c», «ℓd»): cada símbolo con su letra base
 * y su subíndice («f’c» → f’ + c). Los nombres que empiezan con dos mayúsculas (CM, CVi, EI) se dejan tal cual.
 */
export type Trozo = string | { base: string; sub: string };

const patronesSimbolos = new WeakMap<string[], RegExp>();
const LETRAS = "A-Za-zÁÉÍÓÚÑáéíóúñ0-9’′ℓαβγδεθλμξπρσφψωΔΣΨΩ";

export function trozosConSimbolos(original: string, simbolos: string[] | undefined): Trozo[] {
  // Unidades con exponente tal como se ven impresas: mm2 → mm², kg/m3 → kg/m³.
  const texto = original.replace(/\b(mm|m)([234])\b/g, (_, u: string, e: string) => u + "²³⁴"[Number(e) - 2]);
  if (!simbolos?.length) return [texto];
  let patron = patronesSimbolos.get(simbolos);
  if (!patron) {
    const lista = simbolos
      .filter((s) => !/^[A-Z]{2}/.test(s)) // CM, CVi, EI: nombres, no símbolos con subíndice
      .sort((a, b) => b.length - a.length)
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // Sin «lookbehind» ni \\p{L}, por compatibilidad con Hermes: el carácter previo se captura aparte.
    patron = new RegExp(`(^|[^${LETRAS}])(${lista.join("|")})(?![${LETRAS}])`, "g");
    patronesSimbolos.set(simbolos, patron);
  }
  const salida: Trozo[] = [];
  let desde = 0;
  for (const m of texto.matchAll(patron)) {
    const inicio = m.index! + m[1]!.length;
    if (inicio > desde) salida.push(texto.slice(desde, inicio));
    const s = m[2]!;
    const corte = /^[ΣΔφ]?.[’′]?/.exec(s)![0].length;
    salida.push({ base: s.slice(0, corte), sub: s.slice(corte) });
    desde = inicio + s.length;
  }
  if (desde < texto.length) salida.push(texto.slice(desde));
  return salida;
}

/** Un artículo que solo repite su título (p. ej. «7.1 · ALCANCE») se muestra como encabezado de sección. */
export const esEncabezado = (a: ArticuloNorma) => !!a.e && normalizar(a.t.trim()) === normalizar(a.e.trim());
