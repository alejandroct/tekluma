import type { ContenidoTarjeta } from "@tekluma/shared";

/** The card as the student sees it, with the answer revealed, so reviewers can check text and figures. */
export function VistaPrevia({ c }: { c: ContenidoTarjeta }) {
  const imagen = "imagenUrl" in c && c.imagenUrl ? <img className="vp-figura" src={c.imagenUrl} alt="Figura de la tarjeta" /> : null;
  const explicacion = "explicacion" in c && c.explicacion ? <p className="vp-explicacion">{c.explicacion}</p> : null;

  return (
    <div className="vista-previa">
      {c.tipo !== "imagen" && c.tipo !== "tabla" && imagen}
      {c.tipo === "concepto" && (
        <>
          <p className="vp-pregunta">{c.pregunta}</p>
          <Respuesta>{c.respuesta}</Respuesta>
        </>
      )}
      {c.tipo === "imagen" && (
        <>
          <p className="vp-pregunta">{c.pregunta}</p>
          {imagen}
          <Respuesta>{c.respuesta}</Respuesta>
        </>
      )}
      {c.tipo === "opcion_multiple" && (
        <>
          <p className="vp-pregunta">{c.pregunta}</p>
          <ol className="vp-opciones">
            {c.opciones.map((o, i) => (
              <li key={i} className={i === c.correcta ? "correcta" : undefined}>
                <span className="vp-letra">{"ABCDEF"[i]}</span>
                {o}
              </li>
            ))}
          </ol>
        </>
      )}
      {c.tipo === "completar" && (
        <p className="vp-pregunta">
          {c.texto.split(/(\{\{.+?\}\})/).map((parte, i) =>
            parte.startsWith("{{") ? (
              <mark key={i} className="vp-hueco">
                {parte.slice(2, -2)}
              </mark>
            ) : (
              parte
            ),
          )}
        </p>
      )}
      {c.tipo === "tabla" && (
        <>
          <p className="vp-pregunta">{c.titulo}</p>
          {imagen}
          <div className="tabla-envoltura">
            <table className="vp-tabla">
              <thead>
                <tr>
                  <th />
                  {c.columnas.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.filas.map((f, i) => (
                  <tr key={i}>
                    <th>{f.etiqueta}</th>
                    {f.valores.map((v, j) => (
                      <td key={j} className={i === c.pregunta.fila && j === c.pregunta.columna ? "vp-celda" : undefined}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="vp-nota">La celda resaltada es la que se pregunta.</p>
        </>
      )}
      {c.tipo === "caso_numerico" && (
        <>
          <p className="vp-pregunta">{c.enunciado}</p>
          <dl className="vp-variables">
            {Object.entries(c.variables).map(([nombre, v]) => (
              <div key={nombre}>
                <dt className="mono">{nombre}</dt>
                <dd>
                  {v.etiqueta}: <span className="mono">{v.valores.join(" · ")}</span>
                  {v.unidad ? ` ${v.unidad}` : ""}
                </dd>
              </div>
            ))}
          </dl>
          <Respuesta>
            <span className="mono">{c.formula}</span>
            {c.unidadResultado ? ` (${c.unidadResultado})` : ""} · tolerancia {Math.round((c.tolerancia ?? 0.02) * 1000) / 10} %
          </Respuesta>
        </>
      )}
      {explicacion}
    </div>
  );
}

function Respuesta({ children }: { children: React.ReactNode }) {
  return (
    <div className="vp-respuesta">
      <span className="rotulo">Respuesta</span>
      <div>{children}</div>
    </div>
  );
}
