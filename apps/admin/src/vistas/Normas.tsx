import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DISCIPLINES } from "@tekluma/shared";
import { api, type Articulo, type Norma, type Yo } from "../api";

export function Normas({ yo }: { yo: Yo }) {
  const [normas, setNormas] = useState<Norma[]>([]);
  const [normaId, setNormaId] = useState<string | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const admin = yo.rol === "admin";

  const cargar = useCallback(() => api<Norma[]>("/editorial/normas").then(setNormas), []);
  const cargarArticulos = useCallback(() => {
    if (normaId) api<Articulo[]>(`/editorial/normas/${normaId}/articulos`).then(setArticulos);
  }, [normaId]);
  useEffect(() => void cargar(), [cargar]);
  useEffect(cargarArticulos, [cargarArticulos]);

  const enviar = (ruta: string, despues: () => void) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    try {
      await api(ruta, { body: Object.fromEntries(new FormData(form)) });
      form.reset();
      despues();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const norma = normas.find((n) => n.id === normaId);

  return (
    <div className="dos-columnas">
      <aside className="lista">
        {normas.map((n) => (
          <button key={n.id} className={`item ${n.id === normaId ? "activo" : ""}`} onClick={() => setNormaId(n.id)}>
            <strong>
              {n.code} · {n.title}
            </strong>
            <span className="nota">
              {n.decree ?? "sin versión vigente"} · {n.articleCount} artículos
            </span>
          </button>
        ))}
        {admin && (
          <form className="caja" onSubmit={enviar("/editorial/normas", cargar)}>
            <strong>Nueva norma</strong>
            <input name="code" placeholder="Código (E.030)" required />
            <input name="title" placeholder="Título" required />
            <select name="discipline">
              {DISCIPLINES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input name="decree" placeholder="Dispositivo (D.S. N° 003-2016-VIVIENDA)" required />
            <input name="publishedAt" type="date" required />
            <button className="secundario">Crear norma</button>
          </form>
        )}
      </aside>
      <main>
        {error && <p className="error">{error}</p>}
        {!norma ? (
          <p className="nota">Elige una norma para ver sus artículos.</p>
        ) : (
          <>
            <h2>
              {norma.code} · {norma.title}
            </h2>
            {admin && (
              <form className="caja" onSubmit={enviar(`/editorial/normas/${norma.id}/articulos`, () => (cargar(), cargarArticulos()))}>
                <strong>Agregar artículo</strong>
                <input name="number" placeholder="Número (28.2)" required />
                <input name="heading" placeholder="Epígrafe (opcional)" />
                <textarea name="body" className="corto" placeholder="Texto del artículo" required />
                <button className="secundario">Agregar</button>
              </form>
            )}
            {articulos.map((a) => (
              <article key={a.id} className="articulo">
                <strong>
                  Art. {a.number} {a.heading && `· ${a.heading}`}
                </strong>
                <p>{a.body}</p>
              </article>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
