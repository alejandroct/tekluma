# Generar mazos de una norma con Claude

Guía para producir, capítulo por capítulo, archivos que se cargan en el panel editorial → **Importar**.

## 1. Qué pedirle a Claude

Adjunta el PDF de la norma (o solo las páginas del capítulo) y pega este pedido, cambiando lo que está entre corchetes:

> Lee una por una, como imagen, las páginas [27 a 31] de la norma [E.060 Concreto Armado, DS N° 010-2009-VIVIENDA] (Capítulo [4]).
> Genera un archivo JSON con el formato `tekluma-mazos/1` que describo abajo, con:
> - `articulos`: cada artículo numerado del capítulo, con su texto **literal** (sin resumir) y la `pagina` del PDF donde aparece.
> - Un mazo con slug `[e060-c04-durabilidad]` y tarjetas de varios tipos para **cada concepto importante** (al menos dos tipos distintos por concepto):
>   `concepto`, `opcion_multiple`, `completar`, `tabla` (para tablas de la norma), `caso_numerico` (para fórmulas, con valores realistas) e `imagen` cuando haya figuras.
> - Cada tarjeta debe citar su artículo con un extracto literal. Nunca inventes valores: si algo no se lee bien, márcalo en `explicacion` con «VERIFICAR».
> - Escribe las fórmulas en texto claro (√, ≤, φ, ℓ) y respeta la coma decimal de la norma.
> Devuélveme solo el JSON.

Para capítulos largos, pide el JSON por bloques de páginas y únelos.

## 2. Formato

```json
{
  "formato": "tekluma-mazos/1",
  "norma": { "codigo": "E.060", "titulo": "Concreto Armado", "disciplina": "structures",
             "dispositivo": "DS N° 010-2009-VIVIENDA", "publicadaEn": "2009-05-09" },
  "fuente": "Norma E.060 (DS N° 010-2009-VIVIENDA), PDF oficial",
  "articulos": [
    { "numero": "7.1.2", "texto": "Un doblez de 90º más una extensión de 12 db hasta el extremo libre de la barra.", "pagina": 46 }
  ],
  "mazos": [{
    "slug": "e060-c07-detalles-refuerzo",
    "titulo": "E.060 · Cap. 7 · Detalles del refuerzo",
    "descripcion": "Ganchos, doblado, recubrimientos…",
    "acceso": "free",
    "tarjetas": [
      { "contenido": { "tipo": "completar", "texto": "Gancho de 90°: extensión de {{12 db}} al extremo libre." },
        "citas": [{ "articulo": "7.1.2", "extracto": "Un doblez de 90º más una extensión de 12 db…" }] }
    ]
  }]
}
```

Tipos de tarjeta (`contenido`):

| Tipo | Campos |
|---|---|
| `concepto` | `pregunta`, `respuesta`, `explicacion?`, `imagenUrl?` |
| `opcion_multiple` | `pregunta`, `opciones` (2 a 6), `correcta` (índice desde 0), `explicacion?` |
| `completar` | `texto` con **un** hueco `{{respuesta}}` |
| `tabla` | `titulo`, `columnas`, `filas: [{ etiqueta, valores }]`, `pregunta: { fila, columna }` (índices desde 0) |
| `caso_numerico` | `enunciado` con `{X}`, `variables: { X: { etiqueta, valores: [..], unidad? } }`, `formula` (+ − × ÷, `^`, `sqrt()`), `unidadResultado?`, `tolerancia` (0,02 = 2 %) |
| `imagen` | `pregunta`, `imagenUrl`, `respuesta` |

Las figuras van como `imagenUrl` con la imagen embebida (`data:image/jpeg;base64,…`), recortada del PDF original; así viajan cifradas dentro del mazo. Si Claude no puede producir la imagen, deja la tarjeta sin `imagenUrl` y pide el recorte después (ver `contenido/e060/herramientas/figuras.py`).

## 3. Cargar

1. Panel → **Importar** → «Elegir archivos» (puedes elegir varios).
2. El panel valida cada archivo antes de enviar: muestra artículos, mazos, tarjetas por tipo y los errores con su ubicación exacta.
3. Elige cómo entran las tarjetas: **En revisión** (recomendado), **Borrador** o **Aprobar al importar** (solo si ya las revisaste: quedan firmadas por ti).
4. «Importar». Las tarjetas repetidas se omiten, así que puedes corregir un archivo y volver a importarlo.
5. En **Mazos**, revisa y publica la versión. Recién entonces llega a la app.
