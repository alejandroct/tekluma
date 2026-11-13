/**
 * Genera una página HTML estática por sección de cada norma (normas/<slug>/<sección>/index.html),
 * el índice de secciones dentro del visor, sitemap.xml y robots.txt. Google lee estas páginas sin
 * ejecutar JavaScript; el visor (normas/<slug>/) sigue siendo la versión interactiva.
 *
 * Correr después de regenerar una norma (contenido/<slug>/herramientas/generar.py):
 *   node apps/web/herramientas/paginas-norma.mjs
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENIDO = join(WEB, "..", "..", "contenido");
const SITIO = "https://tekluma.app";
const PREGUNTAS_POR_SECCION = 3;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const normal = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[′’´`]/g, "'").toLowerCase();
const seccionDe = (n) => n.split(".").slice(0, 2).join(".");
const pagina = (slug, p) => `/normas/${slug}/paginas/p${String(p).padStart(3, "0")}.jpg`;

/** Mismo dibujo que el visor (normas/e060/index.html): párrafos, tablas «| a | b», fórmulas en SVG y símbolos. */
function crearDibujante(norma) {
  const F = norma.formulas || {};
  const LETRAS = "A-Za-zÁÉÍÓÚÑáéíóúñ0-9’′ℓαβγδεθλμξπρσφψωΔΣΨΩ";
  const lista = (norma.simbolos || [])
    .filter((x) => !/^[A-Z]{2}/.test(x))
    .sort((a, b) => b.length - a.length)
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const reSimbolos = lista.length ? new RegExp(`(^|[^${LETRAS}])(${lista.join("|")})(?![${LETRAS}])`, "g") : null;
  const conSimbolos = (texto) => {
    const html = esc(texto).replace(/\b(mm|m)([234])\b/g, (_, u, e) => u + "²³⁴"[e - 2]);
    if (!reSimbolos) return html;
    return html.replace(reSimbolos, (_, antes, s) => {
      const corte = /^[ΣΔφ]?.[’′]?/.exec(s)[0].length;
      return `${antes}<span class="sim">${s.slice(0, corte)}<sub>${s.slice(corte)}</sub></span>`;
    });
  };
  const dibujo = (f) => `<span class="mj">${f.svg}</span>`;

  function cuerpo(texto, notacion) {
    let html = "";
    let parrafo = [];
    let tabla = null;
    const cerrarParrafo = () => {
      if (parrafo.length) html += `<p>${conSimbolos(parrafo.join("\n"))}</p>`;
      parrafo = [];
    };
    const celda = (c, i) => (F[c] ? `<td>${dibujo(F[c])}</td>` : i ? `<td>${conSimbolos(c)}</td>` : `<th>${esc(c)}</th>`);
    const cerrarTabla = () => {
      if (tabla)
        html += `<div class="tabla"><table>${tabla.titulo ? `<caption>${esc(tabla.titulo)}</caption>` : ""}${tabla
          .map((f, i) => `<tr>${f.map((c) => celda(c, i)).join("")}</tr>`)
          .join("")}</table></div>`;
      tabla = null;
    };
    for (const bruta of texto.split("\n")) {
      const l = bruta.trim();
      if (l.startsWith("|")) {
        if (!tabla) {
          const k = parrafo.findLastIndex((x) => /^tabla\s+\d/i.test(x));
          tabla = [];
          if (k >= 0) tabla.titulo = parrafo.splice(k).join(" ");
        }
        cerrarParrafo();
        tabla.push(l.slice(1).split("|").map((c) => c.trim()));
        continue;
      }
      cerrarTabla();
      const d = notacion ? /^(\S+(?: \S+)?) = (.+)$/.exec(l) : null;
      if (d && F[d[1]]) {
        cerrarParrafo();
        html += `<div class="definicion"><span class="def-sim">${dibujo(F[d[1]])}</span><span>${conSimbolos(d[2])}</span></div>`;
        continue;
      }
      const m = l.length <= 130 ? /^(.+?)\s*\((\d{1,2}-\d{1,2}[a-z]?)\)$/.exec(l) : null;
      if (m && l !== l.toUpperCase() && (/[=≤≥<>]/.test(m[1]) || m[1].length < 40)) {
        cerrarParrafo();
        html += `<div class="formula">${F[m[1]] ? dibujo(F[m[1]]) : `<span>${esc(m[1])}</span>`}<span class="eq">(${m[2]})</span></div>`;
      } else if (F[l]) {
        cerrarParrafo();
        html += `<div class="formula">${dibujo(F[l])}</div>`;
      } else if (l) parrafo.push(l);
    }
    cerrarParrafo();
    cerrarTabla();
    return html;
  }
  return { cuerpo, conSimbolos };
}

/** Preguntas de opción múltiple (sin imagen) agrupadas por la sección del primer artículo que citan. */
function preguntasPorSeccion(slug) {
  const dir = join(CONTENIDO, slug);
  const porSeccion = new Map();
  if (!existsSync(dir)) return porSeccion;
  for (const archivo of readdirSync(dir).filter((f) => /^\d\d-.+\.json$/.test(f)).sort()) {
    const datos = JSON.parse(readFileSync(join(dir, archivo), "utf8"));
    for (const mazo of datos.mazos ?? []) {
      if (mazo.acceso !== "free") continue;
      for (const t of mazo.tarjetas) {
        const c = t.contenido;
        const cita = t.citas?.[0];
        if (c.tipo !== "opcion_multiple" || c.imagenUrl || !cita || c.pregunta.length > 220) continue;
        const s = seccionDe(cita.articulo);
        if (!porSeccion.has(s)) porSeccion.set(s, []);
        porSeccion.get(s).push({ ...c, cita });
      }
    }
  }
  return porSeccion;
}

/** Descripción para Google: el primer texto con contenido de la sección, en una línea, hasta ~155 caracteres. */
function descripcion(arts, titulo, codigo) {
  const texto = arts
    .map((a) => a.t)
    .find((t) => t && normal(t.trim()) !== normal(titulo) && t.trim().length > 40);
  const limpio = (texto ?? "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("|"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const corto = limpio.length > 155 ? `${limpio.slice(0, 152).replace(/\s+\S*$/, "")}…` : limpio;
  return corto || `${titulo}: texto oficial del artículo de la Norma ${codigo} del RNE.`;
}

const cabecera = (codigo, slug) => `<header class="cabecera">
      <div class="hoja">
        <a class="marca" href="/" aria-label="Tekluma, inicio">
          <picture><source srcset="/logo-oscuro.svg?v=20261110" media="(prefers-color-scheme: dark)" /><img src="/logo.svg?v=20261110" alt="Tekluma" width="105" height="26" /></picture>
        </a>
        <nav aria-label="Principal">
          <a class="etq ref" href="/normas/${slug}/">Norma · ${esc(codigo)}</a>
          <a href="/">Qué es Tekluma</a>
        </nav>
      </div>
    </header>`;

const pie = (dispositivo) => `<footer class="pie">
      <div class="hoja">
        <div class="cajetin">
          <div class="doble"><span class="etq">Proyecto</span><a class="marca-pie" href="/" aria-label="Tekluma, inicio"><picture><source srcset="/logo-oscuro.svg?v=20261110" media="(prefers-color-scheme: dark)" /><img src="/logo.svg?v=20261110" alt="Tekluma" width="81" height="20" /></picture></a></div>
          <div><span class="etq">Fuente</span><span>${esc(dispositivo)}</span></div>
          <div><span class="etq">Documentos</span><span class="vinculos"><a href="/terminos">Términos</a><a href="/privacidad">Privacidad</a><a href="/empresa">Empresa</a><a href="/reclamaciones">Libro de Reclamaciones</a></span></div>
          <div><span class="etq">Contacto</span><a href="mailto:hola@tekluma.app">hola@tekluma.app</a></div>
          <div><span class="etq">Año</span><span class="mono">© 2026</span></div>
        </div>
      </div>
    </footer>`;

function paginaSeccion({ norma, slug, s, arts, capitulo, anterior, siguiente, hermanas, preguntas, dibujante }) {
  const titulo = arts[0].e ?? arts[0].t;
  const url = `${SITIO}/normas/${slug}/${s}/`;
  const tituloPagina = `${s} ${titulo} · Norma ${norma.codigo} ${norma.titulo} · Tekluma`;
  const desc = descripcion(arts, titulo, norma.codigo);
  const paginas = [...new Set(arts.map((a) => a.p).filter(Boolean))];
  const rangoPaginas = paginas.length > 1 ? `págs. ${Math.min(...paginas)}–${Math.max(...paginas)}` : `pág. ${paginas[0]}`;

  let cuerpo = "";
  for (const a of arts) {
    const esTitulo = a.e && normal(a.t.trim()) === normal(a.e.trim());
    if (a.n === s && esTitulo) continue; // el título de la sección ya es el h1
    cuerpo += `<article class="art${esTitulo ? " seccion" : ""}" id="${esc(a.n)}">`;
    cuerpo += `<a class="num" href="#${esc(a.n)}">${esc(a.n)}</a>${a.e && a.n !== s ? `<span class="epi">${esc(a.e)}</span>` : ""}`;
    if (!esTitulo) cuerpo += dibujante.cuerpo(a.t, a.n === "2.1");
    for (const f of a.f || [])
      cuerpo += `<figure class="figura"><img loading="lazy" src="/normas/${slug}/${f.src}" width="${f.w}" height="${f.h}" alt="${esc(f.pie)}" /><figcaption>${esc(f.pie)}</figcaption></figure>`;
    if (!esTitulo && a.p)
      cuerpo += `<div class="acciones"><a class="chip" href="${pagina(slug, a.p)}" target="_blank" rel="noopener">PÁG. ${a.p} · ORIGINAL</a><a class="chip" href="/normas/${slug}/#${esc(a.n)}">VER EN LA NORMA COMPLETA</a></div>`;
    cuerpo += "</article>";
  }

  const letras = "ABCDEFGH";
  const prueba = preguntas.length
    ? `<h2>Ponte a prueba</h2>
        ${preguntas
          .map(
            (p) => `<div class="prueba">
          <p>${dibujante.conSimbolos(p.pregunta)}</p>
          <ol type="A">${p.opciones.map((o) => `<li>${dibujante.conSimbolos(o)}</li>`).join("")}</ol>
          <details>
            <summary>VER RESPUESTA</summary>
            <p class="resp"><strong>${letras[p.correcta]}) ${dibujante.conSimbolos(p.opciones[p.correcta])}</strong> · <a href="#${esc(p.cita.articulo)}">Art. ${esc(p.cita.articulo)}</a></p>
            <p class="cita">${dibujante.conSimbolos(p.cita.extracto)}</p>
          </details>
        </div>`,
          )
          .join("\n        ")}`
    : "";

  const migas = [
    { nombre: "Tekluma", url: `${SITIO}/` },
    { nombre: `Norma ${norma.codigo}`, url: `${SITIO}/normas/${slug}/` },
    { nombre: `Cap. ${capitulo.n} ${capitulo.titulo}`, url: `${SITIO}/normas/${slug}/#cap-${capitulo.n}` },
    { nombre: `${s} ${titulo}`, url },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: migas.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.nombre, item: m.url })),
      },
      {
        "@type": "WebPage",
        name: `${s} ${titulo}`,
        description: desc,
        url,
        inLanguage: "es-PE",
        isPartOf: { "@type": "WebSite", name: "Tekluma", url: `${SITIO}/` },
        about: { "@type": "Legislation", name: `Norma ${norma.codigo} ${norma.titulo}`, legislationIdentifier: norma.dispositivo, legislationDate: norma.publicadaEn },
      },
    ],
  };

  const vecina = (x, clase, rotulo) =>
    x ? `<a class="${clase}" href="/normas/${slug}/${x.s}/"><span>${rotulo}</span>${esc(x.s)} ${esc(x.titulo)}</a>` : "";

  return `<!doctype html>
<html lang="es-PE">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(tituloPagina)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${esc(`${s} ${titulo} · Norma ${norma.codigo}`)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="es_PE" />
    <meta name="theme-color" content="#F6F5F2" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0F1B2D" media="(prefers-color-scheme: dark)" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20261110" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@500;600;700;800&display=swap" />
    <link rel="stylesheet" href="/estilos.css?v=20261114" />
    <link rel="stylesheet" href="/normas/norma.css?v=20261113" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  </head>
  <body>
    ${cabecera(norma.codigo, slug)}

    <main class="hoja seccion-norma">
      <nav class="migas" aria-label="Ruta">
        <a href="/normas/${slug}/">NORMA ${esc(norma.codigo)}</a><span>›</span>
        <a href="/normas/${slug}/#cap-${capitulo.n}">CAP. ${capitulo.n} · ${esc(capitulo.titulo.toUpperCase())}</a>
      </nav>
      <h1><span class="n">${esc(s)}</span>${esc(titulo)}</h1>
      <p class="ficha">Norma ${esc(norma.codigo)} ${esc(norma.titulo)} del Reglamento Nacional de Edificaciones · ${esc(norma.dispositivo)} · ${rangoPaginas}</p>

      ${cuerpo}

      ${prueba}

      <div class="cta-app"><p><strong>Domina la ${esc(norma.codigo)} en diez minutos al día.</strong> En la app Tekluma tienes ${preguntas.length ? "estas preguntas y cientos más" : "cientos de preguntas"} en tarjetas, cada una con la cita exacta del artículo, la pregunta del día y duelos con colegas.</p><a class="btn btn-acento" href="/">Conocer Tekluma</a></div>

      <nav class="vecinas" aria-label="Secciones vecinas">
        ${vecina(anterior, "ant", "‹ ANTERIOR")}
        ${vecina(siguiente, "sig", "SIGUIENTE ›")}
      </nav>

      <h2>Capítulo ${capitulo.n} · ${esc(capitulo.titulo)}</h2>
      <ul class="lista-secciones">
        ${hermanas.map((x) => `<li${x.s === s ? ' class="actual"' : ""}><a href="/normas/${slug}/${x.s}/"><span class="n">${esc(x.s)}</span>${esc(x.titulo)}</a></li>`).join("\n        ")}
      </ul>
    </main>

    ${pie(norma.dispositivo)}
  </body>
</html>
`;
}

/** Índice estático de secciones en el visor, entre marcadores, para que Google encuentre todas las páginas. */
function indiceEnVisor(slug, secciones, capitulos) {
  const archivo = join(WEB, "normas", slug, "index.html");
  const html = readFileSync(archivo, "utf8");
  const INICIO = "<!-- indice-secciones:inicio -->";
  const FIN = "<!-- indice-secciones:fin -->";
  const bloque = `${INICIO}
    <section class="hoja indice-secciones" aria-label="Índice por secciones">
      <details>
        <summary>Índice por secciones (${secciones.length})</summary>
        ${capitulos
          .map((c) => {
            const propias = secciones.filter((x) => x.s.split(".")[0] === c.n);
            if (!propias.length) return "";
            return `<h3><span>${esc(c.n.padStart(2, "0"))}</span>${esc(c.titulo)}</h3>
        <ul class="lista-secciones">${propias.map((x) => `<li><a href="/normas/${slug}/${x.s}/"><span class="n">${esc(x.s)}</span>${esc(x.titulo)}</a></li>`).join("")}</ul>`;
          })
          .join("\n        ")}
      </details>
    </section>
    ${FIN}`;
  const nuevo = html.includes(INICIO)
    ? html.replace(new RegExp(`${INICIO}[\\s\\S]*?${FIN}`), bloque)
    : html.replace('    <dialog id="visor"', `    ${bloque}\n\n    <dialog id="visor"`);
  if (nuevo === html && !html.includes(INICIO)) throw new Error(`No encontré dónde poner el índice en ${archivo}`);
  writeFileSync(archivo, nuevo);
}

const urls = ["/", "/diaria", "/empresa", "/terminos", "/privacidad", "/reclamaciones"].map((u) => `${SITIO}${u}`);
for (const { slug } of JSON.parse(readFileSync(join(WEB, "normas", "index.json"), "utf8"))) {
  const norma = JSON.parse(readFileSync(join(WEB, "normas", slug, "norma.json"), "utf8"));
  const dibujante = crearDibujante(norma);
  const preguntas = preguntasPorSeccion(slug);

  const grupos = new Map();
  for (const a of norma.articulos) {
    const s = seccionDe(a.n);
    if (!grupos.has(s)) grupos.set(s, []);
    grupos.get(s).push(a);
  }
  const secciones = [...grupos].map(([s, arts]) => ({ s, arts, titulo: arts[0].e ?? arts[0].t }));

  // Borra solo las carpetas de secciones (nombres numéricos) generadas antes, por si cambió la norma.
  for (const d of readdirSync(join(WEB, "normas", slug), { withFileTypes: true }))
    if (d.isDirectory() && /^\d+(\.\d+)*$/.test(d.name)) rmSync(join(WEB, "normas", slug, d.name), { recursive: true });

  const capitulos = new Map(norma.capitulos.map((c) => [c.n, c]));
  secciones.forEach((x, i) => {
    const capitulo = capitulos.get(x.s.split(".")[0]);
    const hermanas = secciones.filter((y) => y.s.split(".")[0] === capitulo.n);
    const html = paginaSeccion({
      norma,
      slug,
      s: x.s,
      arts: x.arts,
      capitulo,
      anterior: secciones[i - 1],
      siguiente: secciones[i + 1],
      hermanas,
      preguntas: (preguntas.get(x.s) ?? []).slice(0, PREGUNTAS_POR_SECCION),
      dibujante,
    });
    mkdirSync(join(WEB, "normas", slug, x.s), { recursive: true });
    writeFileSync(join(WEB, "normas", slug, x.s, "index.html"), html);
  });
  indiceEnVisor(slug, secciones, norma.capitulos);
  urls.push(`${SITIO}/normas/${slug}/`, ...secciones.map((x) => `${SITIO}/normas/${slug}/${x.s}/`));
  console.log(`${norma.codigo}: ${secciones.length} páginas de sección`);
}

writeFileSync(
  join(WEB, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`,
);
writeFileSync(join(WEB, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`);
console.log(`sitemap.xml: ${urls.length} direcciones`);
