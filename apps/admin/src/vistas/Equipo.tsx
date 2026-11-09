import { useCallback, useEffect, useState, type FormEvent } from "react";
import { STAFF_ROLES } from "@tekluma/shared";
import { api, type Miembro } from "../api";
import { ROLES } from "../etiquetas";

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

  const agregar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    asignar(String(f.get("email")), String(f.get("staffRole")));
    e.currentTarget.reset();
  };

  return (
    <main className="angosto">
      <h2>Equipo editorial</h2>
      <form className="caja en-linea" onSubmit={agregar}>
        <input name="email" type="email" placeholder="correo@ejemplo.com" required />
        <select name="staffRole">
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
            </option>
          ))}
        </select>
        <button className="primario">Dar acceso</button>
      </form>
      <p className="nota">La persona debe haber iniciado sesión una vez (en la app o aquí) para poder asignarle un rol.</p>
      {error && <p className="error">{error}</p>}
      <table>
        <tbody>
          {miembros.map((m) => (
            <tr key={m.id}>
              <td>
                <strong>{m.name || "—"}</strong>
                <br />
                <span className="nota">{m.email}</span>
              </td>
              <td>
                <select value={m.staffRole} onChange={(e) => asignar(m.email, e.target.value)}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button className="enlace" onClick={() => confirm(`¿Quitar acceso a ${m.email}?`) && asignar(m.email, null)}>
                  Quitar acceso
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
