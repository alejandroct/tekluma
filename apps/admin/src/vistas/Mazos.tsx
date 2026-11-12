import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EditorialStatus } from "@tekluma/shared";
import { api, type Mazo, type Norma, type Tarjeta, type Yo } from "../api";
import { ESTADOS, TIPOS, resumen } from "../etiquetas";
import { IconoBuscar, IconoCheck, IconoChevron, IconoCruz, IconoEliminar, IconoEnviar, IconoMas, IconoPublicar } from "../iconos";
import { Aviso, confirmar, EncabezadoPagina, Estado, pedir, Vacio } from "../ui";
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
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [mazosElegidos, setMazosElegidos] = useState<Set<string>>(new Set());

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
    setSeleccion(new Set());
  };

  const mazo = mazos.find((m) => m.id === mazoId);
  const q = busqueda.trim().toLowerCase();
  const visibles = (filtro === "todas" ? tarjetas : tarjetas.filter((t) => t.status === filtro)).filter(
    (t) => !q || resumen(t.content).toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
  );
  const aprobadas = mazo?.counts.approved ?? 0;
  // Keep the open card in sync with the reloaded list so status changes show immediately.
  const tarjetaAbierta = abierta && abierta !== "nueva" ? (tarjetas.find((t) => t.id === abierta.id) ?? abierta) : null;

  // Selection only counts cards still in the list; the action buttons act on those in the right state.
  const elegidas = tarjetas.filter((t) => seleccion.has(t.id));
  const deEstado = (estado: EditorialStatus) => elegidas.filter((t) => t.status === estado);
  const todasVisibles = visibles.length > 0 && visibles.every((t) => seleccion.has(t.id));
  const alternar = (id: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alternarVisibles = () =>
    setSeleccion((s) => {
      const n = new Set(s);
      for (const t of visibles) {
        if (todasVisibles) n.delete(t.id);
        else n.add(t.id);
      }
      return n;
    });

  const enLote = async (accion: "enviar" | "aprobar" | "rechazar", ids: string[]) => {
    let comment: string | undefined;
    if (accion === "rechazar") {
      const texto = await pedir({
        titulo: `Rechazar ${ids.length} ${ids.length === 1 ? "tarjeta" : "tarjetas"}`,
        mensaje: "Vuelven a borrador con este comentario para su autor.",
        accion: "Rechazar",
        peligro: true,
        campo: { etiqueta: "Qué corregir", placeholder: "Ej.: revisar la cita del artículo" },
      });
      if (typeof texto !== "string") return;
      comment = texto;
    }
    setOcupado(true);
    try {
      const r = await api<{ procesadas: number; omitidas: { motivo: string }[] }>("/editorial/tarjetas/lote", { body: { ids, accion, comment } });
      const verbo = { enviar: "enviadas a revisión", aprobar: "aprobadas", rechazar: "devueltas a borrador" }[accion];
      const tuyas = r.omitidas.filter((o) => o.motivo === "es tuya").length;
      setMensaje(`${r.procesadas} ${r.procesadas === 1 ? "tarjeta" : "tarjetas"} ${verbo}.${tuyas ? ` ${tuyas} omitidas: no puedes revisar las tuyas.` : ""}`);
      setSeleccion(new Set());
      alCambiar();
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const publicarElegidas = async () => {
    if (!mazo) return;
    const ids = deEstado("approved").map((t) => t.id);
    const ok = await confirmar({
      titulo: `Publicar la versión ${(mazo.version ?? 0) + 1}`,
      mensaje: `Con ${ids.length} ${ids.length === 1 ? "tarjeta aprobada nueva" : "tarjetas aprobadas nuevas"} y las ya publicadas. Las demás aprobadas quedan para una versión posterior.`,
      accion: "Publicar",
    });
    if (!ok) return;
    setOcupado(true);
    try {
      await api(`/editorial/mazos/${mazo.id}/publicar`, { body: { tarjetas: ids } });
      setMensaje(`Versión ${(mazo.version ?? 0) + 1} publicada con ${ids.length} ${ids.length === 1 ? "tarjeta nueva" : "tarjetas nuevas"}.`);
      setSeleccion(new Set());
      alCambiar();
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const publicar = async () => {
    if (!mazo) return;
    const ok = await confirmar({
      titulo: `Publicar la versión ${(mazo.version ?? 0) + 1}`,
      mensaje: `«${mazo.title}» con sus tarjetas aprobadas. Los usuarios la descargarán en la app.`,
      accion: "Publicar",
    });
    if (!ok) return;
    try {
      await api(`/editorial/mazos/${mazo.id}/publicar`, { body: {} });
      setMensaje(`Versión ${(mazo.version ?? 0) + 1} publicada.`);
      setSeleccion(new Set());
      cargarMazos();
      cargarTarjetas();
    } catch (e) {
      setMensaje((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!mazo) return;
    const escrito = await pedir({
      titulo: "Eliminar mazo",
      mensaje: `«${mazo.title}» se elimina con sus ${tarjetas.length} tarjetas y todas sus versiones. Desaparece de la app y no se puede deshacer.`,
      accion: "Eliminar mazo",
      peligro: true,
      campo: { etiqueta: "Para confirmar, escribe", esperado: mazo.slug, mono: true },
    });
    if (typeof escrito !== "string") return;
    try {
      await api(`/editorial/mazos/${mazo.id}`, { method: "DELETE", body: { confirmar: escrito.trim() } });
      elegir(null);
      cargarMazos();
    } catch (e) {
      setMensaje((e as Error).message);
    }
  };

  /* Deck index: act on several decks at once. */
  const elegidosIndice = mazos.filter((m) => mazosElegidos.has(m.id));
  const enRevisionIndice = elegidosIndice.reduce((n, m) => n + (m.counts.in_review ?? 0), 0);
  const conAprobadas = elegidosIndice.filter((m) => (m.counts.approved ?? 0) > 0);
  const todosMazos = mazos.length > 0 && mazos.every((m) => mazosElegidos.has(m.id));
  const alternarMazo = (id: string) =>
    setMazosElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const aprobarMazos = async () => {
    const ok = await confirmar({
      titulo: `Aprobar ${enRevisionIndice} ${enRevisionIndice === 1 ? "tarjeta" : "tarjetas"}`,
      mensaje: `Todas las tarjetas en revisión de ${elegidosIndice.length} ${elegidosIndice.length === 1 ? "mazo" : "mazos"} pasan a aprobadas. Aún no se publican.`,
      accion: "Aprobar",
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await api<{ procesadas: number; omitidas: { motivo: string }[] }>("/editorial/tarjetas/lote", {
        body: { mazos: elegidosIndice.map((m) => m.id), accion: "aprobar" },
      });
      const tuyas = r.omitidas.filter((o) => o.motivo === "es tuya").length;
      setMensaje(`${r.procesadas} ${r.procesadas === 1 ? "tarjeta aprobada" : "tarjetas aprobadas"}.${tuyas ? ` ${tuyas} omitidas: no puedes revisar las tuyas.` : ""}`);
      cargarMazos();
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const publicarMazos = async () => {
    const ok = await confirmar({
      titulo: `Publicar ${conAprobadas.length} ${conAprobadas.length === 1 ? "mazo" : "mazos"}`,
      mensaje: "Cada mazo sale en una versión nueva con todas sus tarjetas aprobadas y las ya publicadas.",
      accion: "Publicar",
    });
    if (!ok) return;
    setOcupado(true);
    const fallos: string[] = [];
    for (const m of conAprobadas) {
      try {
        await api(`/editorial/mazos/${m.id}/publicar`, { body: {} });
      } catch (e) {
        fallos.push(`${m.title}: ${(e as Error).message}`);
      }
    }
    setOcupado(false);
    setMazosElegidos(new Set());
    setMensaje(fallos.length ? fallos.join(" · ") : `Versión nueva publicada en ${conAprobadas.length} ${conAprobadas.length === 1 ? "mazo" : "mazos"}.`);
    cargarMazos();
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
        {mensaje && <Aviso tono={/^(Versión |\d+ tarjeta)/.test(mensaje) ? "ok" : "error"}>{mensaje}</Aviso>}
        <section className="panel">
          {yo.rol !== "author" && elegidosIndice.length > 0 && (
            <div className="barra barra-lote" role="toolbar" aria-label="Acciones con los mazos seleccionados">
              <span className="lote-cuenta">
                {elegidosIndice.length} {elegidosIndice.length === 1 ? "mazo seleccionado" : "mazos seleccionados"}
              </span>
              <button className="boton secundario" disabled={ocupado || enRevisionIndice === 0} onClick={aprobarMazos}>
                <IconoCheck tamano={16} />
                Aprobar las que están en revisión
                <span className="boton-cuenta">{enRevisionIndice}</span>
              </button>
              <button className="boton primario" disabled={ocupado || conAprobadas.length === 0} onClick={publicarMazos}>
                <IconoPublicar tamano={16} />
                Publicar
                <span className="boton-cuenta">{conAprobadas.length}</span>
              </button>
              <button className="boton fantasma" onClick={() => setMazosElegidos(new Set())}>
                Quitar selección
              </button>
            </div>
          )}
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  {yo.rol !== "author" && (
                    <th className="col-check">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los mazos"
                        checked={todosMazos}
                        onChange={() => setMazosElegidos(todosMazos ? new Set() : new Set(mazos.map((m) => m.id)))}
                      />
                    </th>
                  )}
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
                  <tr
                    key={m.id}
                    className={`clic${mazosElegidos.has(m.id) ? " seleccionada" : ""}`}
                    tabIndex={0}
                    onClick={() => elegir(m.id)}
                    onKeyDown={(e) => e.key === "Enter" && elegir(m.id)}
                  >
                    {yo.rol !== "author" && (
                      <td className="col-check" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Seleccionar ${m.title}`} checked={mazosElegidos.has(m.id)} onChange={() => alternarMazo(m.id)} />
                      </td>
                    )}
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
            {yo.rol === "admin" && (
              <button className="boton peligro" onClick={eliminar}>
                <IconoEliminar tamano={16} />
                Eliminar mazo
              </button>
            )}
            <button className="boton primario" onClick={() => setAbierta("nueva")}>
              <IconoMas tamano={16} />
              Nueva tarjeta
            </button>
          </>
        }
      />
      {mensaje && <Aviso tono={/^(Versión |\d+ tarjeta)/.test(mensaje) ? "ok" : "error"}>{mensaje}</Aviso>}
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
        {elegidas.length > 0 && (
          <div className="barra barra-lote" role="toolbar" aria-label="Acciones con las tarjetas seleccionadas">
            <span className="lote-cuenta">
              {elegidas.length} {elegidas.length === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            {deEstado("draft").length > 0 && (
              <button className="boton secundario" disabled={ocupado} onClick={() => enLote("enviar", deEstado("draft").map((t) => t.id))}>
                <IconoEnviar tamano={16} />
                Enviar a revisión
                <span className="boton-cuenta">{deEstado("draft").length}</span>
              </button>
            )}
            {yo.rol !== "author" && deEstado("in_review").length > 0 && (
              <>
                <button className="boton secundario" disabled={ocupado} onClick={() => enLote("aprobar", deEstado("in_review").map((t) => t.id))}>
                  <IconoCheck tamano={16} />
                  Aprobar
                  <span className="boton-cuenta">{deEstado("in_review").length}</span>
                </button>
                <button className="boton secundario" disabled={ocupado} onClick={() => enLote("rechazar", deEstado("in_review").map((t) => t.id))}>
                  <IconoCruz tamano={16} />
                  Rechazar
                  <span className="boton-cuenta">{deEstado("in_review").length}</span>
                </button>
              </>
            )}
            {yo.rol !== "author" && deEstado("approved").length > 0 && (
              <button className="boton primario" disabled={ocupado} onClick={publicarElegidas} title="Publica solo las aprobadas seleccionadas; las ya publicadas se mantienen">
                <IconoPublicar tamano={16} />
                Publicar seleccionadas
                <span className="boton-cuenta">+{deEstado("approved").length}</span>
              </button>
            )}
            <button className="boton fantasma" onClick={() => setSeleccion(new Set())}>
              Quitar selección
            </button>
          </div>
        )}
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th className="col-check">
                  <input type="checkbox" aria-label="Seleccionar todas las tarjetas visibles" checked={todasVisibles} onChange={alternarVisibles} />
                </th>
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
                <tr
                  key={t.id}
                  className={`clic${seleccion.has(t.id) ? " seleccionada" : ""}`}
                  tabIndex={0}
                  onClick={() => setAbierta(t)}
                  onKeyDown={(e) => e.key === "Enter" && setAbierta(t)}
                >
                  <td className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label="Seleccionar tarjeta" checked={seleccion.has(t.id)} onChange={() => alternar(t.id)} />
                  </td>
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
