import { useEffect, useState, type ReactNode } from "react";
import { DIVISIONES, NOMBRES_PROFESION, REGIONES, UNIVERSIDADES, type Profession } from "@tekluma/shared";
import { api, type FichaUsuario, type ListaUsuarios } from "../api";
import { MOTIVOS_MONEDAS, ROLES } from "../etiquetas";
import { IconoBuscar } from "../iconos";
import { Aviso, EncabezadoPagina, Vacio } from "../ui";
import { Barras, Cifra, numero, porcentaje } from "./graficos";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric" });
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
/** A Lima calendar day (YYYY-MM-DD), shown like the other dates. */
const dia = (d: string) => fecha(`${d}T12:00:00-05:00`);
const esPremium = (hasta: string | null) => !!hasta && new Date(hasta) > new Date();

const PROVEEDORES: Record<string, string> = { apple: "Apple", google: "Google" };
const ORDENES = { recientes: "Más recientes", actividad: "Última actividad", puntos: "Más puntos", monedas: "Más monedas" } as const;
const FILTROS = { todos: "Todos", activos7: "Activos en 7 días", premium: "Premium", equipo: "Equipo editorial" } as const;

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <span className="rotulo">{etiqueta}</span>
      <span>{children ?? "—"}</span>
    </div>
  );
}

export function Usuarios() {
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<keyof typeof ORDENES>("recientes");
  const [filtro, setFiltro] = useState<keyof typeof FILTROS>("todos");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<ListaUsuarios | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Searches after a short pause while typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const p = new URLSearchParams({ orden, filtro, pagina: String(pagina), ...(q.trim() ? { q: q.trim() } : {}) });
    api<ListaUsuarios>(`/editorial/usuarios?${p}`).then(setLista, (e) => setError((e as Error).message));
  }, [q, orden, filtro, pagina]);

  const paginas = lista ? Math.max(1, Math.ceil(lista.total / lista.porPagina)) : 1;

  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">06</span> Administración
          </>
        }
        titulo="Usuarios"
        descripcion="Cuentas registradas en la app y la web, con su progreso, monedas y actividad. Solo lectura."
      />
      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="reclamos usuarios">
        <section className="panel">
          <div className="panel-cab filtros-usuarios">
            <h2>{lista ? `${numero(lista.total)} ${lista.total === 1 ? "usuario" : "usuarios"}` : "Usuarios"}</h2>
            <select value={filtro} onChange={(e) => (setFiltro(e.target.value as keyof typeof FILTROS), setPagina(1))} aria-label="Filtro">
              {Object.entries(FILTROS).map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
            <select value={orden} onChange={(e) => (setOrden(e.target.value as keyof typeof ORDENES), setPagina(1))} aria-label="Orden">
              {Object.entries(ORDENES).map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
            <label className="buscador">
              <IconoBuscar tamano={16} />
              <input type="search" placeholder="Correo o nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar usuario" />
            </label>
          </div>
          {lista && lista.usuarios.length === 0 ? (
            <Vacio>Ningún usuario coincide.</Vacio>
          ) : (
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Alta</th>
                    <th>Última actividad</th>
                    <th className="num">Tarjetas</th>
                    <th className="num">Puntos</th>
                    <th className="num">Monedas</th>
                  </tr>
                </thead>
                <tbody>
                  {lista?.usuarios.map((u) => (
                    <tr key={u.id} className={`clic ${u.id === elegido ? "seleccionada" : ""}`} onClick={() => setElegido(u.id)}>
                      <td>
                        <div className="celda-usuario">
                          <span className="celda-titulo">
                            {u.name || <span className="nota">Sin nombre</span>}
                            {esPremium(u.premiumUntil) && <span className="etiqueta-plana premium">Premium</span>}
                            {u.staffRole && <span className="etiqueta-plana">{ROLES[u.staffRole]}</span>}
                          </span>
                          <span className="nota">{u.email}</span>
                        </div>
                      </td>
                      <td className="nowrap">{fecha(u.createdAt)}</td>
                      <td className="nowrap">{u.ultima ? dia(u.ultima) : "—"}</td>
                      <td className="num mono">{numero(u.tarjetas)}</td>
                      <td className="num mono">{numero(u.puntos)}</td>
                      <td className="num mono">{numero(u.monedas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {paginas > 1 && (
            <div className="panel-pie">
              <span className="espacio mono nota">
                Página {pagina} de {paginas}
              </span>
              <button className="boton" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </button>
              <button className="boton" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
                Siguiente
              </button>
            </div>
          )}
        </section>

        {elegido ? (
          <Ficha id={elegido} />
        ) : (
          <section className="panel">
            <Vacio>Elige un usuario para ver su ficha.</Vacio>
          </section>
        )}
      </div>
    </>
  );
}

function Ficha({ id }: { id: string }) {
  const [f, setF] = useState<FichaUsuario | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setF(null);
    setError(null);
    api<FichaUsuario>(`/editorial/usuarios/${id}`).then(setF, (e) => setError((e as Error).message));
  }, [id]);

  if (error)
    return (
      <section className="panel">
        <div className="panel-cuerpo">
          <Aviso tono="error">{error}</Aviso>
        </div>
      </section>
    );
  if (!f)
    return (
      <section className="panel">
        <Vacio>Cargando…</Vacio>
      </section>
    );

  const { usuario: u, acceso, progreso: p, juego: j } = f;
  const division = DIVISIONES.find((d) => d.codigo === j.division);
  const diasActivos = f.serie.filter((d) => d.activo).length;

  return (
    <section className="panel ficha-usuario">
      <div className="panel-cab">
        <h2>{u.name || u.email}</h2>
        {esPremium(u.premiumUntil) ? <span className="estado estado-published">Premium</span> : <span className="estado estado-draft">Gratis</span>}
      </div>
      <div className="panel-cuerpo">
        <div className="datos">
          <Dato etiqueta="Correo">
            <a href={`mailto:${u.email}`}>{u.email}</a>
          </Dato>
          <Dato etiqueta="Alta">{fechaHora(u.createdAt)}</Dato>
          <Dato etiqueta="Último acceso">
            {acceso.ultimaSesion ? `${fechaHora(acceso.ultimaSesion)}${acceso.plataforma ? ` · ${acceso.plataforma}` : ""}` : null}
          </Dato>
          <Dato etiqueta="Entra con">{["Código por correo", ...acceso.proveedores.map((x) => PROVEEDORES[x] ?? x)].join(" · ")}</Dato>
          <Dato etiqueta="Profesión">{u.profession ? (NOMBRES_PROFESION[u.profession as Profession] ?? u.profession) : null}</Dato>
          <Dato etiqueta="Universidad">{u.university ? ((UNIVERSIDADES as Record<string, string>)[u.university] ?? u.university) : null}</Dato>
          <Dato etiqueta="Región">{u.region ? ((REGIONES as Record<string, string>)[u.region] ?? u.region) : null}</Dato>
          <Dato etiqueta="Premium">{esPremium(u.premiumUntil) ? `hasta el ${fecha(u.premiumUntil!)}` : u.premiumUntil ? `venció el ${fecha(u.premiumUntil)}` : "Nunca"}</Dato>
        </div>

        <div className="cifras compactas">
          <Cifra etiqueta="Monedas" valor={numero(f.monedas)} detalle={`${j.anuncios} anuncios con premio`} />
          <Cifra etiqueta="Racha de check-in" valor={`${f.racha} d`} />
          <Cifra etiqueta="Puntos de obra" valor={numero(j.puntosSemana)} detalle={`esta semana · ${numero(j.puntosTotal)} en total`} />
          <Cifra etiqueta="División" valor={division ? `${division.emoji} ${division.nombre}` : "—"} detalle={division ? "esta semana" : "no jugó esta semana"} />
        </div>

        <div className="texto-reclamo">
          <span className="rotulo">Actividad · {diasActivos} de 30 días activo</span>
          <Barras dias={f.serie.map((d) => ({ dia: d.dia, valor: d.tarjetas }))} unidad="tarjetas" />
        </div>

        <div className="texto-reclamo">
          <span className="rotulo">Estudio</span>
          <div className="cifras compactas">
            <Cifra etiqueta="Tarjetas estudiadas" valor={numero(p.tarjetas)} detalle={p.ultimoRepaso ? `último repaso ${fecha(p.ultimoRepaso)}` : undefined} />
            <Cifra etiqueta="Dominadas" valor={numero(p.dominadas)} detalle={`${numero(p.aprendiendo)} aprendiendo`} />
            <Cifra etiqueta="Por repasar" valor={numero(p.pendientes)} detalle="vencidas hoy" />
            <Cifra etiqueta="Repasos" valor={numero(p.repasos)} detalle={`${numero(p.olvidos)} olvidos`} />
          </div>
          <Dato etiqueta="Cupo de hoy">
            {f.cupoHoy.usadas} de {f.cupoHoy.limite} tarjetas{f.cupoHoy.anuncios ? ` · ${f.cupoHoy.anuncios} anuncios` : ""}
          </Dato>
          {f.mazos.length > 0 && (
            <ul className="reparto">
              {f.mazos.map((m) => (
                <li key={m.mazo}>
                  <span className="reparto-nombre">{m.mazo}</span>
                  <span className="reparto-barra">
                    <span style={{ width: `${(m.dominadas / Math.max(1, m.tarjetas)) * 100}%` }} />
                  </span>
                  <span className="mono reparto-n">
                    {m.dominadas}/{m.tarjetas}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="texto-reclamo">
          <span className="rotulo">Juego</span>
          <div className="datos">
            <Dato etiqueta="Pregunta del día">
              {j.diariaJugadas} jugadas · {porcentaje(j.diariaAciertos, j.diariaJugadas)} de acierto
            </Dato>
            <Dato etiqueta="Duelos">
              {j.duelosCreados} creados · {j.duelosJugados} jugados
            </Dato>
          </div>
        </div>

        <div className="texto-reclamo">
          <span className="rotulo">Movimientos de monedas</span>
          {f.movimientos.length === 0 ? (
            <p className="nota">Sin movimientos.</p>
          ) : (
            <div className="tabla-envoltura">
              <table>
                <tbody>
                  {f.movimientos.map((m, i) => (
                    <tr key={i}>
                      <td className="nowrap">{fechaHora(m.fecha)}</td>
                      <td>{MOTIVOS_MONEDAS[m.motivo as keyof typeof MOTIVOS_MONEDAS] ?? m.motivo}</td>
                      <td className={`num mono ${m.monto < 0 ? "negativo" : "positivo"}`}>{m.monto > 0 ? `+${m.monto}` : `−${-m.monto}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
