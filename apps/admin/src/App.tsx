import { useCallback, useEffect, useState } from "react";
import { api, auth, ErrorApi, type Yo } from "./api";
import { ROLES } from "./etiquetas";
import { Equipo } from "./vistas/Equipo";
import { Login } from "./vistas/Login";
import { Mazos } from "./vistas/Mazos";
import { Normas } from "./vistas/Normas";
import "./App.css";

type Sesion = { tipo: "cargando" } | { tipo: "anonimo" } | { tipo: "sin-acceso"; mensaje: string } | { tipo: "staff"; yo: Yo };
type Vista = "mazos" | "normas" | "equipo";

export default function App() {
  const [sesion, setSesion] = useState<Sesion>({ tipo: "cargando" });
  const [vista, setVista] = useState<Vista>("mazos");

  const cargar = useCallback(() => {
    api<Yo>("/editorial/yo").then(
      (yo) => setSesion({ tipo: "staff", yo }),
      (e) =>
        setSesion(
          e instanceof ErrorApi && e.status === 403
            ? { tipo: "sin-acceso", mensaje: e.message }
            : e instanceof ErrorApi && e.status === 401
              ? { tipo: "anonimo" }
              : { tipo: "sin-acceso", mensaje: "No pudimos conectar con la API." },
        ),
    );
  }, []);
  useEffect(cargar, [cargar]);

  const salir = async () => {
    await auth.salir().catch(() => {});
    setSesion({ tipo: "anonimo" });
  };

  if (sesion.tipo === "cargando") return null;
  if (sesion.tipo === "anonimo") return <Login onIngreso={cargar} />;
  if (sesion.tipo === "sin-acceso")
    return (
      <div className="login">
        <div className="caja">
          <h1>Sin acceso</h1>
          <p className="nota">{sesion.mensaje}</p>
          <button className="secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );

  const { yo } = sesion;
  return (
    <div className="pagina">
      <header>
        <img src="/favicon.svg" alt="" width={32} height={32} />
        <h1>Panel editorial</h1>
        <nav>
          {(["mazos", "normas", ...(yo.rol === "admin" ? (["equipo"] as const) : [])] as Vista[]).map((v) => (
            <button key={v} className={`chip ${vista === v ? "activo" : ""}`} onClick={() => setVista(v)}>
              {v[0]!.toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>
        <span className="usuario nota">
          {yo.name || yo.email} · {ROLES[yo.rol]}
        </span>
        <button className="enlace" onClick={salir}>
          Salir
        </button>
      </header>
      {vista === "mazos" && <Mazos yo={yo} />}
      {vista === "normas" && <Normas yo={yo} />}
      {vista === "equipo" && <Equipo />}
    </div>
  );
}
