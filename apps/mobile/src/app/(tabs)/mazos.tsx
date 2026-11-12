import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { IconoChevron, IconoNorma } from "@/components/Iconos";
import { obtenerCatalogo, type MazoConAcceso } from "@/lib/mazos";
import { WEB_URL } from "@/lib/normas";
import { MONO, MONO_FUERTE, useTema, type Tema } from "@/lib/tema";

export default function Mazos() {
  const t = useTema();
  const [mazos, setMazos] = useState<MazoConAcceso[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMazos(await obtenerCatalogo());
      setError(null);
    } catch {
      setError("No pudimos cargar el catálogo. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const abrir = (m: MazoConAcceso) => router.push(m.abierto ? `/repaso/${m.id}` : "/premium");

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      data={mazos ?? []}
      keyExtractor={(m) => m.id}
      refreshControl={<RefreshControl refreshing={cargando && mazos !== null} onRefresh={cargar} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 8 }}>
          <Text style={[estilos.titulo, { color: t.texto }]}>Mazos</Text>
          <Normas t={t} />
        </View>
      }
      ListEmptyComponent={
        mazos === null && !error ? (
          <ActivityIndicator color={t.ambar} style={{ marginTop: 40 }} />
        ) : (
          <Text style={{ color: t.textoSuave, fontSize: 16 }}>{error ?? "Aún no hay mazos publicados."}</Text>
        )
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable
          onPress={() => abrir(item)}
          style={({ pressed }) => [estilos.item, { backgroundColor: t.superficie, borderColor: t.borde, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={[estilos.codigo, { borderColor: item.abierto ? t.texto : t.borde }]}>
            <Text style={[estilos.codigoTexto, { color: item.abierto ? t.texto : t.textoSuave }]}>{item.normaCodigo}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[estilos.nombre, { color: t.texto }]}>{item.titulo}</Text>
            <Text style={{ color: t.textoSuave }}>
              {item.totalTarjetas} tarjetas · {item.descripcion}
            </Text>
            <Text style={[estilos.estado, { color: item.abierto ? t.textoSuave : t.ambar }]}>{etiqueta(item)}</Text>
          </View>
        </Pressable>
        </Animated.View>
      )}
    />
  );
}

type NormaPublicada = { codigo: string; slug: string; titulo: string };

/** Acceso al lector de cada norma digitalizada: leerla completa y buscar dentro, sin conexión. */
function Normas({ t }: { t: Tema }) {
  const [normas, setNormas] = useState<NormaPublicada[]>([]);
  useEffect(() => {
    fetch(`${WEB_URL}/normas/index.json`)
      .then((r) => (r.ok ? (r.json() as Promise<NormaPublicada[]>) : []))
      .then(setNormas)
      .catch(() => {});
  }, []);
  return normas.map((n, i) => (
    <Animated.View key={n.slug} entering={FadeInDown.delay(i * 60).springify()}>
      <Pressable
        onPress={() => router.push({ pathname: "/norma/[slug]", params: { slug: n.slug } })}
        style={({ pressed }) => [estilos.norma, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={estilos.normaIcono}>
          <IconoNorma tamano={26} color="#F6F5F2" acento={t.ambar} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={estilos.normaRotulo}>LA NORMA COMPLETA · {n.codigo}</Text>
          <Text style={estilos.normaTitulo}>{n.titulo}</Text>
          <Text style={estilos.normaTexto}>Léela por capítulos y busca cualquier artículo, también sin conexión.</Text>
        </View>
        <IconoChevron tamano={18} color="#A9B7CC" />
      </Pressable>
    </Animated.View>
  ));
}

function etiqueta(m: MazoConAcceso) {
  if (!m.abierto) return "Premium";
  if (m.desactualizado) return "Nueva versión disponible";
  if (m.descargado) return "Descargado";
  return m.acceso === "premium" ? "Premium" : "Incluido en tu cupo diario";
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  codigo: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, minWidth: 64, alignItems: "center" },
  codigoTexto: { fontFamily: MONO_FUERTE, fontSize: 14 },
  nombre: { fontSize: 16, fontWeight: "700" },
  estado: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  norma: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 8, backgroundColor: "#0F1B2D", borderWidth: 1, borderColor: "#26364F" },
  normaIcono: { width: 48, height: 48, borderRadius: 6, borderWidth: 1, borderColor: "#3B5174", alignItems: "center", justifyContent: "center" },
  normaRotulo: { color: "#FF8A1F", fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2 },
  normaTitulo: { color: "#F6F5F2", fontSize: 17, fontWeight: "700" },
  normaTexto: { color: "#A9B7CC", fontSize: 13, lineHeight: 18 },
});
