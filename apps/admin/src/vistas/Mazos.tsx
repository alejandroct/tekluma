import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EditorialStatus } from "@tekluma/shared";
import { api, type Mazo, type Norma, type Tarjeta, type Yo } from "../api";
import { ESTADOS, resumen } from "../etiquetas";
import { Editor } from "./Editor";

export function Mazos({ yo }: { yo: Yo }) {
  const [mazos, setMazos] = useState<Mazo[]>([]);
  const [mazoId, setMazoId] = useState<string | null>(null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [filtro, setFiltro] = useState<EditorialStatus | "todas">("todas");
  const [abierta, setAbierta] = useState<Tarjeta | "nueva" | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargarMazos = useCallback(() => api<Mazo[]>("/editorial/mazos").then(setMazos), []);
  const cargarTarjetas = useCallback(() => {
    if (mazoId) api<Tarjeta[]>(`/editorial/mazos/${mazoId}/tarjetas`).then(setTarjetas);
  }, [mazoId]);

  useEffect(() => void cargarMazos(), [cargarMazos]);
  useEffect(cargarTarjetas, [cargarTarjetas]);

  const elegir = (id: string) => {
    setMazoId(id);
    setTarjetas([]);
    setAbierta(null);
    setMensaje(null);
  };

  const mazo = mazos.find((m) => m.id === mazoId);
  const visibles = filtro === "todas" ? tarjetas : tarjetas.filter((t) => t.status === filtro);
  const aprobadas = mazo?.counts.approved ?? 0;

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

  return (
    <div className="dos-columnas">
      <aside className="lista">
        {mazos.map((m) => (
          <button key={m.id} className={`item ${m.id === mazoId ? "activo" : ""}`} onClick={() => elegir(m.id)}>
            <strong>{m.title}</strong>
            <span className="nota">
              {m.standardCode} · {m.access === "premium" ? "Premium" : "Gratis"} · {m.version ? `v${m.version}` : "sin publicar"}
            </span>
            {(m.counts.in_review ?? 0) > 0 && <span className="estado in_review">{m.counts.in_review} en revisión</span>}
          </button>
        ))}
        {yo.rol === "admin" &&
          (creando ? (
            <NuevoMazo onListo={() => (setCreando(false), cargarMazos())} />
          ) : (
            <button className="secundario" onClick={() => setCreando(true)}>
              + Nuevo mazo
            </button>
          ))}
      </aside>

      <main>
        {!mazo ? (
          <p className="nota">Elige un mazo para ver sus tarjetas.</p>
        ) : abierta ? (
          <Editor
            key={abierta === "nueva" ? "nueva" : abierta.id}
            yo={yo}
            mazoId={mazo.id}
            standardId={mazo.standardId}
            tarjeta={abierta === "nueva" ? null : abierta}
            onCambio={alCambiar}
            onCerrar={() => setAbierta(null)}
          />
        ) : (
          <>
            <div className="fila-titulo">
              <h2>{mazo.title}</h2>
              <button className="primario" onClick={() => setAbierta("nueva")}>
                + Nueva tarjeta
              </button>
              {yo.rol !== "author" && (
                <button className="secundario" disabled={aprobadas === 0} onClick={publicar} title="Incluye las aprobadas y las ya publicadas">
                  Publicar versión {(mazo.version ?? 0) + 1} ({aprobadas} nuevas)
                </button>
              )}
            </div>
            {mensaje && <p className="aviso">{mensaje}</p>}
            <div className="chips">
              {(["todas", "draft", "in_review", "approved", "published"] as const).map((f) => (
                <button key={f} className={`chip ${filtro === f ? "activo" : ""}`} onClick={() => setFiltro(f)}>
                  {f === "todas" ? `Todas (${tarjetas.length})` : `${ESTADOS[f]} (${mazo.counts[f] ?? 0})`}
                </button>
              ))}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tarjeta</th>
                  <th>Tipo</th>
                  <th>Autor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((t) => (
                  <tr key={t.id} onClick={() => setAbierta(t)}>
                    <td>{resumen(t.content)}</td>
                    <td className="nota">{t.content.tipo}</td>
                    <td className="nota">{t.authorName || "—"}</td>
                    <td>
                      <span className={`estado ${t.status}`}>{ESTADOS[t.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.length === 0 && <p className="nota">No hay tarjetas aquí.</p>}
          </>
        )}
      </main>
    </div>
  );
}

function NuevoMazo({ onListo }: { onListo: () => void }) {
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
    <form className="caja" onSubmit={crear}>
      <input name="title" placeholder="Título" required />
      <input name="slug" placeholder="slug-del-mazo" required pattern="[a-z0-9-]+" />
      <select name="standardId" required>
        {normas.map((n) => (
          <option key={n.id} value={n.id}>
            {n.code} · {n.title}
          </option>
        ))}
      </select>
      <select name="access">
        <option value="free">Gratis</option>
        <option value="premium">Premium</option>
      </select>
      <textarea name="description" className="corto" placeholder="Descripción" />
      {error && <p className="error">{error}</p>}
      <button className="primario">Crear</button>
    </form>
  );
}
