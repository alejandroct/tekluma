import { useState, type ChangeEvent } from "react";
import { importacionSchema, type Importacion, type ResultadoImportacion } from "@tekluma/shared";
import { api } from "../api";
import { IconoImportar } from "../iconos";
import { Aviso, EncabezadoPagina, Vacio } from "../ui";

type Archivo = {
  nombre: string;
  tamano: number;
  datos?: Importacion;
  errores?: string[];
  resultado?: ResultadoImportacion;
  fallo?: string;
};

type Estado = "in_review" | "draft" | "approved";

const ESTADOS: { valor: Estado; titulo: string; detalle: string }[] = [
  { valor: "in_review", titulo: "En revisión", detalle: "Otra persona del equipo las revisa antes de publicar." },
  { valor: "draft", titulo: "Borrador", detalle: "Quedan para editar antes de enviarlas a revisión." },
  { valor: "approved", titulo: "Aprobar al importar", detalle: "Solo si ya revisaste el contenido: quedarán firmadas por ti y listas para publicar." },
];

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function resumenTipos(d: Importacion) {
  const tipos = new Map<string, number>();
  for (const m of d.mazos) for (const t of m.tarjetas) tipos.set(t.contenido.tipo, (tipos.get(t.contenido.tipo) ?? 0) + 1);
  return [...tipos].map(([t, n]) => `${n} ${t.replace("_", " ")}`).join(" · ");
}

/** Carga masiva de capítulos de norma: artículos con su página y mazos con sus tarjetas. */
export function Importar() {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [estado, setEstado] = useState<Estado>("in_review");
  const [importando, setImportando] = useState(false);

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const lista = [...(e.target.files ?? [])];
    e.target.value = "";
    const leidos = await Promise.all(
      lista.map(async (f): Promise<Archivo> => {
        try {
          const r = importacionSchema.safeParse(JSON.parse(await f.text()));
          return r.success
            ? { nombre: f.name, tamano: f.size, datos: r.data }
            : { nombre: f.name, tamano: f.size, errores: r.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`) };
        } catch (err) {
          return { nombre: f.name, tamano: f.size, errores: [`No es un JSON válido: ${(err as Error).message}`] };
        }
      }),
    );
    setArchivos((previos) => [...previos.filter((p) => !leidos.some((l) => l.nombre === p.nombre)), ...leidos]);
  };

  const validos = archivos.filter((a) => a.datos && !a.resultado);

  const importarTodo = async () => {
    setImportando(true);
    for (const a of validos) {
      try {
        const resultado = await api<ResultadoImportacion>("/editorial/importar", { body: { archivo: a.datos, estado } });
        setArchivos((xs) => xs.map((x) => (x.nombre === a.nombre ? { ...x, resultado, fallo: undefined } : x)));
      } catch (err) {
        setArchivos((xs) => xs.map((x) => (x.nombre === a.nombre ? { ...x, fallo: (err as Error).message } : x)));
      }
    }
    setImportando(false);
  };

  return (
    <>
      <EncabezadoPagina
        rotulo={
          <>
            <span className="n">04</span> Administración
          </>
        }
        titulo="Importar"
        descripcion="Carga capítulos de una norma en archivos JSON (formato tekluma-mazos/1): artículos con su texto literal y página, y mazos con sus tarjetas."
        acciones={
          <label className="boton primario">
            <IconoImportar tamano={16} /> Elegir archivos
            <input type="file" accept="application/json,.json" multiple onChange={elegir} hidden />
          </label>
        }
      />

      <section className="panel">
        <div className="panel-cab">
          <h2>
            <span className="rotulo">01</span> Archivos
          </h2>
          <span className="mono nota">{archivos.length}</span>
        </div>
        {archivos.length === 0 ? (
          <Vacio>Elige uno o varios archivos .json (uno por capítulo). Nada se guarda hasta que pulses «Importar».</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Norma</th>
                  <th className="num">Artículos</th>
                  <th>Mazos y tarjetas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {archivos.map((a) => (
                  <tr key={a.nombre}>
                    <td>
                      <div className="celda-titulo">{a.nombre}</div>
                      <div className="mono nota">{kb(a.tamano)}</div>
                    </td>
                    <td className="mono">{a.datos?.norma.codigo ?? "—"}</td>
                    <td className="num">{a.datos?.articulos.length ?? "—"}</td>
                    <td>
                      {a.datos ? (
                        <>
                          {a.datos.mazos.map((m) => (
                            <div key={m.slug}>
                              <span className="celda-titulo">{m.titulo}</span> <span className="mono nota">{m.tarjetas.length}</span>
                            </div>
                          ))}
                          <div className="nota">{resumenTipos(a.datos)}</div>
                        </>
                      ) : (
                        <ul className="lista-errores">
                          {a.errores?.map((e) => (
                            <li key={e} className="mono">
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      {a.resultado ? (
                        <span className="estado estado-approved">
                          +{a.resultado.mazos.reduce((s, m) => s + m.tarjetasNuevas, 0)} tarjetas · {a.resultado.articulos.creados + a.resultado.articulos.actualizados} art.
                        </span>
                      ) : a.fallo ? (
                        <span className="estado estado-rechazada" title={a.fallo}>
                          Error
                        </span>
                      ) : a.datos ? (
                        <span className="estado estado-draft">Listo</span>
                      ) : (
                        <span className="estado estado-rechazada">Inválido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {archivos.some((a) => a.fallo) && (
        <Aviso tono="error" titulo="Algunos archivos no se importaron">
          {archivos
            .filter((a) => a.fallo)
            .map((a) => (
              <div key={a.nombre}>
                <span className="mono">{a.nombre}</span>: {a.fallo}
              </div>
            ))}
        </Aviso>
      )}

      {archivos.some((a) => a.resultado) && (
        <Aviso tono="ok" titulo="Importación hecha">
          Los mazos aparecen en «Mazos». Las tarjetas repetidas (mismo contenido) se omiten, así que puedes volver a importar un archivo corregido sin duplicar.
        </Aviso>
      )}

      <section className="panel">
        <div className="panel-cab">
          <h2>
            <span className="rotulo">02</span> Las tarjetas entran como
          </h2>
        </div>
        <div className="panel-cuerpo opciones-estado">
          {ESTADOS.map((e) => (
            <label key={e.valor} className={`opcion-estado ${estado === e.valor ? "activa" : ""}`}>
              <input type="radio" name="estado" checked={estado === e.valor} onChange={() => setEstado(e.valor)} />
              <span>
                <strong>{e.titulo}</strong>
                <span className="nota">{e.detalle}</span>
              </span>
            </label>
          ))}
          <button className="boton primario" disabled={importando || validos.length === 0} onClick={importarTodo}>
            <IconoImportar tamano={16} /> {importando ? "Importando…" : `Importar ${validos.length} ${validos.length === 1 ? "archivo" : "archivos"}`}
          </button>
        </div>
      </section>
    </>
  );
}
