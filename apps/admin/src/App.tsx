import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, auth, ErrorApi, type Yo } from "./api";
import { ROLES } from "./etiquetas";
import { IconoCandado, IconoEquipo, IconoMazo, IconoNorma, IconoSalir } from "./iconos";
import { Logo } from "./ui";
import { Equipo } from "./vistas/Equipo";
import { Login } from "./vistas/Login";
import { Mazos } from "./vistas/Mazos";
import { Normas } from "./vistas/Normas";
import "./App.css";

type Sesion = { tipo: "cargando" } | { tipo: "anonimo" } | { tipo: "sin-acceso"; mensaje: string } | { tipo: "staff"; yo: Yo };
type Vista = "mazos" | "normas" | "equipo";

const NAV: { vista: Vista; etiqueta: string; icono: ReactNode }[] = [
  { vista: "mazos", etiqueta: "Mazos", icono: <IconoMazo /> },
  { vista: "normas", etiqueta: "Normas", icono: <IconoNorma /> },
];

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
      <div className="acceso">
        <div className="acceso-marco">
          <div className="acceso-panel">
            <div className="acceso-cab">
              <Logo alto={24} />
            </div>
            <div className="acceso-cuerpo">
              <div className="sin-acceso-icono">
                <IconoCandado />
              </div>
              <div className="acceso-titulos">
                <span className="rotulo">Panel editorial · Acceso restringido</span>
                <h1>Sin acceso</h1>
                <p className="encabezado-desc">{sesion.mensaje}</p>
              </div>
              <button className="boton secundario" onClick={salir}>
                <IconoSalir tamano={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
          <div className="acceso-pie">
            <span>Tekluma</span>
            <span>RNE · Equipo editorial</span>
          </div>
        </div>
      </div>
    );

  const { yo } = sesion;
  const enlaces = yo.rol === "admin" ? [...NAV, { vista: "equipo" as const, etiqueta: "Equipo", icono: <IconoEquipo /> }] : NAV;

  const item = (n: (typeof enlaces)[number]) => (
    <button
      key={n.vista}
      className={`nav-item ${vista === n.vista ? "activo" : ""}`}
      aria-current={vista === n.vista ? "page" : undefined}
      onClick={() => setVista(n.vista)}
    >
      {n.icono}
      <span>{n.etiqueta}</span>
    </button>
  );

  return (
    <div className="app">
      <aside className="lateral">
        <div className="lateral-marca">
          <Logo alto={22} />
          <span className="rotulo">Panel editorial</span>
        </div>
        <nav className="nav" aria-label="Secciones">
          <span className="rotulo nav-grupo">Contenido</span>
          {enlaces.filter((n) => n.vista !== "equipo").map(item)}
          {yo.rol === "admin" && (
            <>
              <span className="rotulo nav-grupo">Administración</span>
              {enlaces.filter((n) => n.vista === "equipo").map(item)}
            </>
          )}
        </nav>
        <div className="usuario">
          <span className="usuario-nombre">{yo.name || yo.email}</span>
          {yo.name && <span className="usuario-correo">{yo.email}</span>}
          <span className="rol">{ROLES[yo.rol]}</span>
          <button className="boton fantasma boton-icono salir" onClick={salir} title="Salir" aria-label="Salir">
            <IconoSalir />
          </button>
        </div>
      </aside>
      <div className="contenido">
        <div className="contenido-interior">
          {vista === "mazos" && <Mazos yo={yo} />}
          {vista === "normas" && <Normas yo={yo} />}
          {vista === "equipo" && <Equipo />}
        </div>
      </div>
    </div>
  );
}
