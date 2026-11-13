import type { ReactNode } from "react";

export const numero = (n: number) => n.toLocaleString("es-PE");
export const porcentaje = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)} %` : "—");
const diaCorto = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

/** A key figure: label, big number and an optional line of context. */
export function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="cifra">
      <span className="rotulo">{etiqueta}</span>
      <strong className="cifra-valor">{valor}</strong>
      {detalle && <span className="cifra-detalle">{detalle}</span>}
    </div>
  );
}

/** Daily bar chart (one bar per day, the last one highlighted). Hover shows the exact value. */
export function Barras({ dias, unidad }: { dias: { dia: string; valor: number }[]; unidad: string }) {
  const maximo = Math.max(1, ...dias.map((d) => d.valor));
  const ancho = 100 / Math.max(1, dias.length);
  return (
    <figure className="barras">
      <div className="barras-eje">
        <span className="mono">{numero(maximo)}</span>
        <span className="mono">0</span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`${unidad} por día`}>
        <line x1="0" y1="39.8" x2="100" y2="39.8" className="barras-base" />
        {dias.map((d, i) => {
          const alto = (d.valor / maximo) * 38;
          return (
            <rect
              key={d.dia}
              x={i * ancho + ancho * 0.15}
              y={39.6 - alto}
              width={ancho * 0.7}
              height={Math.max(alto, d.valor ? 0.6 : 0)}
              className={i === dias.length - 1 ? "barra hoy" : "barra"}
            >
              <title>{`${diaCorto(d.dia)}: ${numero(d.valor)} ${unidad}`}</title>
            </rect>
          );
        })}
      </svg>
      {dias.length > 0 && (
        <figcaption className="barras-fechas mono">
          <span>{diaCorto(dias[0]!.dia)}</span>
          <span>Hoy</span>
        </figcaption>
      )}
    </figure>
  );
}

/** Ranked list with proportional bars (professions, regions, universities). */
export function Reparto({ filas, nombre }: { filas: { valor: string | null; usuarios: number }[]; nombre: (valor: string | null) => string }) {
  const maximo = Math.max(1, ...filas.map((f) => f.usuarios));
  if (!filas.length) return <p className="nota">Sin datos todavía.</p>;
  return (
    <ul className="reparto">
      {filas.map((f) => (
        <li key={f.valor ?? "—"}>
          <span className="reparto-nombre">{nombre(f.valor)}</span>
          <span className="reparto-barra">
            <span style={{ width: `${(f.usuarios / maximo) * 100}%` }} />
          </span>
          <span className="mono reparto-n">{numero(f.usuarios)}</span>
        </li>
      ))}
    </ul>
  );
}
