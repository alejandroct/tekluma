import { useEffect, useMemo, useState, type ReactNode } from "react";
import { contenidoTarjetaSchema, type EditorialStatus, type TipoTarjeta } from "@tekluma/shared";
import { api, type Articulo, type Cita, type Tarjeta, type Yo } from "../api";
import { ESTADOS, PLANTILLAS, TIPOS } from "../etiquetas";
import { IconoCerrar, IconoCheck, IconoCruz, IconoEnviar, IconoMas } from "../iconos";
import { Aviso, EncabezadoPagina } from "../ui";
import { VistaPrevia } from "./VistaPrevia";

type Props = {
  yo: Yo;
  mazoId: string;
  standardId: string;
  tarjeta: Tarjeta | null;
  migas: ReactNode;
  onCambio: () => void;
  onCerrar: () => void;
};

const PASOS: EditorialStatus[] = ["draft", "in_review", "approved", "published"];

/** "opciones.2.texto" → "opciones[2].texto" */
const ruta = (path: readonly PropertyKey[]) =>
  path.reduce<string>((s, p) => (typeof p === "number" ? `${s}[${p}]` : s ? `${s}.${String(p)}` : String(p)), "") || "(raíz)";

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

/** Create/edit a card: JSON content + citations, and the editorial actions allowed for its status. */
export function Editor({ yo, mazoId, standardId, tarjeta, migas, onCambio, onCerrar }: Props) {
  const [json, setJson] = useState(() => JSON.stringify(tarjeta?.content ?? PLANTILLAS.concepto, null, 2));
  const [citas, setCitas] = useState<Cita[]>(tarjeta?.citations ?? []);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  // Reviewers (read-only) land on the preview; authors on the JSON they edit.
  const [modo, setModo] = useState<"vista" | "json">(tarjeta && tarjeta.status === "in_review" ? "vista" : "json");

  useEffect(() => {
    api<Articulo[]>(`/editorial/normas/${standardId}/articulos`).then(setArticulos, () => {});
  }, [standardId]);

  const validacion = useMemo(() => {
    try {
      return contenidoTarjetaSchema.safeParse(JSON.parse(json));
    } catch (e) {
      return { success: false as const, error: { issues: [{ path: [] as PropertyKey[], message: (e as Error).message }] } };
    }
  }, [json]);

  const estado = tarjeta?.status ?? "draft";
  const editable = estado !== "in_review";
  const esAutor = !tarjeta || tarjeta.authorId === yo.id;
  const puedeRevisar = estado === "in_review" && !esAutor && yo.rol !== "author";
  const citasValidas = citas.length > 0 && citas.every((c) => c.articleId && c.excerpt.trim());
  const lineas = json.split("\n").length;

  const editarJson = (v: string) => {
    setJson(v);
    setSucio(true);
  };
  const editarCitas = (v: Cita[]) => {
    setCitas(v);
    setSucio(true);
  };

  const accion = async (fn: () => Promise<unknown>, cerrar = false) => {
    setOcupado(true);
    setError(null);
    try {
      await fn();
      onCambio();
      if (cerrar) onCerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const guardar = () =>
    accion(async () => {
      if (!validacion.success) return;
      const body = { content: validacion.data, citations: citas.map(({ articleId, excerpt }) => ({ articleId, excerpt })) };
      if (tarjeta) await api(`/editorial/tarjetas/${tarjeta.id}`, { method: "PUT", body });
      else await api(`/editorial/mazos/${mazoId}/tarjetas`, { body });
      setSucio(false);
    }, !tarjeta);

  const enviarARevision = () => tarjeta && accion(() => api(`/editorial/tarjetas/${tarjeta.id}/enviar`, { body: {} }));

  const puedeGuardar = !ocupado && validacion.success && citasValidas;
  const textoGuardar = tarjeta ? (estado === "draft" ? "Guardar cambios" : "Guardar como nueva revisión") : "Crear borrador";
  // In a saved draft with no pending edits, the next step is sending it to review.
  const enviarEsPrincipal = !!tarjeta && estado === "draft" && !sucio;
  const pasoActual = PASOS.indexOf(estado);
  const tipo = validacion.success ? validacion.data.tipo : tarjeta?.content.tipo;

  return (
    <>
      <EncabezadoPagina
        rotulo={migas}
        titulo={
          tarjeta ? (
            <>
              Tarjeta <span className="mono titulo-id">{tarjeta.id.slice(0, 8)}</span>
            </>
          ) : (
            "Nueva tarjeta"
          )
        }
        descripcion={tarjeta ? undefined : "Elige una plantilla, completa el contenido y cita al menos un artículo de la norma."}
        acciones={
          <button className="boton secundario" onClick={onCerrar}>
            <IconoCerrar tamano={16} />
            Cerrar
          </button>
        }
      >
        <ol className={`pasos ${estado === "deprecated" ? "retirada" : ""}`} aria-label="Flujo editorial">
          {PASOS.map((p, i) => {
            const clase = i === pasoActual ? "actual" : i < pasoActual ? "hecho" : "";
            return (
              <li key={p} className={`paso ${clase}`} aria-current={i === pasoActual ? "step" : undefined}>
                <span className="paso-n">{i < pasoActual ? <IconoCheck tamano={12} /> : i + 1}</span>
                <span className="paso-txt">{ESTADOS[p]}</span>
              </li>
            );
          })}
        </ol>
        {tarjeta && (
          <dl className="ficha suelta">
            <div>
              <dt>Revisión</dt>
              <dd className="mono">r{tarjeta.revision}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{tipo ? (TIPOS[tipo] ?? tipo) : "—"}</dd>
            </div>
            <div>
              <dt>Autor</dt>
              <dd>{tarjeta.authorName || "—"}</dd>
            </div>
            <div>
              <dt>Actualizada</dt>
              <dd className="mono">{fecha(tarjeta.updatedAt)}</dd>
            </div>
          </dl>
        )}
      </EncabezadoPagina>

      {tarjeta?.lastReview && !tarjeta.lastReview.approved && estado === "draft" && (
        <Aviso tono="error" titulo="Rechazada en la última revisión">
          {tarjeta.lastReview.comment}
        </Aviso>
      )}

      <div className="editor">
        {/* ── Content ── */}
        <section className="panel">
          <div className="panel-cab">
            <h2>
              <span className="rotulo">01</span>Contenido
            </h2>
            <div className="segmentos" role="group" aria-label="Modo de contenido">
              <button className={modo === "vista" ? "activo" : ""} aria-pressed={modo === "vista"} onClick={() => setModo("vista")}>
                Vista previa
              </button>
              <button className={modo === "json" ? "activo" : ""} aria-pressed={modo === "json"} onClick={() => setModo("json")}>
                JSON
              </button>
            </div>
            {editable ? (
              <label className="plantilla">
                <span className="etiqueta">Plantilla</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && editarJson(JSON.stringify(PLANTILLAS[e.target.value as TipoTarjeta], null, 2))}
                >
                  <option value="">Reemplazar con plantilla…</option>
                  {(Object.keys(PLANTILLAS) as TipoTarjeta[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPOS[t]} · {t}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="etiqueta-plana">Solo lectura</span>
            )}
          </div>
          {modo === "vista" ? (
            validacion.success ? (
              <VistaPrevia c={validacion.data} />
            ) : (
              <div className="vista-previa vp-nota">Corrige el JSON para ver la vista previa.</div>
            )
          ) : (
          <div className="codigo">
            <pre className="codigo-lineas" aria-hidden="true">
              {Array.from({ length: lineas }, (_, i) => i + 1).join("\n")}
            </pre>
            <textarea
              className="codigo-texto"
              aria-label="Contenido JSON de la tarjeta"
              value={json}
              readOnly={!editable}
              onChange={(e) => editarJson(e.target.value)}
              spellCheck={false}
              wrap="off"
              style={{ height: `calc(${lineas + 1} * var(--lh) + 24px)` }}
            />
          </div>
          )}
          <div className="validacion">
            {validacion.success ? (
              <div className="validacion-cab ok">
                <IconoCheck tamano={16} />
                Contenido válido
              </div>
            ) : (
              <>
                <div className="validacion-cab mal">
                  <IconoCruz tamano={16} />
                  {validacion.error.issues.length === 1 ? "1 problema" : `${validacion.error.issues.length} problemas`} de validación
                </div>
                <ol className="problemas">
                  {validacion.error.issues.map((i, n) => (
                    <li key={n}>
                      <span className="i">{String(n + 1).padStart(2, "0")}</span>
                      <code>{ruta(i.path)}</code>
                      <span className="msg">{i.message}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </section>

        <div className="editor-lateral">
          {/* ── Workflow ── */}
          <section className="panel">
            <div className="panel-cab">
              <h2>
                <span className="rotulo">02</span>Flujo editorial
              </h2>
            </div>
            <div className="panel-cuerpo">
              <div className="estado-explicacion">
                <p>{explicacion(estado, !!tarjeta, esAutor, puedeRevisar)}</p>
              </div>

              {editable && (
                <ul className="requisitos">
                  <li className={validacion.success ? "si" : "no"}>
                    {validacion.success ? <IconoCheck tamano={14} /> : <IconoCruz tamano={14} />}
                    Contenido válido según el esquema
                  </li>
                  <li className={citasValidas ? "si" : "no"}>
                    {citasValidas ? <IconoCheck tamano={14} /> : <IconoCruz tamano={14} />}
                    Al menos una cita con artículo y extracto
                  </li>
                </ul>
              )}

              {editable && (
                <div className="flujo-acciones">
                  {enviarEsPrincipal ? (
                    <>
                      <button className="boton primario" disabled={ocupado} onClick={enviarARevision}>
                        <IconoEnviar tamano={16} />
                        Enviar a revisión
                      </button>
                      <button className="boton secundario" disabled={!puedeGuardar} onClick={guardar}>
                        {textoGuardar}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="boton primario" disabled={!puedeGuardar} onClick={guardar}>
                        {textoGuardar}
                      </button>
                      {tarjeta && estado === "draft" && (
                        <button className="boton secundario" disabled={ocupado} onClick={enviarARevision}>
                          <IconoEnviar tamano={16} />
                          Enviar a revisión
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {tarjeta && estado === "draft" && sucio && <p className="nota">Hay cambios sin guardar. Guárdalos antes de enviar a revisión.</p>}

              {estado === "in_review" && !puedeRevisar && (
                <Aviso tono="atencion">{esAutor ? "Otra persona del equipo debe revisarla." : "Solo revisores pueden aprobarla."}</Aviso>
              )}

              {puedeRevisar && tarjeta && (
                <>
                  <label className="campo">
                    <span>Comentario de revisión</span>
                    <textarea placeholder="Obligatorio si rechazas" value={comentario} onChange={(e) => setComentario(e.target.value)} />
                  </label>
                  <div className="flujo-acciones">
                    <button
                      className="boton aprobar"
                      disabled={ocupado}
                      onClick={() => accion(() => api(`/editorial/tarjetas/${tarjeta.id}/revisar`, { body: { approved: true, comment: comentario || undefined } }), true)}
                    >
                      <IconoCheck tamano={16} />
                      Aprobar
                    </button>
                    <button
                      className="boton peligro"
                      disabled={ocupado || !comentario.trim()}
                      title={comentario.trim() ? undefined : "Escribe un comentario para rechazar"}
                      onClick={() => accion(() => api(`/editorial/tarjetas/${tarjeta.id}/revisar`, { body: { approved: false, comment: comentario } }), true)}
                    >
                      <IconoCruz tamano={16} />
                      Rechazar
                    </button>
                  </div>
                </>
              )}

              {error && <Aviso tono="error">{error}</Aviso>}
            </div>
          </section>

          {/* ── Citations ── */}
          <section className="panel">
            <div className="panel-cab">
              <h2>
                <span className="rotulo">03</span>Citas normativas
              </h2>
              <span className="mono nota">{citas.length}</span>
            </div>
            {citas.length > 0 && (
              <ol className="citas">
                {citas.map((c, n) => (
                  <li key={n} className="cita">
                    <span className="cita-n">{String(n + 1).padStart(2, "0")}</span>
                    <div className="cita-campos">
                      <select
                        aria-label={`Artículo de la cita ${n + 1}`}
                        value={c.articleId}
                        disabled={!editable}
                        onChange={(e) => editarCitas(citas.map((x, i) => (i === n ? { ...x, articleId: e.target.value } : x)))}
                      >
                        <option value="">Artículo…</option>
                        {articulos.map((a) => (
                          <option key={a.id} value={a.id}>
                            Art. {a.number} {a.heading ? `· ${a.heading}` : ""}
                          </option>
                        ))}
                      </select>
                      <textarea
                        aria-label={`Extracto de la cita ${n + 1}`}
                        placeholder="Extracto literal del artículo"
                        value={c.excerpt}
                        readOnly={!editable}
                        onChange={(e) => editarCitas(citas.map((x, i) => (i === n ? { ...x, excerpt: e.target.value } : x)))}
                      />
                      {editable && (
                        <div className="cita-pie">
                          <button className="enlace peligro-texto" onClick={() => editarCitas(citas.filter((_, i) => i !== n))}>
                            Quitar cita
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {citas.length === 0 && (
              <div className="panel-cuerpo">
                <p className="nota">Sin citas. Toda tarjeta debe apoyarse en al menos un artículo.</p>
              </div>
            )}
            {articulos.length === 0 && (
              <div className="panel-cuerpo">
                <Aviso tono="atencion">Esta norma aún no tiene artículos cargados (sección Normas).</Aviso>
              </div>
            )}
            {editable && (
              <div className="agregar-cita">
                <button className="boton secundario" onClick={() => editarCitas([...citas, { articleId: "", excerpt: "" }])}>
                  <IconoMas tamano={16} />
                  Agregar cita
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function explicacion(estado: EditorialStatus, existe: boolean, esAutor: boolean, puedeRevisar: boolean): string {
  if (!existe) return "La tarjeta se creará como borrador. Luego podrás enviarla a revisión.";
  switch (estado) {
    case "draft":
      return "Borrador. Cuando esté lista, envíala a revisión: otra persona del equipo debe aprobarla.";
    case "in_review":
      return puedeRevisar
        ? "Pendiente de tu revisión. Aprueba o rechaza con un comentario para el autor."
        : esAutor
          ? "En revisión. El contenido queda bloqueado hasta que alguien la apruebe o rechace."
          : "En revisión. El contenido queda bloqueado mientras tanto.";
    case "approved":
      return "Aprobada. Entrará en la próxima versión publicada del mazo. Si la editas, se guarda como nueva revisión en borrador.";
    case "published":
      return "Publicada en la versión vigente del mazo. Si la editas, se guarda como nueva revisión en borrador.";
    case "deprecated":
      return "Retirada. Ya no se incluye en nuevas versiones del mazo.";
  }
}
