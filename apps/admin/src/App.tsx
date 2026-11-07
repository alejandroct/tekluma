import { useMemo, useState } from "react";
import { contenidoTarjetaSchema, type TipoTarjeta } from "@tekluma/shared";
import "./App.css";

const PLANTILLAS: Record<TipoTarjeta, object> = {
  concepto: { tipo: "concepto", pregunta: "", respuesta: "", explicacion: "" },
  opcion_multiple: { tipo: "opcion_multiple", pregunta: "", opciones: ["", "", "", ""], correcta: 0 },
  completar: { tipo: "completar", texto: "El recubrimiento mínimo es {{70 mm}}." },
  tabla: {
    tipo: "tabla",
    titulo: "",
    columnas: [""],
    filas: [{ etiqueta: "", valores: [""] }],
    pregunta: { fila: 0, columna: 0 },
  },
  caso_numerico: {
    tipo: "caso_numerico",
    enunciado: "Calcula V para Z = {Z} ...",
    variables: { Z: { etiqueta: "Factor de zona", valores: [0.45, 0.35] } },
    formula: "Z*1.0",
    unidadResultado: "tf",
    tolerancia: 0.02,
  },
  imagen: { tipo: "imagen", pregunta: "", imagenUrl: "https://", respuesta: "" },
};

export default function App() {
  const [tipo, setTipo] = useState<TipoTarjeta>("concepto");
  const [json, setJson] = useState(() => JSON.stringify(PLANTILLAS.concepto, null, 2));

  const resultado = useMemo(() => {
    try {
      return contenidoTarjetaSchema.safeParse(JSON.parse(json));
    } catch (e) {
      return { success: false as const, error: { issues: [{ path: [], message: (e as Error).message }] } };
    }
  }, [json]);

  return (
    <div className="pagina">
      <header>
        <img src="/favicon.svg" alt="" width={36} height={36} />
        <h1>Panel editorial</h1>
      </header>

      <section className="editor">
        <div className="columna">
          <label>
            Tipo de tarjeta
            <select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoTarjeta;
                setTipo(t);
                setJson(JSON.stringify(PLANTILLAS[t], null, 2));
              }}
            >
              {Object.keys(PLANTILLAS).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
        </div>

        <div className="columna">
          <h2>Validación</h2>
          {resultado.success ? (
            <p className="ok">✓ Tarjeta válida, lista para enviar a revisión.</p>
          ) : (
            <ul className="errores">
              {resultado.error.issues.map((i, n) => (
                <li key={n}>
                  <code>{i.path.join(".") || "(raíz)"}</code> {i.message}
                </li>
              ))}
            </ul>
          )}
          <p className="nota">
            Flujo: borrador → en revisión → aprobado → publicado. El revisor debe ser distinto del autor y cada
            tarjeta debe citar al menos un artículo.
          </p>
        </div>
      </section>
    </div>
  );
}
