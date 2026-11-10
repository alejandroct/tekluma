import { useState, type FormEvent } from "react";
import { auth } from "../api";
import { IconoChevron } from "../iconos";
import { Aviso, Logo } from "../ui";

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
    <div className="acceso">
      <div className="acceso-marco">
        <form className="acceso-panel" onSubmit={enviar}>
          <div className="acceso-cab">
            <Logo alto={26} />
            <div className="acceso-titulos">
              <span className="rotulo">
                Panel editorial · Paso <span className="n">{enviado ? "2" : "1"}</span>/2
              </span>
              <h1>{enviado ? "Revisa tu correo" : "Ingresa al panel"}</h1>
              <p className="encabezado-desc">
                {enviado ? "Te enviamos un código de 6 dígitos. Vence en unos minutos." : "Acceso exclusivo para el equipo editorial."}
              </p>
            </div>
            <div className="pasos-acceso" aria-hidden="true">
              <span className="hecho" />
              <span className={enviado ? "hecho" : ""} />
            </div>
          </div>
          <div className="acceso-cuerpo">
            {!enviado ? (
              <label className="campo">
                <span>Correo</span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="nombre@tekluma.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            ) : (
              <>
                <div className="campo">
                  <span>Correo</span>
                  <div className="correo-fijo">
                    <span>{email}</span>
                    <button type="button" className="enlace" onClick={() => (setEnviado(false), setCodigo(""))}>
                      Usar otro correo
                    </button>
                  </div>
                </div>
                <label key="codigo" className="campo">
                  <span>Código de 6 dígitos</span>
                  <input
                    className="codigo-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && <Aviso tono="error">{error}</Aviso>}
            <button className="boton primario" disabled={ocupado}>
              {ocupado ? "Un momento…" : enviado ? "Ingresar" : "Enviarme un código"}
              {!ocupado && <IconoChevron tamano={16} />}
            </button>
          </div>
        </form>
        <div className="acceso-pie">
          <span>Tekluma</span>
          <span>RNE · Equipo editorial</span>
        </div>
      </div>
    </div>
  );
}
