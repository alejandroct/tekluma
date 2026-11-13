import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, auth, ErrorApi, type Yo } from "./api";
import { ROLES } from "./etiquetas";
import { IconoCandado, IconoEditar, IconoEquipo, IconoImportar, IconoMazo, IconoMetricas, IconoNorma, IconoReclamos, IconoSalir, IconoUsuarios } from "./iconos";
import { Dialogo, Logo, pedir } from "./ui";
import { Equipo } from "./vistas/Equipo";
import { Importar } from "./vistas/Importar";
import { Login } from "./vistas/Login";
import { Metricas } from "./vistas/Metricas";
import { Mazos } from "./vistas/Mazos";
import { Normas } from "./vistas/Normas";
import { Reclamos } from "./vistas/Reclamos";
import { Usuarios } from "./vistas/Usuarios";
import "./App.css";

type Sesion = { tipo: "cargando" } | { tipo: "anonimo" } | { tipo: "sin-acceso"; mensaje: string } | { tipo: "staff"; yo: Yo };
type Vista = "mazos" | "normas" | "equipo" | "importar" | "reclamos" | "metricas" | "usuarios";

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

  const renombrarme = async () => {
    const nombre = await pedir({
      titulo: "Tu nombre",
      mensaje: "Así te verán en el equipo y como autor o revisor de las tarjetas.",
      accion: "Guardar",
      campo: { etiqueta: "Nombre y apellido", valor: yo.name ?? "", placeholder: "Nombre y apellido" },
    });
    if (typeof nombre !== "string") return;
    await api("/editorial/yo", { method: "PUT", body: { name: nombre } }).catch(() => {});
    cargar();
  };
  const admin: { vista: Vista; etiqueta: string; icono: ReactNode }[] = [
    { vista: "importar", etiqueta: "Importar", icono: <IconoImportar /> },
    { vista: "equipo", etiqueta: "Equipo", icono: <IconoEquipo /> },
    { vista: "reclamos", etiqueta: "Reclamos", icono: <IconoReclamos /> },
    { vista: "metricas", etiqueta: "Métricas", icono: <IconoMetricas /> },
    { vista: "usuarios", etiqueta: "Usuarios", icono: <IconoUsuarios /> },
  ];
  const enlaces = yo.rol === "admin" ? [...NAV, ...admin] : NAV;

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
          {NAV.map(item)}
          {yo.rol === "admin" && (
            <>
              <span className="rotulo nav-grupo">Administración</span>
              {admin.map(item)}
            </>
          )}
        </nav>
        <div className="usuario">
          <button className="usuario-nombre enlace-nombre" onClick={renombrarme} title="Editar tu nombre">
            <span>{yo.name || yo.email}</span>
            <IconoEditar tamano={14} />
          </button>
          {yo.name && <span className="usuario-correo">{yo.email}</span>}
          <span className="rol">{ROLES[yo.rol]}</span>
          <button className="boton fantasma boton-icono salir" onClick={salir} title="Salir" aria-label="Salir">
            <IconoSalir />
          </button>
        </div>
      </aside>
      <Dialogo />
      <div className="contenido">
        <div className="contenido-interior">
          {vista === "mazos" && <Mazos yo={yo} />}
          {vista === "normas" && <Normas yo={yo} />}
          {vista === "equipo" && <Equipo />}
          {vista === "importar" && <Importar />}
          {vista === "reclamos" && <Reclamos />}
          {vista === "metricas" && <Metricas />}
          {vista === "usuarios" && <Usuarios />}
        </div>
      </div>
    </div>
  );
}
