import { useState, type FormEvent } from "react";
import { auth } from "../api";

export function Login({ onIngreso }: { onIngreso: () => void }) {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      if (!enviado) {
        await auth.enviarCodigo(email.trim().toLowerCase());
        setEnviado(true);
      } else {
        await auth.ingresar(email.trim().toLowerCase(), codigo.trim());
        onIngreso();
      }
    } catch (err) {
      setError(enviado ? "Código incorrecto o vencido." : (err as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="login">
      <form className="caja" onSubmit={enviar}>
        <img src="/favicon.svg" alt="" width={48} height={48} />
        <h1>Panel editorial</h1>
        <p className="nota">Acceso exclusivo para el equipo de contenidos de Tekluma.</p>
        <label>
          Correo
          <input type="email" required autoFocus value={email} disabled={enviado} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {enviado && (
          <label key="codigo">
            Código de 6 dígitos
            <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="primario" disabled={ocupado}>
          {ocupado ? "…" : enviado ? "Ingresar" : "Enviarme un código"}
        </button>
        {enviado && (
          <button type="button" className="enlace" onClick={() => (setEnviado(false), setCodigo(""))}>
            Usar otro correo
          </button>
        )}
      </form>
    </div>
  );
}
