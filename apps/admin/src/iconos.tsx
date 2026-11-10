import type { ReactNode, SVGProps } from "react";

/**
 * Tekluma icon set — "technical drawing" style.
 * 20×20 grid, 1.5px strokes, butt caps, mitre joins, currentColor.
 */
type Props = Omit<SVGProps<SVGSVGElement>, "children"> & { tamano?: number };

function Icono({ tamano = 18, children, ...resto }: Props & { children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className="icono"
      {...resto}
    >
      {children}
    </svg>
  );
}

/** Deck: three stacked sheets. */
export const IconoMazo = (p: Props) => (
  <Icono {...p}>
    <rect x="2.75" y="7.75" width="10" height="9.5" />
    <path d="M5.75 4.75H15.75V14.25" />
    <path d="M8.75 1.75H18.25V11.25" />
  </Icono>
);

/** Standard: sheet with folded corner and a section mark. */
export const IconoNorma = (p: Props) => (
  <Icono {...p}>
    <path d="M4.25 2.75H12.25L15.75 6.25V17.25H4.25Z" />
    <path d="M12.25 2.75V6.25H15.75" />
    <path d="M11.5 9.1C11.5 8.4 10.85 8 10 8S8.5 8.4 8.5 9.1C8.5 10.6 11.5 10.4 11.5 12.1C11.5 12.85 10.85 13.25 10 13.25" />
    <path d="M8.5 15.15C8.5 15.85 9.15 16.25 10 16.25S11.5 15.85 11.5 15.15C11.5 13.65 8.5 13.85 8.5 12.15C8.5 11.4 9.15 11 10 11" />
  </Icono>
);

/** Team: two figures, square heads and right-angle shoulders. */
export const IconoEquipo = (p: Props) => (
  <Icono {...p}>
    <rect x="4.75" y="3.75" width="4.5" height="4.5" />
    <path d="M2.25 16.75V11.25H11.75V16.75" />
    <path d="M12.75 3.75H15.25V8.25H12.75" />
    <path d="M14.25 11.25H17.75V16.75" />
  </Icono>
);

export const IconoMas = (p: Props) => (
  <Icono {...p}>
    <path d="M10 3.5V16.5M3.5 10H16.5" />
  </Icono>
);

export const IconoCheck = (p: Props) => (
  <Icono {...p}>
    <path d="M3.75 10.25L8 14.5L16.25 6.25" />
  </Icono>
);

export const IconoCruz = (p: Props) => (
  <Icono {...p}>
    <path d="M4.5 4.5L15.5 15.5M15.5 4.5L4.5 15.5" />
  </Icono>
);

/** Close: a lighter cross inside the grid. */
export const IconoCerrar = (p: Props) => (
  <Icono {...p}>
    <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" />
  </Icono>
);

/** Send to review: arrow entering a box. */
export const IconoEnviar = (p: Props) => (
  <Icono {...p}>
    <path d="M9.25 3.25H16.75V16.75H9.25" />
    <path d="M2.5 10H12.5" />
    <path d="M9.25 6.75L12.5 10L9.25 13.25" />
  </Icono>
);

/** Publish: upload arrow standing on a baseline. */
export const IconoPublicar = (p: Props) => (
  <Icono {...p}>
    <path d="M3.25 16.75H16.75" />
    <path d="M10 13.5V3.5" />
    <path d="M6.5 7L10 3.5L13.5 7" />
  </Icono>
);

/** Edit: square-ended drafting pencil. */
export const IconoEditar = (p: Props) => (
  <Icono {...p}>
    <path d="M3.25 16.75V13.25L12.75 3.75L16.25 7.25L6.75 16.75Z" />
    <path d="M10.5 6L14 9.5" />
  </Icono>
);

export const IconoChevron = (p: Props) => (
  <Icono {...p}>
    <path d="M7.75 4.75L13 10L7.75 15.25" />
  </Icono>
);

export const IconoAtras = (p: Props) => (
  <Icono {...p}>
    <path d="M16.5 10H4" />
    <path d="M8.5 5.5L4 10L8.5 14.5" />
  </Icono>
);

/** Log out: open bracket with an arrow leaving it. */
export const IconoSalir = (p: Props) => (
  <Icono {...p}>
    <path d="M8.25 3.25H3.25V16.75H8.25" />
    <path d="M7 10H17" />
    <path d="M13.75 6.75L17 10L13.75 13.25" />
  </Icono>
);

export const IconoBuscar = (p: Props) => (
  <Icono {...p}>
    <circle cx="8.5" cy="8.5" r="5" />
    <path d="M12.25 12.25L16.75 16.75" />
  </Icono>
);

/** Notice: triangle with an exclamation tick. */
export const IconoAlerta = (p: Props) => (
  <Icono {...p}>
    <path d="M10 2.75L17.75 16.75H2.25Z" />
    <path d="M10 7.5V12" />
    <path d="M10 13.5V15" />
  </Icono>
);

/** Restricted access: padlock with square shackle. */
export const IconoCandado = (p: Props) => (
  <Icono {...p}>
    <rect x="3.75" y="8.75" width="12.5" height="8.5" />
    <path d="M6.75 8.75V3.25H13.25V8.75" />
    <path d="M10 11.75V14.25" />
  </Icono>
);

/** Bulk import: arrow down into an open tray. */
export const IconoImportar = (p: Props) => (
  <Icono {...p}>
    <path d="M10 2.75V12.25" />
    <path d="M6.25 8.5L10 12.25L13.75 8.5" />
    <path d="M2.75 12.75V17.25H17.25V12.75" />
  </Icono>
);
