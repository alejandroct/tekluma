import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DISCIPLINES } from "@tekluma/shared";
import { api, type Articulo, type Norma, type Yo } from "../api";
import { DISCIPLINAS } from "../etiquetas";
import { IconoBuscar, IconoMas } from "../iconos";
import { Aviso, EncabezadoPagina, Vacio } from "../ui";

export function Normas({ yo }: { yo: Yo }) {
  const [normas, setNormas] = useState<Norma[]>([]);
  const [normaId, setNormaId] = useState<string | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [creandoNorma, setCreandoNorma] = useState(false);
  const [agregando, setAgregando] = useState(false);
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
  const q = busqueda.trim().toLowerCase();
  const filtradas = q ? normas.filter((n) => `${n.code} ${n.title}`.toLowerCase().includes(q)) : normas;

  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">02</span> Referencia
          </>
        }
        titulo="Normas"
        descripcion="Texto vigente del RNE. Las citas de cada tarjeta apuntan a estos artículos."
        acciones={
          admin &&
          !creandoNorma && (
            <button className="boton secundario" onClick={() => setCreandoNorma(true)}>
              <IconoMas tamano={16} />
              Nueva norma
            </button>
          )
        }
      />

      {error && <Aviso tono="error">{error}</Aviso>}

      {admin && creandoNorma && (
        <form className="panel" onSubmit={enviar("/editorial/normas", () => (cargar(), setCreandoNorma(false)))}>
          <div className="panel-cab">
            <h2>Nueva norma</h2>
          </div>
          <div className="panel-cuerpo formulario">
            <label className="campo">
              <span>Código</span>
              <input name="code" className="mono-input" placeholder="E.030" required />
            </label>
            <label className="campo">
              <span>Título</span>
              <input name="title" placeholder="Diseño sismorresistente" required />
            </label>
            <label className="campo">
              <span>Disciplina</span>
              <select name="discipline">
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {DISCIPLINAS[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Dispositivo</span>
              <input name="decree" placeholder="D.S. N° 003-2016-VIVIENDA" required />
            </label>
            <label className="campo">
              <span>Fecha de publicación</span>
              <input name="publishedAt" type="date" className="mono-input" required />
            </label>
          </div>
          <div className="panel-pie">
            <span className="espacio" />
            <button type="button" className="boton fantasma" onClick={() => setCreandoNorma(false)}>
              Cancelar
            </button>
            <button className="boton primario">Crear norma</button>
          </div>
        </form>
      )}

      <div className="maestro-detalle">
        <section className="panel lista-normas">
          <div className="barra">
            <label className="buscador">
              <IconoBuscar tamano={16} />
              <input type="search" placeholder="Buscar por código o título" aria-label="Buscar norma" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </label>
          </div>
          <ul className="lista">
            {filtradas.map((n) => (
              <li key={n.id}>
                <button
                  className={`lista-item ${n.id === normaId ? "activo" : ""}`}
                  aria-current={n.id === normaId ? "true" : undefined}
                  onClick={() => (setNormaId(n.id), setAgregando(false))}
                >
                  <span className="titulo">
                    <span className="codigo-norma">{n.code}</span> · {n.title}
                  </span>
                  <span className="meta">{n.decree ?? "Sin versión vigente"}</span>
                  <span className="cuenta" title="Artículos">
                    {n.articleCount}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {filtradas.length === 0 && <Vacio>{q ? "Sin coincidencias." : "Aún no hay normas."}</Vacio>}
        </section>

        <section className="panel">
          {!norma ? (
            <Vacio>Elige una norma para ver sus artículos.</Vacio>
          ) : (
            <>
              <div className="panel-cab">
                <h2>
                  <span className="codigo-norma">{norma.code}</span>
                  {norma.title}
                </h2>
                {admin && !agregando && (
                  <button className="boton secundario" onClick={() => setAgregando(true)}>
                    <IconoMas tamano={16} />
                    Agregar artículo
                  </button>
                )}
              </div>
              <dl className="ficha bajo-cab">
                <div>
                  <dt>Dispositivo</dt>
                  <dd title={norma.decree ?? undefined}>{norma.decree ?? "Sin versión vigente"}</dd>
                </div>
                <div>
                  <dt>Disciplina</dt>
                  <dd>{DISCIPLINAS[norma.discipline] ?? norma.discipline}</dd>
                </div>
                <div>
                  <dt>Artículos</dt>
                  <dd className="mono">{norma.articleCount}</dd>
                </div>
              </dl>
              {admin && agregando && (
                <form
                  className="form-articulo"
                  onSubmit={enviar(`/editorial/normas/${norma.id}/articulos`, () => (cargar(), cargarArticulos()))}
                >
                  <div className="panel-cuerpo formulario">
                    <label className="campo">
                      <span>Número</span>
                      <input name="number" className="mono-input" placeholder="28.2" required />
                    </label>
                    <label className="campo">
                      <span>Epígrafe (opcional)</span>
                      <input name="heading" placeholder="Desplazamientos laterales permisibles" />
                    </label>
                    <label className="campo ancho">
                      <span>Texto del artículo</span>
                      <textarea name="body" required rows={5} />
                    </label>
                  </div>
                  <div className="panel-pie">
                    <span className="nota espacio">Copia el texto literal del dispositivo oficial.</span>
                    <button type="button" className="boton fantasma" onClick={() => setAgregando(false)}>
                      Cerrar
                    </button>
                    <button className="boton primario">Agregar artículo</button>
                  </div>
                </form>
              )}
              <ol className="articulos">
                {articulos.map((a) => (
                  <li key={a.id}>
                    <article className="articulo">
                      <div className="articulo-num">
                        <small>Art.</small>
                        {a.number}
                      </div>
                      <div>
                        {a.heading && <h3>{a.heading}</h3>}
                        <p>{a.body}</p>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
              {articulos.length === 0 && <Vacio>Esta norma aún no tiene artículos.</Vacio>}
            </>
          )}
        </section>
      </div>
    </>
  );
}
