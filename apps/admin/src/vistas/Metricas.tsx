import { useEffect, useState } from "react";
import { NOMBRES_PROFESION, REGIONES, UNIVERSIDADES, type Profession } from "@tekluma/shared";
import { api, type Embudo as DatosEmbudo, type Metricas as DatosMetricas } from "../api";
import { MOTIVOS_MONEDAS } from "../etiquetas";
import { Aviso, EncabezadoPagina } from "../ui";
import { Barras, Cifra, numero, porcentaje, Reparto } from "./graficos";

const sinDato = "Sin indicar";
const nombreProfesion = (v: string | null) => (v ? (NOMBRES_PROFESION[v as Profession] ?? v) : sinDato);
const nombreRegion = (v: string | null) => (v ? ((REGIONES as Record<string, string>)[v] ?? v) : sinDato);
const nombreUniversidad = (v: string | null) => (v ? ((UNIVERSIDADES as Record<string, string>)[v] ?? v) : sinDato);

export function Metricas() {
  const [m, setM] = useState<DatosMetricas | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<DatosMetricas>("/editorial/metricas").then(setM, (e) => setError((e as Error).message));
  }, []);

  const t = m?.totales;
  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">05</span> Administración
          </>
        }
        titulo="Métricas"
        descripcion="Cómo crece y cuánto se usa Tekluma. Días en hora de Lima; un usuario está activo si ese día vio tarjetas, jugó la pregunta del día, sumó puntos o usó el cupo."
      />
      {error && <Aviso tono="error">{error}</Aviso>}
      {m && t && (
        <div className="metricas">
          <section className="cifras">
            <Cifra etiqueta="Usuarios" valor={numero(t.usuarios)} detalle={`${numero(t.conPerfil)} completaron su perfil`} />
            <Cifra etiqueta="Nuevos" valor={numero(t.nuevos7)} detalle={`hoy ${numero(t.nuevosHoy)} · 30 días ${numero(t.nuevos30)}`} />
            <Cifra etiqueta="Activos hoy" valor={numero(t.activosHoy)} detalle={`7 días ${numero(t.activos7)} · 30 días ${numero(t.activos30)}`} />
            <Cifra etiqueta="Premium" valor={numero(t.premium)} detalle={`${porcentaje(t.premium, t.usuarios)} de los usuarios`} />
            <Cifra etiqueta="Tarjetas vistas" valor={numero(t.tarjetas7)} detalle={`últimos 7 días · hoy ${numero(t.tarjetasHoy)}`} />
            <Cifra
              etiqueta="Pregunta del día"
              valor={numero(t.diariaHoy)}
              detalle={t.diariaHoy ? `jugaron hoy · ${porcentaje(t.diariaAciertosHoy, t.diariaHoy)} acertó` : "jugaron hoy"}
            />
            <Cifra etiqueta="Duelos" valor={numero(t.duelos7)} detalle={`creados en 7 días · ${numero(t.partidas7)} partidas`} />
            <Cifra etiqueta="Anuncios con premio" valor={numero(t.anuncios7)} detalle="vistos en 7 días" />
          </section>

          <Embudo />

          <section className="panel">
            <div className="panel-cab">
              <h2>Usuarios activos</h2>
              <span className="mono nota">últimos 30 días</span>
            </div>
            <div className="panel-cuerpo">
              <Barras dias={m.serie.map((d) => ({ dia: d.dia, valor: d.activos }))} unidad="activos" />
            </div>
          </section>

          <div className="metricas-doble">
            <section className="panel">
              <div className="panel-cab">
                <h2>Registros</h2>
                <span className="mono nota">últimos 30 días</span>
              </div>
              <div className="panel-cuerpo">
                <Barras dias={m.serie.map((d) => ({ dia: d.dia, valor: d.nuevos }))} unidad="registros" />
              </div>
            </section>
            <section className="panel">
              <div className="panel-cab">
                <h2>Tarjetas vistas</h2>
                <span className="mono nota">últimos 30 días</span>
              </div>
              <div className="panel-cuerpo">
                <Barras dias={m.serie.map((d) => ({ dia: d.dia, valor: d.tarjetas }))} unidad="tarjetas" />
              </div>
            </section>
          </div>

          <div className="metricas-doble">
            <section className="panel">
              <div className="panel-cab">
                <h2>Retención</h2>
                <span className="mono nota">registrados hace 8 a 37 días</span>
              </div>
              <div className="panel-cuerpo">
                {m.retencion.cohorte === 0 ? (
                  <p className="nota">Aún no hay usuarios con más de una semana: aparece cuando la app tenga 8 días publicada.</p>
                ) : (
                  <div className="cifras compactas">
                    <Cifra etiqueta="Volvieron al día 1" valor={porcentaje(m.retencion.d1, m.retencion.cohorte)} detalle={`${m.retencion.d1} de ${m.retencion.cohorte}`} />
                    <Cifra etiqueta="Volvieron al día 7" valor={porcentaje(m.retencion.d7, m.retencion.cohorte)} detalle={`${m.retencion.d7} de ${m.retencion.cohorte}`} />
                  </div>
                )}
              </div>
            </section>
            <section className="panel">
              <div className="panel-cab">
                <h2>Monedas</h2>
                <span className="mono nota">{numero(t.monedasEnCirculacion)} en circulación</span>
              </div>
              {m.monedas.length === 0 ? (
                <div className="panel-cuerpo">
                  <p className="nota">Sin movimientos en los últimos 30 días.</p>
                </div>
              ) : (
                <div className="tabla-envoltura">
                  <table>
                    <thead>
                      <tr>
                        <th>Motivo · 30 días</th>
                        <th className="num">Ganadas</th>
                        <th className="num">Gastadas</th>
                        <th className="num">Movimientos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.monedas.map((f) => (
                        <tr key={f.motivo}>
                          <td>{MOTIVOS_MONEDAS[f.motivo as keyof typeof MOTIVOS_MONEDAS] ?? f.motivo}</td>
                          <td className="num mono">{f.ganadas ? `+${numero(f.ganadas)}` : "—"}</td>
                          <td className="num mono">{f.gastadas ? `−${numero(f.gastadas)}` : "—"}</td>
                          <td className="num mono">{numero(f.movimientos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="metricas-triple">
            <section className="panel">
              <div className="panel-cab">
                <h2>Profesión</h2>
              </div>
              <div className="panel-cuerpo">
                <Reparto filas={m.profesiones} nombre={nombreProfesion} />
              </div>
            </section>
            <section className="panel">
              <div className="panel-cab">
                <h2>Región</h2>
              </div>
              <div className="panel-cuerpo">
                <Reparto filas={m.regiones} nombre={nombreRegion} />
              </div>
            </section>
            <section className="panel">
              <div className="panel-cab">
                <h2>Universidad</h2>
              </div>
              <div className="panel-cuerpo">
                <Reparto filas={m.universidades} nombre={nombreUniversidad} />
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

/** `base`: step the percentage is measured against when it is not the previous one (not every step is required). */
const PASOS: { clave: keyof DatosEmbudo; nombre: string; ayuda: string; base?: keyof DatosEmbudo }[] = [
  { clave: "primeraApertura", nombre: "Abrió la app", ayuda: "Primera vez que se abre en el dispositivo" },
  { clave: "tutorialVisto", nombre: "Terminó el tutorial", ayuda: "O lo saltó" },
  { clave: "codigoPedido", nombre: "Pidió el código", ayuda: "Escribió su correo" },
  { clave: "sesionIniciada", nombre: "Inició sesión", ayuda: "Escribió el código" },
  { clave: "perfilCompleto", nombre: "Completó su perfil", ayuda: "Nombre y profesión" },
  { clave: "primeraTarjeta", nombre: "Estudió una tarjeta", ayuda: "Al menos una" },
  { clave: "diezTarjetas", nombre: "10 tarjetas el primer día", ayuda: "El día de su registro" },
  { clave: "volvioDia1", nombre: "Volvió al día siguiente", ayuda: "Activo el día después del registro", base: "primeraTarjeta" },
  { clave: "premiumVisto", nombre: "Vio la pantalla Premium", ayuda: "Abrió la oferta" },
  { clave: "premiumComprado", nombre: "Compró Premium", ayuda: "Sin contar los regalados desde el panel" },
];

/** Activation funnel: where installs drop off, from first open to buying Premium. */
function Embudo() {
  const [dias, setDias] = useState(30);
  const [e, setE] = useState<DatosEmbudo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<DatosEmbudo>(`/editorial/metricas/embudo?dias=${dias}`).then(setE, (err) => setError((err as Error).message));
  }, [dias]);

  const total = e?.primeraApertura ?? 0;
  return (
    <section className="panel">
      <div className="panel-cab">
        <h2>Embudo de activación</h2>
        <select value={dias} onChange={(ev) => setDias(Number(ev.target.value))} aria-label="Periodo">
          <option value={7}>Instalaciones de 7 días</option>
          <option value={30}>Instalaciones de 30 días</option>
          <option value={90}>Instalaciones de 90 días</option>
        </select>
      </div>
      <div className="panel-cuerpo">
        {error && <Aviso tono="error">{error}</Aviso>}
        {e && total === 0 ? (
          <p className="nota">Aún no hay instalaciones en este periodo: el embudo se llena cuando la app esté publicada.</p>
        ) : (
          e && (
            <ol className="embudo">
              {PASOS.map((p, i) => {
                const n = e[p.clave];
                const anterior = i === 0 ? n : e[p.base ?? PASOS[i - 1]!.clave];
                return (
                  <li key={p.clave}>
                    <span className="embudo-nombre">
                      {p.nombre}
                      <span className="nota">{p.ayuda}</span>
                    </span>
                    <span className="reparto-barra">
                      <span style={{ width: `${(n / Math.max(1, total)) * 100}%` }} />
                    </span>
                    <span className="mono reparto-n">{numero(n)}</span>
                    <span className="mono embudo-paso" title={p.base ? "De quienes estudiaron una tarjeta" : "Del paso anterior"}>
                      {i === 0 ? "" : porcentaje(n, anterior)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )
        )}
      </div>
    </section>
  );
}
