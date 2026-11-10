import type { ReactNode } from "react";
import type { EditorialStatus } from "@tekluma/shared";
import { ESTADOS } from "./etiquetas";
import { IconoAlerta, IconoCheck } from "./iconos";

/** Brand lockup; swaps to the light-on-dark artwork in dark mode. */
export function Logo({ alto = 22 }: { alto?: number }) {
  return (
    <picture className="logo">
      <source srcSet="/logo-oscuro.svg" media="(prefers-color-scheme: dark)" />
      <img src="/logo.svg" alt="Tekluma" height={alto} width={Math.round((alto * 1075) / 280)} />
    </picture>
  );
}

/** Square-cornered status label. */
export function Estado({ estado }: { estado: EditorialStatus }) {
  return <span className={`estado estado-${estado}`}>{ESTADOS[estado]}</span>;
}

type Encabezado = {
  rotulo?: ReactNode;
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode;
};

/** Page header: small mono label (or breadcrumb), title, context line and actions on the right. */
export function EncabezadoPagina({ rotulo, titulo, descripcion, acciones, children }: Encabezado) {
  return (
    <header className="encabezado">
      <div className="encabezado-fila">
        <div className="encabezado-texto">
          {rotulo && <div className="rotulo">{rotulo}</div>}
          <h1>{titulo}</h1>
          {descripcion && <p className="encabezado-desc">{descripcion}</p>}
        </div>
        {acciones && <div className="encabezado-acciones">{acciones}</div>}
      </div>
      {children}
    </header>
  );
}

/** Inline notice. `tono` maps to the status palette. */
export function Aviso({ tono = "info", titulo, children }: { tono?: "info" | "error" | "ok" | "atencion"; titulo?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`aviso aviso-${tono}`} role={tono === "error" ? "alert" : "status"}>
      {tono === "ok" ? <IconoCheck tamano={16} /> : <IconoAlerta tamano={16} />}
      <div>
        {titulo && <strong>{titulo}</strong>}
        {children && <div className="aviso-cuerpo">{children}</div>}
      </div>
    </div>
  );
}

/** Empty / placeholder state inside a panel. */
export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>;
}
