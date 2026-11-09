import { useEffect, useMemo, useState } from "react";
import { contenidoTarjetaSchema, type TipoTarjeta } from "@tekluma/shared";
import { api, type Articulo, type Cita, type Tarjeta, type Yo } from "../api";
import { ESTADOS, PLANTILLAS } from "../etiquetas";

type Props = { yo: Yo; mazoId: string; standardId: string; tarjeta: Tarjeta | null; onCambio: () => void; onCerrar: () => void };

/** Create/edit a card: JSON content + citations, and the editorial actions allowed for its status. */
export function Editor({ yo, mazoId, standardId, tarjeta, onCambio, onCerrar }: Props) {
  const [json, setJson] = useState(() => JSON.stringify(tarjeta?.content ?? PLANTILLAS.concepto, null, 2));
  const [citas, setCitas] = useState<Cita[]>(tarjeta?.citations ?? []);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Articulo[]>(`/editorial/normas/${standardId}/articulos`).then(setArticulos, () => {});
  }, [standardId]);

  const validacion = useMemo(() => {
    try {
      return contenidoTarjetaSchema.safeParse(JSON.parse(json));
    } catch (e) {
      return { success: false as const, error: { issues: [{ path: [], message: (e as Error).message }] } };
    }
  }, [json]);

  const estado = tarjeta?.status ?? "draft";
  const editable = estado !== "in_review";
  const esAutor = !tarjeta || tarjeta.authorId === yo.id;
  const puedeRevisar = estado === "in_review" && !esAutor && yo.rol !== "author";
  const citasValidas = citas.length > 0 && citas.every((c) => c.articleId && c.excerpt.trim());

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
    }, !tarjeta);

  return (
    <div className="editor">
      <div className="columna">
        <div className="fila-titulo">
          <h2>{tarjeta ? `Tarjeta · rev. ${tarjeta.revision}` : "Nueva tarjeta"}</h2>
          {tarjeta && <span className={`estado ${estado}`}>{ESTADOS[estado]}</span>}
          <button className="enlace" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        {tarjeta?.lastReview && !tarjeta.lastReview.approved && estado === "draft" && (
          <p className="aviso">Rechazada: {tarjeta.lastReview.comment}</p>
        )}
        {editable && (
          <label>
            Plantilla
            <select
              value=""
              onChange={(e) => e.target.value && setJson(JSON.stringify(PLANTILLAS[e.target.value as TipoTarjeta], null, 2))}
            >
              <option value="">Reemplazar con plantilla…</option>
              {Object.keys(PLANTILLAS).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        )}
        <textarea value={json} readOnly={!editable} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
        {validacion.success ? (
          <p className="ok">✓ Contenido válido</p>
        ) : (
          <ul className="errores">
            {validacion.error.issues.map((i, n) => (
              <li key={n}>
                <code>{i.path.join(".") || "(raíz)"}</code> {i.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="columna">
        <h2>Citas normativas</h2>
        {citas.map((c, n) => (
          <div key={n} className="cita">
            <select
              value={c.articleId}
              disabled={!editable}
              onChange={(e) => setCitas(citas.map((x, i) => (i === n ? { ...x, articleId: e.target.value } : x)))}
            >
              <option value="">Artículo…</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  Art. {a.number} {a.heading ? `· ${a.heading}` : ""}
                </option>
              ))}
            </select>
            <textarea
              className="corto"
              placeholder="Extracto literal del artículo"
              value={c.excerpt}
              readOnly={!editable}
              onChange={(e) => setCitas(citas.map((x, i) => (i === n ? { ...x, excerpt: e.target.value } : x)))}
            />
            {editable && (
              <button className="enlace" onClick={() => setCitas(citas.filter((_, i) => i !== n))}>
                Quitar
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button className="secundario" onClick={() => setCitas([...citas, { articleId: "", excerpt: "" }])}>
            + Agregar cita
          </button>
        )}
        {articulos.length === 0 && <p className="nota">Esta norma aún no tiene artículos cargados (pestaña Normas).</p>}

        {error && <p className="error">{error}</p>}
        <div className="acciones">
          {editable && (
            <button className="primario" disabled={ocupado || !validacion.success || !citasValidas} onClick={guardar}>
              {tarjeta ? (estado === "draft" ? "Guardar" : "Guardar como nueva revisión") : "Crear borrador"}
            </button>
          )}
          {tarjeta && estado === "draft" && (
            <button className="secundario" disabled={ocupado} onClick={() => accion(() => api(`/editorial/tarjetas/${tarjeta.id}/enviar`, { body: {} }))}>
              Enviar a revisión
            </button>
          )}
        </div>
        {estado === "in_review" && !puedeRevisar && (
          <p className="nota">{esAutor ? "Otra persona del equipo debe revisarla." : "Solo revisores pueden aprobarla."}</p>
        )}
        {puedeRevisar && tarjeta && (
          <div className="revision">
            <textarea className="corto" placeholder="Comentario (obligatorio si rechazas)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
            <div className="acciones">
              <button
                className="primario"
                disabled={ocupado}
                onClick={() => accion(() => api(`/editorial/tarjetas/${tarjeta.id}/revisar`, { body: { approved: true, comment: comentario || undefined } }), true)}
              >
                Aprobar
              </button>
              <button
                className="peligro"
                disabled={ocupado || !comentario.trim()}
                onClick={() => accion(() => api(`/editorial/tarjetas/${tarjeta.id}/revisar`, { body: { approved: false, comment: comentario } }), true)}
              >
                Rechazar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
