import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, type Reclamo } from "../api";
import { Aviso, confirmar, EncabezadoPagina, Vacio } from "../ui";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric" });
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });

/** Business days left until the legal deadline (negative = overdue). Weekends do not count. */
function diasHabilesRestantes(vence: string) {
  const hoy = new Date();
  const fin = new Date(vence);
  let dias = 0;
  const paso = fin > hoy ? 1 : -1;
  for (const d = new Date(hoy); paso > 0 ? d < fin : d > fin; d.setDate(d.getDate() + paso)) {
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) dias += paso;
  }
  return dias;
}

function EstadoReclamo({ r }: { r: Reclamo }) {
  if (r.status === "respondido") return <span className="estado estado-published">Respondido</span>;
  const quedan = diasHabilesRestantes(r.dueAt);
  if (quedan < 0) return <span className="estado estado-vencido">Vencido</span>;
  return <span className="estado estado-in_review">{quedan === 0 ? "Vence hoy" : `${quedan} días hábiles`}</span>;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <span className="rotulo">{etiqueta}</span>
      <span>{children}</span>
    </div>
  );
}

export function Reclamos() {
  const [lista, setLista] = useState<Reclamo[] | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cargar = useCallback(() => api<Reclamo[]>("/editorial/reclamos").then(setLista).catch((e) => setError((e as Error).message)), []);
  useEffect(() => void cargar(), [cargar]);

  const r = lista?.find((x) => x.id === elegido) ?? null;

  const responder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!r) return;
    const respuesta = String(new FormData(e.currentTarget).get("respuesta") ?? "").trim();
    const ok = await confirmar({
      titulo: `Responder la hoja N° ${r.codigo}`,
      mensaje: `Se enviará a ${r.email} y la hoja quedará cerrada. No se puede editar después.`,
      accion: "Enviar respuesta",
    });
    if (!ok) return;
    setError(null);
    setEnviando(true);
    try {
      await api(`/editorial/reclamos/${r.id}/respuesta`, { body: { respuesta } });
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    if (!r) return;
    setError(null);
    try {
      await api(`/editorial/reclamos/${r.id}/constancia`, { body: {} });
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const pendientes = lista?.filter((x) => x.status === "pendiente").length ?? 0;

  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">04</span> Administración
          </>
        }
        titulo="Libro de Reclamaciones"
        descripcion="Hojas recibidas desde tekluma.app/reclamaciones. La ley exige responder por correo en un máximo de 15 días hábiles."
      />

      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="reclamos">
        <section className="panel">
          <div className="panel-cab">
            <h2>Hojas</h2>
            <span className="mono nota">{pendientes} pendientes</span>
          </div>
          {lista && lista.length === 0 ? (
            <Vacio>Todavía no hay reclamos ni quejas.</Vacio>
          ) : (
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Consumidor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista?.map((x) => (
                    <tr key={x.id} className={`clic ${x.id === elegido ? "seleccionada" : ""}`} onClick={() => setElegido(x.id)}>
                      <td className="mono nowrap">{x.codigo}</td>
                      <td className="nowrap">{fecha(x.createdAt)}</td>
                      <td>
                        <span className="etiqueta-plana">{x.kind}</span>
                      </td>
                      <td className="celda-titulo">{x.name}</td>
                      <td>
                        <EstadoReclamo r={x} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {r ? (
          <section className="panel hoja-reclamo">
            <div className="panel-cab">
              <h2>
                Hoja N° <span className="mono">{r.codigo}</span>
              </h2>
              <EstadoReclamo r={r} />
            </div>
            <div className="panel-cuerpo">
              <div className="datos">
                <Dato etiqueta="Recibida">{fechaHora(r.createdAt)}</Dato>
                <Dato etiqueta="Vence">{fecha(r.dueAt)}</Dato>
                <Dato etiqueta="Tipo">{r.kind === "reclamo" ? "Reclamo" : "Queja"}</Dato>
                <Dato etiqueta="Nombre">{r.name}</Dato>
                <Dato etiqueta="Documento">
                  {r.documentType} {r.documentNumber}
                </Dato>
                <Dato etiqueta="Domicilio">{r.address}</Dato>
                <Dato etiqueta="Teléfono">{r.phone}</Dato>
                <Dato etiqueta="Correo">
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </Dato>
                {r.isMinor && <Dato etiqueta="Apoderado">{r.guardian}</Dato>}
                <Dato etiqueta="Bien">
                  {r.itemType === "producto" ? "Producto" : "Servicio"}: {r.itemDescription}
                </Dato>
                <Dato etiqueta="Monto">{r.amountCents == null ? "—" : `S/ ${(r.amountCents / 100).toFixed(2)}`}</Dato>
              </div>
              <div className="texto-reclamo">
                <span className="rotulo">Detalle</span>
                <p>{r.detail}</p>
                <span className="rotulo">Pedido</span>
                <p>{r.request}</p>
              </div>

              {!r.receiptSentAt && (
                <Aviso tono="atencion" titulo="La constancia no llegó al consumidor">
                  El correo falló al registrar la hoja.{" "}
                  <button className="boton" onClick={reenviar}>
                    Reenviar constancia
                  </button>
                </Aviso>
              )}

              {r.status === "respondido" ? (
                <div className="texto-reclamo">
                  <span className="rotulo">Respuesta enviada el {r.respondedAt ? fechaHora(r.respondedAt) : "—"}</span>
                  <p>{r.response}</p>
                </div>
              ) : (
                <form className="columna-pila" onSubmit={responder}>
                  <label className="campo">
                    <span>Respuesta al consumidor</span>
                    <textarea name="respuesta" rows={8} minLength={10} maxLength={5000} required placeholder="Explica qué se hizo y la solución. Se envía tal cual por correo." />
                  </label>
                  <div>
                    <button className="boton primario" disabled={enviando}>
                      {enviando ? "Enviando…" : "Enviar respuesta"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        ) : (
          <section className="panel">
            <Vacio>Elige una hoja para verla y responderla.</Vacio>
          </section>
        )}
      </div>
    </>
  );
}
