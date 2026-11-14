"""Marca las tarjetas corregidas para que, al importar, reemplacen a la versión anterior.

Uso: reemplazos.py <ref-de-git> <archivo.json> [...]     (p. ej. reemplazos.py main contenido/e060/1*.json)

Compara cada archivo con su versión en <ref> (lo que ya está importado), tarjeta por tarjeta y en el
mismo orden. A cada tarjeta cuyo contenido cambió le agrega en `reemplaza` la huella del contenido
anterior; el importador (apps/api/src/importacion.ts) actualiza esa tarjeta en su sitio en lugar de
crear otra. Por eso no se pueden agregar, quitar ni reordenar tarjetas en medio de un mazo: las
nuevas van al final.

La huella debe ser idéntica a `huella` de apps/api/src/util.ts: los primeros 16 hex del SHA-256 del
JSON canónico (claves ordenadas, sin espacios) del contenido.
"""
import hashlib, json, subprocess, sys


def canonico(v):
    if isinstance(v, list):
        return "[" + ",".join(canonico(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonico(v[k]) for k in sorted(v)) + "}"
    if isinstance(v, float) and v.is_integer():
        v = int(v)  # JSON.stringify escribe 3, no 3.0
    return json.dumps(v, ensure_ascii=False)


def huella(contenido):
    return hashlib.sha256(canonico(contenido).encode("utf-8")).hexdigest()[:16]


def marcar(ref, ruta):
    raiz = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True).stdout.strip()
    relativa = subprocess.run(["git", "ls-files", "--full-name", ruta], capture_output=True, text=True, check=True).stdout.strip()
    antes = json.loads(subprocess.run(["git", "show", f"{ref}:{relativa}"], capture_output=True, text=True, check=True, cwd=raiz).stdout)
    ahora = json.load(open(ruta, encoding="utf-8"))
    viejos = {m["slug"]: m["tarjetas"] for m in antes["mazos"]}
    cambiadas = 0
    for mazo in ahora["mazos"]:
        previas = viejos.get(mazo["slug"], [])
        assert len(mazo["tarjetas"]) >= len(previas), f"{ruta}: el mazo «{mazo['slug']}» perdió tarjetas respecto a {ref}"
        for vieja, nueva in zip(previas, mazo["tarjetas"]):
            h = huella(vieja["contenido"])
            if h == huella(nueva["contenido"]):
                continue
            cambiadas += 1
            if h not in nueva.get("reemplaza", []):
                nueva["reemplaza"] = nueva.get("reemplaza", []) + [h]
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(ahora, f, ensure_ascii=False, indent=1)
    print(f"{ruta}: {cambiadas} tarjetas reemplazan a su versión de {ref}")


if __name__ == "__main__":
    for ruta in sys.argv[2:]:
        marcar(sys.argv[1], ruta)
