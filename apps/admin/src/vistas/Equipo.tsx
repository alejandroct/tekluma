import { useCallback, useEffect, useState, type FormEvent } from "react";
import { STAFF_ROLES } from "@tekluma/shared";
import { api, type Miembro } from "../api";
import { DESCRIPCION_ROLES, ROLES } from "../etiquetas";
import { IconoEditar } from "../iconos";
import { Aviso, confirmar, EncabezadoPagina, pedir, Vacio } from "../ui";

export function Equipo() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => api<Miembro[]>("/editorial/equipo").then(setMiembros), []);
  useEffect(() => void cargar(), [cargar]);

  const asignar = async (email: string, staffRole: string | null) => {
    setError(null);
    try {
      await api("/editorial/equipo", { body: { email, staffRole } });
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const quitar = async (m: Miembro) => {
    const ok = await confirmar({
      titulo: "Quitar acceso",
      mensaje: `${m.name || m.email} dejará de entrar al panel editorial. Su cuenta en la app no cambia.`,
      accion: "Quitar acceso",
      peligro: true,
    });
    if (ok) asignar(m.email, null);
  };

  const renombrar = async (m: Miembro) => {
    const nombre = await pedir({
      titulo: "Editar nombre",
      mensaje: m.email,
      accion: "Guardar",
      campo: { etiqueta: "Nombre y apellido", valor: m.name ?? "", placeholder: "Nombre y apellido" },
    });
    if (typeof nombre !== "string") return;
    setError(null);
    try {
      await api(`/editorial/equipo/${m.id}`, { method: "PUT", body: { name: nombre } });
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const agregar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    asignar(String(f.get("email")), String(f.get("staffRole")));
    e.currentTarget.reset();
  };

  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">03</span> Administración
          </>
        }
        titulo="Equipo"
        descripcion="Personas con acceso al panel editorial y su rol en el flujo de revisión."
      />

      <div className="equipo">
        <div className="columna-pila">
          <form className="panel" onSubmit={agregar}>
            <div className="panel-cab">
              <h2>Dar acceso</h2>
            </div>
            <div className="panel-cuerpo">
              <div className="fila-form">
                <label className="campo">
                  <span>Correo</span>
                  <input name="email" type="email" placeholder="correo@ejemplo.com" required />
                </label>
                <label className="campo corto">
                  <span>Rol</span>
                  <select name="staffRole">
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLES[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="boton primario">Dar acceso</button>
              </div>
              <p className="nota">La persona debe haber iniciado sesión una vez (en la app o aquí) para poder asignarle un rol.</p>
            </div>
          </form>

          {error && <Aviso tono="error">{error}</Aviso>}

          <section className="panel">
            <div className="panel-cab">
              <h2>Miembros</h2>
              <span className="mono nota">{miembros.length}</span>
            </div>
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {miembros.map((m) => (
                    <tr key={m.id}>
                      <td className="celda-titulo nowrap">
                        <button className="enlace-nombre" onClick={() => renombrar(m)} title="Editar nombre">
                          {m.name || <span className="sin-nombre">Sin nombre</span>}
                          <IconoEditar tamano={14} />
                        </button>
                      </td>
                      <td className="secundario-celda">{m.email}</td>
                      <td>
                        <select
                          className="select-compacto"
                          aria-label={`Rol de ${m.email}`}
                          value={m.staffRole}
                          onChange={(e) => asignar(m.email, e.target.value)}
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLES[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="derecha">
                        <button className="enlace peligro-texto" onClick={() => quitar(m)}>
                          Quitar acceso
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {miembros.length === 0 && <Vacio>Todavía no hay miembros.</Vacio>}
          </section>
        </div>

        <aside className="panel">
          <div className="panel-cab">
            <h2>Roles</h2>
          </div>
          <dl className="roles-leyenda">
            {STAFF_ROLES.map((r) => (
              <div key={r}>
                <dt>
                  <span className="rol">{ROLES[r]}</span>
                </dt>
                <dd>{DESCRIPCION_ROLES[r]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}
