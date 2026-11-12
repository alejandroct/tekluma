import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  Platform,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { IconoBuscar, IconoCerrar, IconoChevron, IconoCompartir, IconoIndice, IconoPagina } from "@/components/Iconos";
import {
  abrirNorma,
  bloquesTexto,
  buscar,
  enlaceArticulo,
  esEncabezado,
  normalizar,
  patronTerminos,
  urlNorma,
  urlPagina,
  type ArticuloNorma,
  type CapituloNorma,
  type FiguraNorma,
  type Norma,
  type Resultado,
} from "@/lib/normas";
import { MONO, MONO_FUERTE, useTema, type Tema } from "@/lib/tema";

type Fila = { tipo: "cap"; cap: CapituloNorma } | { tipo: "pag"; p: number } | { tipo: "art"; art: ArticuloNorma };

/** Proporción de una página A4 del PDF (ancho / alto). */
const A4 = 595 / 842;

export default function LectorNorma() {
  const t = useTema();
  const { slug, articulo, q } = useLocalSearchParams<{ slug: string; articulo?: string; q?: string }>();
  const [norma, setNorma] = useState<Norma | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState(q ?? "");
  const [destacado, setDestacado] = useState<string | null>(articulo ?? null);
  const [resaltar, setResaltar] = useState<string[]>(() => (q ? normalizar(q).split(/\s+/) : []));
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [pagina, setPagina] = useState<number | null>(null);
  const [figura, setFigura] = useState<FiguraNorma | null>(null);
  const lista = useRef<FlatList<Fila>>(null);
  /** Destino del salto en curso, como posición en la norma completa (no cambia si se suman capítulos). */
  const saltoPendiente = useRef<number | null>(null);
  const intentosSalto = useRef(0);
  const desdeActual = useRef(0);

  useEffect(() => {
    abrirNorma(slug, setNorma)
      .then(setNorma)
      .catch(() => setError("No pudimos descargar la norma. Revisa tu conexión e inténtalo otra vez."));
  }, [slug]);

  // Filas: un encabezado por capítulo y luego sus artículos; los encabezados quedan fijos al hacer scroll.
  const { filas, posicion, fijas } = useMemo(() => {
    const filas: Fila[] = [];
    const posicion = new Map<string, number>();
    const fijas: number[] = [];
    if (!norma) return { filas, posicion, fijas };
    const caps = new Map(norma.capitulos.map((c) => [c.n, c]));
    let actual = "";
    let paginaActual = 0;
    for (const art of norma.articulos) {
      const cap = art.n.split(".")[0]!;
      if (cap !== actual && caps.has(cap)) {
        actual = cap;
        posicion.set(`cap:${cap}`, filas.length);
        fijas.push(filas.length);
        filas.push({ tipo: "cap", cap: caps.get(cap)! });
      }
      // Salto de hoja: marca dónde empieza cada página del PDF y la abre al tocarlo.
      if (art.p && art.p !== paginaActual) {
        paginaActual = art.p;
        filas.push({ tipo: "pag", p: art.p });
      }
      posicion.set(art.n, filas.length);
      filas.push({ tipo: "art", art });
    }
    return { filas, posicion, fijas };
  }, [norma]);

  const resultados = useMemo(() => (norma && consulta.trim().length > 0 ? buscar(norma, consulta) : null), [norma, consulta]);

  // La lista arranca en el capítulo del artículo pedido (el salto es inmediato aunque esté lejos)
  // y suma los capítulos anteriores a medida que el usuario sube.
  const [desde, setDesde] = useState(0);
  const [salto, setSalto] = useState<{ indice: number; vez: number } | null>(null);
  const datos = useMemo(() => filas.slice(desde), [filas, desde]);
  useEffect(() => {
    desdeActual.current = desde;
  }, [desde]);
  const fijasVisibles = useMemo(() => fijas.filter((i) => i >= desde).map((i) => i - desde), [fijas, desde]);

  const saltar = useCallback(
    (global: number) => {
      const capitulo = fijas.filter((i) => i <= global).pop() ?? 0;
      setDesde(capitulo);
      desdeActual.current = capitulo;
      saltoPendiente.current = global;
      intentosSalto.current = 0;
      setSalto({ indice: global - capitulo, vez: Date.now() });
    },
    [fijas],
  );

  useEffect(() => {
    if (!salto) return;
    const id = setTimeout(() => lista.current?.scrollToIndex({ index: salto.indice, viewPosition: 0, viewOffset: 52, animated: false }), 40);
    // Pasado el salto, ya se pueden sumar los capítulos de arriba.
    const fin = setTimeout(() => (saltoPendiente.current = null), 1500);
    return () => {
      clearTimeout(id);
      clearTimeout(fin);
    };
  }, [salto]);

  const irA = useCallback(
    (clave: string, terminos: string[] = []) => {
      const indice = posicion.get(clave);
      if (indice === undefined) return;
      Keyboard.dismiss();
      setConsulta("");
      setResaltar(terminos);
      if (!clave.startsWith("cap:")) setDestacado(clave);
      saltar(indice);
    },
    [posicion, saltar],
  );

  // Al abrir desde una cita (o si llega otra cita con el lector abierto), salta a ese artículo.
  const ultimoArticulo = useRef<string | null>(null);
  useEffect(() => {
    if (!norma || !articulo || ultimoArticulo.current === articulo) return;
    ultimoArticulo.current = articulo;
    const indice = posicion.get(articulo) ?? posicion.get(articulo.split(".").slice(0, -1).join("."));
    if (indice === undefined) return;
    const id = setTimeout(() => {
      setDestacado(articulo);
      saltar(indice);
    }, 0);
    return () => clearTimeout(id);
  }, [norma, articulo, posicion, saltar]);

  const alLlegarArriba = useCallback(() => {
    if (saltoPendiente.current !== null || desde === 0) return;
    setDesde(fijas.filter((i) => i < desde).pop() ?? 0);
  }, [desde, fijas]);

  // Las filas tienen alto variable: si el destino aún no se midió, se acerca y se reintenta.
  const alFallarSalto = useCallback(({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
    const destino = saltoPendiente.current;
    if (destino === null || destino - desdeActual.current !== index || intentosSalto.current++ > 25) return;
    lista.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
    setTimeout(() => {
      const actual = saltoPendiente.current;
      if (actual !== null) lista.current?.scrollToIndex({ index: actual - desdeActual.current, viewPosition: 0, viewOffset: 52, animated: false });
    }, 60);
  }, []);

  const compartir = useCallback(
    (art: ArticuloNorma) => {
      if (!norma) return;
      Haptics.selectionAsync();
      const texto = art.t.replace(/\s+/g, " ").trim();
      Share.share({
        message: `${norma.codigo} · Art. ${art.n}${art.e ? ` · ${art.e}` : ""}\n\n«${texto.length > 600 ? `${texto.slice(0, 600)}…` : texto}»\n\nLéelo completo en Tekluma: ${enlaceArticulo(slug, art.n)}`,
      }).catch(() => {});
    },
    [norma, slug],
  );

  const patron = useMemo(() => patronTerminos(resaltar), [resaltar]);

  const renderFila = useCallback(
    ({ item }: { item: Fila }) =>
      item.tipo === "cap" ? (
        <EncabezadoCapitulo cap={item.cap} t={t} />
      ) : item.tipo === "pag" ? (
        <SaltoPagina p={item.p} t={t} onPagina={setPagina} />
      ) : (
        <FilaArticulo
          art={item.art}
          slug={slug}
          t={t}
          destacado={item.art.n === destacado}
          patron={item.art.n === destacado ? patron : null}
          onPagina={setPagina}
          onFigura={setFigura}
          onCompartir={compartir}
        />
      ),
    [t, slug, destacado, patron, compartir],
  );

  const titulo = norma ? norma.codigo : "Norma";

  if (!norma) {
    return (
      <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
        <Stack.Screen options={{ title: titulo }} />
        {error ? (
          <Text style={{ color: t.textoSuave, fontSize: 16, textAlign: "center", padding: 32, lineHeight: 22 }}>{error}</Text>
        ) : (
          <>
            <ActivityIndicator color={t.ambar} />
            <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 12, letterSpacing: 1 }}>DESCARGANDO LA NORMA</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Stack.Screen
        options={{
          title: titulo,
          headerRight: () => (
            <Pressable onPress={() => setIndiceAbierto(true)} hitSlop={12} accessibilityLabel="Índice de capítulos">
              <IconoIndice tamano={22} color={t.texto} acento={t.ambar} />
            </Pressable>
          ),
        }}
      />
      <View style={[estilos.cabecera, { borderColor: t.borde }]}>
        <Text style={[estilos.rotuloNorma, { color: t.textoSuave }]} numberOfLines={1}>
          {norma.titulo.toUpperCase()} · {norma.dispositivo}
        </Text>
        <View style={[estilos.buscador, { backgroundColor: t.superficie, borderColor: consulta ? t.ambar : t.borde }]}>
          <IconoBuscar tamano={18} color={t.textoSuave} />
          <TextInput
            value={consulta}
            onChangeText={setConsulta}
            placeholder="Buscar: 21.6.4, gancho sísmico, recubrimiento…"
            placeholderTextColor={t.textoSuave}
            style={[estilos.campo, { color: t.texto }]}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={lista}
          data={datos}
          keyExtractor={(f) => (f.tipo === "cap" ? `cap-${f.cap.n}` : f.tipo === "pag" ? `pag-${f.p}` : f.art.n)}
          renderItem={renderFila}
          stickyHeaderIndices={fijasVisibles}
          onStartReached={alLlegarArriba}
          onStartReachedThreshold={1.5}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={15}
          onScrollToIndexFailed={alFallarSalto}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListFooterComponent={<PieNorma norma={norma} t={t} />}
        />
        {/* Los resultados van encima: la lista sigue montada y el salto al artículo es inmediato. */}
        {resultados && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: t.fondo }]}>
            <ListaResultados resultados={resultados} consulta={consulta} t={t} onElegir={(r) => irA(r.articulo.n, normalizar(consulta).split(/\s+/))} />
          </View>
        )}
      </View>

      <IndiceCapitulos
        visible={indiceAbierto}
        norma={norma}
        t={t}
        onCerrar={() => setIndiceAbierto(false)}
        onElegir={(c) => {
          setIndiceAbierto(false);
          irA(`cap:${c.n}`);
        }}
      />
      <VisorPagina slug={slug} total={norma.paginas} pagina={pagina} onCambiar={setPagina} />
      <VisorFigura slug={slug} figura={figura} onCerrar={() => setFigura(null)} />
    </View>
  );
}

// ───────── Filas ─────────

const EncabezadoCapitulo = memo(function EncabezadoCapitulo({ cap, t }: { cap: CapituloNorma; t: Tema }) {
  return (
    <View style={[estilos.capitulo, { backgroundColor: t.fondo, borderColor: t.borde }]}>
      <Text style={[estilos.capituloNumero, { color: t.ambar }]}>CAP. {cap.n.padStart(2, "0")}</Text>
      <Text style={[estilos.capituloTitulo, { color: t.texto }]} numberOfLines={1}>
        {cap.titulo}
      </Text>
    </View>
  );
});

const SaltoPagina = memo(function SaltoPagina({ p, t, onPagina }: { p: number; t: Tema; onPagina: (p: number) => void }) {
  return (
    <Pressable onPress={() => onPagina(p)} hitSlop={6} style={estilos.salto} accessibilityLabel={`Ver la página ${p} del PDF original`}>
      <View style={[estilos.saltoLinea, { backgroundColor: t.borde }]} />
      <View style={[estilos.chip, { borderColor: t.borde, backgroundColor: t.fondo }]}>
        <IconoPagina tamano={13} color={t.textoSuave} acento={t.ambar} />
        <Text style={[estilos.chipTexto, { color: t.textoSuave }]}>PÁG. {p}</Text>
      </View>
      <View style={[estilos.saltoLinea, { backgroundColor: t.borde }]} />
    </Pressable>
  );
});

type PropsFila = {
  art: ArticuloNorma;
  slug: string;
  t: Tema;
  destacado: boolean;
  patron: RegExp | null;
  onPagina: (p: number) => void;
  onFigura: (f: FiguraNorma) => void;
  onCompartir: (a: ArticuloNorma) => void;
};

const FilaArticulo = memo(function FilaArticulo({ art, slug, t, destacado, patron, onPagina, onFigura, onCompartir }: PropsFila) {
  const { width } = useWindowDimensions();
  if (esEncabezado(art)) {
    return (
      <View style={estilos.seccion}>
        <Text style={[estilos.seccionNumero, { color: t.ambar }]}>{art.n}</Text>
        <Text style={[estilos.seccionTitulo, { color: t.texto }]}>{art.e}</Text>
      </View>
    );
  }
  const anchoFigura = Math.min(width, 720) - 40;
  return (
    <Pressable onLongPress={() => onCompartir(art)} delayLongPress={350}>
      <View style={estilos.articulo}>
        {destacado && <Resaltado color={t.ambar} />}
        <View style={estilos.articuloCabeza}>
          <Text style={[estilos.articuloNumero, { color: t.ambar }]}>{art.n}</Text>
          {!!art.e && <Text style={[estilos.articuloEpigrafe, { color: t.texto }]}>{art.e}</Text>}
        </View>
        <TextoArticulo texto={art.t} patron={patron} t={t} />
        {art.f?.map((f) => (
          <Pressable key={f.src} onPress={() => onFigura(f)} style={[estilos.figura, { borderColor: t.borde }]}>
            <Image source={{ uri: urlNorma(slug, f.src) }} style={{ width: anchoFigura - 2, height: ((anchoFigura - 2) * f.h) / f.w }} resizeMode="contain" />
            <Text style={[estilos.figuraPie, { color: "#5B6B85" }]}>{f.pie}</Text>
          </Pressable>
        ))}
        <View style={estilos.articuloPie}>
          {destacado && !!art.p && (
            <Pressable onPress={() => onPagina(art.p!)} hitSlop={8} style={[estilos.chip, { borderColor: t.borde }]}>
              <IconoPagina tamano={14} color={t.textoSuave} acento={t.ambar} />
              <Text style={[estilos.chipTexto, { color: t.textoSuave }]}>VER PÁG. {art.p}</Text>
            </Pressable>
          )}
          {destacado && (
            <Pressable onPress={() => onCompartir(art)} hitSlop={8} style={[estilos.chip, { borderColor: t.borde }]}>
              <IconoCompartir tamano={14} color={t.textoSuave} />
              <Text style={[estilos.chipTexto, { color: t.textoSuave }]}>COMPARTIR</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
});

/** Barra ámbar a la izquierda y fondo cálido que se desvanece: «aquí está lo que buscabas». */
function Resaltado({ color }: { color: string }) {
  const barra = useSharedValue(0);
  const fondo = useSharedValue(0);
  useEffect(() => {
    barra.value = withTiming(1, { duration: 280 });
    fondo.value = withSequence(withTiming(0.2, { duration: 320 }), withDelay(1800, withTiming(0.07, { duration: 1400 })));
  }, [barra, fondo]);
  const estiloBarra = useAnimatedStyle(() => ({ opacity: barra.value }));
  const estiloFondo = useAnimatedStyle(() => ({ opacity: fondo.value }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, estiloFondo]} />
      <Animated.View pointerEvents="none" style={[estilos.barraDestacado, { backgroundColor: color }, estiloBarra]} />
    </>
  );
}

/** Párrafos, fórmulas numeradas (como en la hoja, con su número a la derecha) y tablas que se deslizan de lado. */
function TextoArticulo({ texto, patron, t }: { texto: string; patron: RegExp | null; t: Tema }) {
  const bloques = useMemo(() => bloquesTexto(texto), [texto]);
  return (
    <>
      {bloques.map((b, i) => {
        if (b.tipo === "parrafo") {
          return <TextoResaltado key={i} texto={b.texto} patron={patron} style={[estilos.articuloTexto, { color: t.texto }]} marca={t.ambar} />;
        }
        if (b.tipo === "formula") {
          return (
            <View key={i} style={[estilos.formula, { borderColor: t.borde, backgroundColor: t.superficie }]}>
              <TextoResaltado texto={b.expresion} patron={patron} style={[estilos.formulaTexto, { color: t.texto }]} marca={t.ambar} />
              <Text style={[estilos.formulaNumero, { color: t.ambar }]}>({b.numero})</Text>
            </View>
          );
        }
        const columnas = Math.max(...b.filas.map((f) => f.length));
        const anchos = Array.from({ length: columnas }, (_, c) =>
          // El ancho lo marcan las celdas del cuerpo; el encabezado (en mono, más largo) se parte en líneas.
          Math.min(230, Math.max(72, Math.min((b.filas[0]?.[c] ?? "").length, 16) * 7.5 + 22, ...b.filas.slice(1).map((f) => (f[c] ?? "").length * 7 + 22))),
        );
        return (
          <View key={i} style={estilos.tablaMarco}>
            {!!b.titulo && <Text style={[estilos.tablaTitulo, { color: t.textoSuave }]}>{b.titulo}</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[estilos.tabla, { borderColor: t.borde }]}>
              {b.filas.map((fila, f) => (
                <View key={f} style={[estilos.tablaFila, { borderColor: t.borde, borderTopWidth: f ? StyleSheet.hairlineWidth : 0, backgroundColor: f === 0 ? t.superficie : "transparent" }]}>
                  {anchos.map((ancho, c) => (
                    <View key={c} style={[estilos.tablaCelda, { width: ancho, borderColor: t.borde, borderLeftWidth: c ? StyleSheet.hairlineWidth : 0 }]}>
                      <TextoResaltado
                        texto={fila[c] ?? ""}
                        patron={patron}
                        style={[f === 0 ? estilos.tablaEncabezado : estilos.tablaTexto, { color: f === 0 ? t.textoSuave : t.texto }]}
                        marca={t.ambar}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
            </ScrollView>
          </View>
        );
      })}
    </>
  );
}

function TextoResaltado({ texto, patron, style, marca }: { texto: string; patron: RegExp | null; style: object; marca: string }) {
  if (!patron) return <Text style={style}>{texto}</Text>;
  const partes = texto.split(patron);
  return (
    <Text style={style}>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ backgroundColor: `${marca}40`, fontWeight: "700" }}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function PieNorma({ norma, t }: { norma: Norma; t: Tema }) {
  return (
    <View style={{ padding: 24, alignItems: "center", gap: 4 }}>
      <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 11, letterSpacing: 1, textAlign: "center" }}>
        {norma.codigo} · {norma.dispositivo}
      </Text>
      <Text style={{ color: t.textoSuave, fontSize: 12, textAlign: "center" }}>
        Texto digitalizado del documento oficial. Ante cualquier duda, manda la página original (PÁG.).
      </Text>
    </View>
  );
}

// ───────── Búsqueda ─────────

function ListaResultados({ resultados, consulta, t, onElegir }: { resultados: Resultado[]; consulta: string; t: Tema; onElegir: (r: Resultado) => void }) {
  const patron = useMemo(() => patronTerminos(normalizar(consulta).split(/\s+/)), [consulta]);
  return (
    <FlatList
      data={resultados}
      keyExtractor={(r) => r.articulo.n}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <Text style={[estilos.resultadosCuenta, { color: t.textoSuave }]}>
          {resultados.length === 0 ? "SIN RESULTADOS" : `${resultados.length}${resultados.length === 60 ? "+" : ""} ${resultados.length === 1 ? "ARTÍCULO" : "ARTÍCULOS"}`}
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ color: t.textoSuave, textAlign: "center", padding: 32, lineHeight: 21 }}>
          Prueba con otra palabra o con el número del artículo, por ejemplo 7.7.1.
        </Text>
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={index < 12 ? FadeInDown.delay(index * 25).duration(220) : undefined}>
          <Pressable
            onPress={() => onElegir(item)}
            style={({ pressed }) => [estilos.resultado, { borderColor: t.borde, backgroundColor: pressed ? t.superficie : "transparent" }]}
          >
            <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
              <Text style={[estilos.articuloNumero, { color: t.ambar }]}>{item.articulo.n}</Text>
              {!!item.articulo.e && (
                <Text style={{ color: t.texto, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                  {item.articulo.e}
                </Text>
              )}
              {!!item.articulo.p && <Text style={[estilos.chipTexto, { color: t.textoSuave }]}>PÁG. {item.articulo.p}</Text>}
            </View>
            <TextoResaltado texto={item.fragmento} patron={patron} style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20 }} marca={t.ambar} />
          </Pressable>
        </Animated.View>
      )}
    />
  );
}

// ───────── Índice ─────────

function IndiceCapitulos({
  visible,
  norma,
  t,
  onCerrar,
  onElegir,
}: {
  visible: boolean;
  norma: Norma;
  t: Tema;
  onCerrar: () => void;
  onElegir: (c: CapituloNorma) => void;
}) {
  const conteo = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of norma.articulos) {
      const c = a.n.split(".")[0]!;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [norma]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <View style={[estilos.hojaCabeza, { borderColor: t.borde }]}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.rotuloNorma, { color: t.ambar }]}>{norma.codigo} · ÍNDICE</Text>
            <Text style={{ color: t.texto, fontSize: 20, fontWeight: "700" }}>{norma.titulo}</Text>
          </View>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityLabel="Cerrar índice">
            <IconoCerrar tamano={22} color={t.texto} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {norma.capitulos.map((c) => (
            <Pressable
              key={c.n}
              onPress={() => onElegir(c)}
              style={({ pressed }) => [estilos.capituloIndice, { borderColor: t.borde, backgroundColor: pressed ? t.superficie : "transparent" }]}
            >
              <Text style={[estilos.capituloIndiceNumero, { color: t.ambar }]}>{c.n.padStart(2, "0")}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.texto, fontSize: 16, fontWeight: "600" }}>{c.titulo}</Text>
                <Text style={[estilos.chipTexto, { color: t.textoSuave }]}>
                  {conteo.get(c.n) ?? 0} ARTÍCULOS · PÁG. {c.p}
                </Text>
              </View>
              <IconoChevron tamano={18} color={t.textoSuave} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ───────── Página original y figuras ─────────

function VisorPagina({ slug, total, pagina, onCambiar }: { slug: string; total: number; pagina: number | null; onCambiar: (p: number | null) => void }) {
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const [cargada, setCargada] = useState<number | null>(null);
  const cargando = cargada !== pagina;
  return (
    <Modal visible={pagina !== null} animationType="fade" onRequestClose={() => onCambiar(null)}>
      <View style={[estilos.visor, { paddingTop: inset.top }]}>
        <View style={estilos.visorBarra}>
          <Text style={estilos.visorTitulo}>
            PÁG. {pagina} <Text style={{ color: "#5B6B85" }}>/ {total}</Text>
          </Text>
          <Pressable onPress={() => onCambiar(null)} hitSlop={12} accessibilityLabel="Cerrar página">
            <IconoCerrar tamano={22} color="#F6F5F2" />
          </Pressable>
        </View>
        {pagina !== null && (
          <ScrollView
            key={pagina}
            maximumZoomScale={4}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            contentContainerStyle={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Animated.View entering={FadeIn.duration(200)} style={{ width: width - 16, aspectRatio: A4, backgroundColor: "#FFFFFF" }}>
              <Image source={{ uri: urlPagina(slug, pagina) }} style={{ flex: 1 }} resizeMode="contain" onLoadEnd={() => setCargada(pagina)} />
              {cargando && <ActivityIndicator style={StyleSheet.absoluteFill} color="#FF8A1F" />}
            </Animated.View>
          </ScrollView>
        )}
        <View style={[estilos.visorNavegacion, { paddingBottom: inset.bottom + 12 }]}>
          <Pressable disabled={!pagina || pagina <= 1} onPress={() => pagina && onCambiar(pagina - 1)} style={[estilos.visorBoton, { opacity: pagina && pagina > 1 ? 1 : 0.35 }]}>
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconoChevron tamano={18} color="#F6F5F2" />
            </View>
            <Text style={estilos.visorBotonTexto}>Anterior</Text>
          </Pressable>
          <Text style={{ color: "#5B6B85", fontFamily: MONO, fontSize: 11, letterSpacing: 0.8 }}>PELLIZCA PARA AMPLIAR</Text>
          <Pressable disabled={!pagina || pagina >= total} onPress={() => pagina && onCambiar(pagina + 1)} style={[estilos.visorBoton, { opacity: pagina && pagina < total ? 1 : 0.35 }]}>
            <Text style={estilos.visorBotonTexto}>Siguiente</Text>
            <IconoChevron tamano={18} color="#F6F5F2" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function VisorFigura({ slug, figura, onCerrar }: { slug: string; figura: FiguraNorma | null; onCerrar: () => void }) {
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={!!figura} animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.visor, { paddingTop: inset.top }]}>
        <View style={estilos.visorBarra}>
          <Text style={[estilos.visorTitulo, { flex: 1 }]} numberOfLines={2}>
            {figura?.pie}
          </Text>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityLabel="Cerrar figura">
            <IconoCerrar tamano={22} color="#F6F5F2" />
          </Pressable>
        </View>
        {figura && (
          <ScrollView maximumZoomScale={5} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
            <View style={{ backgroundColor: "#FFFFFF", padding: 8 }}>
              <Image source={{ uri: urlNorma(slug, figura.src) }} style={{ width: width - 32, height: ((width - 32) * figura.h) / figura.w }} resizeMode="contain" />
            </View>
          </ScrollView>
        )}
        <Text style={{ color: "#5B6B85", fontFamily: MONO, fontSize: 11, letterSpacing: 0.8, textAlign: "center", paddingBottom: inset.bottom + 16 }}>
          PELLIZCA PARA AMPLIAR
        </Text>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  cabecera: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rotuloNorma: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2 },
  buscador: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  campo: { flex: 1, fontSize: 15, height: 44 },
  capitulo: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  capituloNumero: { fontFamily: MONO_FUERTE, fontSize: 12, letterSpacing: 1 },
  capituloTitulo: { flex: 1, fontSize: 15, fontWeight: "700" },
  seccion: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4, flexDirection: "row", gap: 10, alignItems: "baseline" },
  seccionNumero: { fontFamily: MONO_FUERTE, fontSize: 13 },
  seccionTitulo: { flex: 1, fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  articulo: { paddingHorizontal: 20, paddingVertical: 12, gap: 6, overflow: "hidden" },
  barraDestacado: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  articuloCabeza: { flexDirection: "row", gap: 10, alignItems: "baseline", flexWrap: "wrap" },
  articuloNumero: { fontFamily: MONO_FUERTE, fontSize: 13, letterSpacing: 0.3 },
  articuloEpigrafe: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  articuloTexto: { fontSize: 15.5, lineHeight: 23 },
  formula: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 2 },
  formulaTexto: { flex: 1, fontSize: 16.5, lineHeight: 24, fontStyle: "italic", fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontVariant: ["lining-nums"] },
  formulaNumero: { fontFamily: MONO, fontSize: 12 },
  tablaMarco: { marginVertical: 4, gap: 6 },
  tablaTitulo: { fontFamily: MONO, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },
  tabla: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, overflow: "hidden" },
  tablaFila: { flexDirection: "row" },
  tablaCelda: { paddingHorizontal: 9, paddingVertical: 7, justifyContent: "center" },
  tablaEncabezado: { fontFamily: MONO, fontSize: 11, lineHeight: 15, letterSpacing: 0.3 },
  tablaTexto: { fontSize: 14, lineHeight: 19 },
  articuloPie: { flexDirection: "row", gap: 8, marginTop: 2 },
  salto: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  saltoLinea: { flex: 1, height: StyleSheet.hairlineWidth },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  chipTexto: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 0.8 },
  figura: { marginTop: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, backgroundColor: "#FFFFFF", overflow: "hidden", alignSelf: "flex-start" },
  figuraPie: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 8, fontStyle: "italic" },
  resultadosCuenta: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  resultado: { paddingHorizontal: 20, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  hojaCabeza: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  capituloIndice: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  capituloIndiceNumero: { fontFamily: MONO_FUERTE, fontSize: 18, width: 30 },
  visor: { flex: 1, backgroundColor: "#0F1B2D" },
  visorBarra: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  visorTitulo: { color: "#F6F5F2", fontFamily: MONO_FUERTE, fontSize: 13, letterSpacing: 0.8 },
  visorNavegacion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 },
  visorBoton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 6 },
  visorBotonTexto: { color: "#F6F5F2", fontWeight: "600", fontSize: 15 },
});
