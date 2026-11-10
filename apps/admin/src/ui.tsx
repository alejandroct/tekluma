import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { EditorialStatus } from "@tekluma/shared";
import { ESTADOS } from "./etiquetas";
import { IconoAlerta, IconoCheck } from "./iconos";

/** Brand lockup; swaps to the light-on-dark artwork in dark mode. */
export function Logo({ alto = 22 }: { alto?: number }) {
  return (
    <picture className="logo">
      <source srcSet="/logo-oscuro.svg?v=20261110" media="(prefers-color-scheme: dark)" />
      <img src="/logo.svg?v=20261110" alt="Tekluma" height={alto} width={Math.round((alto * 1075) / 280)} />
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

/* ───────── Dialog (replaces the browser's confirm / prompt) ───────── */

type Pedido = {
  titulo: string;
  mensaje?: ReactNode;
  accion: string;
  peligro?: boolean;
  /** Optional text field: to confirm by typing (`esperado`) or to edit a value. */
  campo?: { etiqueta: string; valor?: string; esperado?: string; mono?: boolean; placeholder?: string };
};
type Respuesta = string | true | null;

let abrirDialogo: ((p: Pedido, responder: (r: Respuesta) => void) => void) | null = null;

/** Opens the panel dialog. Resolves to the typed text (with a field), true (without one) or null if cancelled. */
export const pedir = (p: Pedido) => new Promise<Respuesta>((responder) => (abrirDialogo ? abrirDialogo(p, responder) : responder(null)));
export const confirmar = (p: Pedido) => pedir(p).then((r) => r !== null);

/** Mounted once in the shell; renders whatever `pedir` asks for. */
export function Dialogo() {
  const ref = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState<{ pedido: Pedido; responder: (r: Respuesta) => void } | null>(null);
  const [valor, setValor] = useState("");

  useEffect(() => {
    abrirDialogo = (pedido, responder) => {
      setValor(pedido.campo?.valor ?? "");
      setActual({ pedido, responder });
    };
    return () => {
      abrirDialogo = null;
    };
  }, []);

  useEffect(() => {
    if (actual && !ref.current?.open) ref.current?.showModal();
  }, [actual]);

  const cerrar = (r: Respuesta) => {
    actual?.responder(r);
    setActual(null);
    ref.current?.close();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    cerrar(actual?.pedido.campo ? valor.trim() : true);
  };

  const p = actual?.pedido;
  const listo = !p?.campo || (p.campo.esperado ? valor.trim() === p.campo.esperado : valor.trim().length > 0);

  return (
    <dialog ref={ref} className="dialogo" onCancel={() => cerrar(null)} aria-labelledby="dialogo-titulo">
      {p && (
        <form method="dialog" onSubmit={enviar}>
          <div className="dialogo-cuerpo">
            <h2 id="dialogo-titulo">{p.titulo}</h2>
            {p.mensaje && <div className="dialogo-mensaje">{p.mensaje}</div>}
            {p.campo && (
              <label className="campo">
                <span>
                  {p.campo.etiqueta}
                  {p.campo.esperado && (
                    <>
                      {" "}
                      <code className="dialogo-esperado">{p.campo.esperado}</code>
                    </>
                  )}
                </span>
                <input
                  autoFocus
                  className={p.campo.mono ? "mono-input" : undefined}
                  value={valor}
                  placeholder={p.campo.placeholder}
                  onChange={(e) => setValor(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            )}
          </div>
          <div className="dialogo-pie">
            <button type="button" className="boton secundario" onClick={() => cerrar(null)}>
              Cancelar
            </button>
            <button type="submit" className={`boton ${p.peligro ? "peligro-lleno" : "primario"}`} disabled={!listo} autoFocus={!p.campo}>
              {p.accion}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
