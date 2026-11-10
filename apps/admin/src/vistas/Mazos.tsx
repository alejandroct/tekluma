import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EditorialStatus } from "@tekluma/shared";
import { api, type Mazo, type Norma, type Tarjeta, type Yo } from "../api";
import { ESTADOS, TIPOS, resumen } from "../etiquetas";
import { IconoBuscar, IconoChevron, IconoMas, IconoPublicar } from "../iconos";
import { Aviso, EncabezadoPagina, Estado, Vacio } from "../ui";
import { Editor } from "./Editor";

const FILTROS = ["todas", "draft", "in_review", "approved", "published"] as const;
const COLUMNAS_ESTADO: { estado: EditorialStatus; corto: string }[] = [
  { estado: "draft", corto: "Borr." },
  { estado: "in_review", corto: "Rev." },
  { estado: "approved", corto: "Aprob." },
  { estado: "published", corto: "Publ." },
];

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "2-digit" });
};

export function Mazos({ yo }: { yo: Yo }) {
  const [mazos, setMazos] = useState<Mazo[]>([]);
  const [mazoId, setMazoId] = useState<string | null>(null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [filtro, setFiltro] = useState<EditorialStatus | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<Tarjeta | "nueva" | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargarMazos = useCallback(() => api<Mazo[]>("/editorial/mazos").then(setMazos), []);
  const cargarTarjetas = useCallback(() => {
    if (mazoId) api<Tarjeta[]>(`/editorial/mazos/${mazoId}/tarjetas`).then(setTarjetas);
  }, [mazoId]);

  useEffect(() => void cargarMazos(), [cargarMazos]);
  useEffect(cargarTarjetas, [cargarTarjetas]);

  const elegir = (id: string | null) => {
    setMazoId(id);
    setTarjetas([]);
    setAbierta(null);
    setMensaje(null);
    setBusqueda("");
  };

  const mazo = mazos.find((m) => m.id === mazoId);
  const q = busqueda.trim().toLowerCase();
  const visibles = (filtro === "todas" ? tarjetas : tarjetas.filter((t) => t.status === filtro)).filter(
    (t) => !q || resumen(t.content).toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
  );
  const aprobadas = mazo?.counts.approved ?? 0;
  // Keep the open card in sync with the reloaded list so status changes show immediately.
  const tarjetaAbierta = abierta && abierta !== "nueva" ? (tarjetas.find((t) => t.id === abierta.id) ?? abierta) : null;

  const publicar = async () => {
    if (!mazo || !confirm(`¿Publicar la versión ${(mazo.version ?? 0) + 1} de "${mazo.title}"? Los usuarios la descargarán.`)) return;
    try {
      await api(`/editorial/mazos/${mazo.id}/publicar`, { body: {} });
      setMensaje(`Versión ${(mazo.version ?? 0) + 1} publicada.`);
      cargarMazos();
      cargarTarjetas();
    } catch (e) {
      setMensaje((e as Error).message);
    }
  };

  const alCambiar = () => {
    cargarMazos();
    cargarTarjetas();
  };

  /* ── Deck index ── */
  if (!mazo)
    return (
      <>
        <EncabezadoPagina
          rotulo={
            <>
              <span className="n">01</span> Contenido
            </>
          }
          titulo="Mazos"
          descripcion="Colecciones de tarjetas por norma. Cada versión publicada se descarga en la app."
          acciones={
            yo.rol === "admin" &&
            !creando && (
              <button className="boton primario" onClick={() => setCreando(true)}>
                <IconoMas tamano={16} />
                Nuevo mazo
              </button>
            )
          }
        />
        {yo.rol === "admin" && creando && <NuevoMazo onListo={() => (setCreando(false), cargarMazos())} onCancelar={() => setCreando(false)} />}
        <section className="panel">
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th className="col-codigo">Norma</th>
                  <th>Mazo</th>
                  <th>Acceso</th>
                  <th className="num">Versión</th>
                  {COLUMNAS_ESTADO.map((c) => (
                    <th key={c.estado} className="num" title={ESTADOS[c.estado]}>
                      {c.corto}
                    </th>
                  ))}
                  <th aria-label="Abrir" />
                </tr>
              </thead>
              <tbody>
                {mazos.map((m) => (
                  <tr key={m.id} className="clic" tabIndex={0} onClick={() => elegir(m.id)} onKeyDown={(e) => e.key === "Enter" && elegir(m.id)}>
                    <td className="codigo-norma">{m.standardCode}</td>
                    <td>
                      <span className="celda-titulo">{m.title}</span>
                      <span className="sub mono">{m.slug}</span>
                    </td>
                    <td>
                      <span className={`etiqueta-plana ${m.access === "premium" ? "premium" : "gratis"}`}>{m.access === "premium" ? "Premium" : "Gratis"}</span>
                    </td>
                    <td className={`num ${m.version ? "" : "cero"}`}>{m.version ? `v${m.version}` : "sin publicar"}</td>
                    {COLUMNAS_ESTADO.map((c) => {
                      const n = m.counts[c.estado] ?? 0;
                      return (
                        <td key={c.estado} className={`num ${n === 0 ? "cero" : c.estado === "in_review" ? "destacado" : ""}`}>
                          {n}
                        </td>
                      );
                    })}
                    <td className="chevron-celda">
                      <IconoChevron tamano={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mazos.length === 0 && <Vacio>Aún no hay mazos.</Vacio>}
        </section>
      </>
    );

  const migas = (
    <nav className="migas" aria-label="Ruta">
      <button onClick={() => elegir(null)}>Mazos</button>
      <IconoChevron tamano={12} />
      {abierta ? (
        <>
          <button onClick={() => setAbierta(null)}>{mazo.title}</button>
          <IconoChevron tamano={12} />
          <span className="actual">{abierta === "nueva" ? "Nueva tarjeta" : "Tarjeta"}</span>
        </>
      ) : (
        <span className="actual">{mazo.standardCode}</span>
      )}
    </nav>
  );

  /* ── Card editor ── */
  if (abierta)
    return (
      <Editor
        key={abierta === "nueva" ? "nueva" : abierta.id}
        yo={yo}
        mazoId={mazo.id}
        standardId={mazo.standardId}
        tarjeta={tarjetaAbierta}
        migas={migas}
        onCambio={alCambiar}
        onCerrar={() => setAbierta(null)}
      />
    );

  /* ── Deck detail ── */
  return (
    <>
      <EncabezadoPagina
        rotulo={migas}
        titulo={mazo.title}
        descripcion={
          <>
            <span className="mono">{mazo.standardCode}</span> · {mazo.access === "premium" ? "Premium" : "Gratis"} ·{" "}
            {mazo.version ? (
              <>
                versión publicada <span className="mono">v{mazo.version}</span>
              </>
            ) : (
              "sin publicar"
            )}
          </>
        }
        acciones={
          <>
            {yo.rol !== "author" && (
              <button className="boton secundario" disabled={aprobadas === 0} onClick={publicar} title="Incluye las aprobadas y las ya publicadas">
                <IconoPublicar tamano={16} />
                Publicar v{(mazo.version ?? 0) + 1}
                <span className="boton-cuenta">+{aprobadas}</span>
              </button>
            )}
            <button className="boton primario" onClick={() => setAbierta("nueva")}>
              <IconoMas tamano={16} />
              Nueva tarjeta
            </button>
          </>
        }
      />
      {mensaje && <Aviso tono={mensaje.startsWith("Versión ") ? "ok" : "error"}>{mensaje}</Aviso>}
      <section className="panel">
        <div className="barra">
          <div className="segmentos" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f} className={filtro === f ? "activo" : ""} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                {f === "todas" ? "Todas" : ESTADOS[f]}
                <span className="cuenta">{f === "todas" ? tarjetas.length : (mazo.counts[f] ?? 0)}</span>
              </button>
            ))}
          </div>
          <label className="buscador">
            <IconoBuscar tamano={16} />
            <input type="search" placeholder="Buscar en tarjetas" aria-label="Buscar en tarjetas" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
        </div>
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th className="col-codigo opcional">ID</th>
                <th>Tarjeta</th>
                <th>Tipo</th>
                <th className="num opcional">Rev.</th>
                <th>Autor</th>
                <th className="num opcional">Actualizada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((t) => (
                <tr key={t.id} className="clic" tabIndex={0} onClick={() => setAbierta(t)} onKeyDown={(e) => e.key === "Enter" && setAbierta(t)}>
                  <td className="mono secundario-celda opcional">{t.id.slice(0, 8)}</td>
                  <td>
                    <span className="recorte">{resumen(t.content) || <span className="nota">(sin texto)</span>}</span>
                  </td>
                  <td className="secundario-celda nowrap">
                    {TIPOS[t.content.tipo] ?? t.content.tipo}
                  </td>
                  <td className="num opcional">{t.revision}</td>
                  <td className="secundario-celda nowrap">
                    {t.authorName || "—"}
                  </td>
                  <td className="num secundario-celda nowrap opcional">
                    {fecha(t.updatedAt)}
                  </td>
                  <td>
                    <Estado estado={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <Vacio>{q ? "Ninguna tarjeta coincide con la búsqueda." : "No hay tarjetas en este estado."}</Vacio>}
      </section>
    </>
  );
}

function NuevoMazo({ onListo, onCancelar }: { onListo: () => void; onCancelar: () => void }) {
  const [normas, setNormas] = useState<Norma[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void api<Norma[]>("/editorial/normas").then(setNormas), []);

  const crear = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/editorial/mazos", { body: Object.fromEntries(f) });
      onListo();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className="panel" onSubmit={crear}>
      <div className="panel-cab">
        <h2>Nuevo mazo</h2>
      </div>
      <div className="panel-cuerpo formulario">
        <label className="campo">
          <span>Título</span>
          <input name="title" placeholder="Diseño sismorresistente" required />
        </label>
        <label className="campo">
          <span>Slug</span>
          <input name="slug" className="mono-input" placeholder="slug-del-mazo" required pattern="[a-z0-9-]+" />
        </label>
        <label className="campo">
          <span>Norma</span>
          <select name="standardId" required>
            {normas.map((n) => (
              <option key={n.id} value={n.id}>
                {n.code} · {n.title}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Acceso</span>
          <select name="access">
            <option value="free">Gratis</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label className="campo ancho">
          <span>Descripción</span>
          <textarea name="description" placeholder="Qué cubre este mazo" />
        </label>
      </div>
      <div className="panel-pie">
        {error ? <span className="error-texto espacio">{error}</span> : <span className="nota espacio">El slug solo admite minúsculas, números y guiones.</span>}
        <button type="button" className="boton fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="boton primario">Crear mazo</button>
      </div>
    </form>
  );
}
