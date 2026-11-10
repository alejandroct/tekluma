import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { obtenerCatalogo, type MazoConAcceso } from "@/lib/mazos";
import { useTema } from "@/lib/tema";

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
      contentContainerStyle={{ padding: 20, gap: 12 }}
      contentInsetAdjustmentBehavior="automatic"
      data={mazos ?? []}
      keyExtractor={(m) => m.id}
      refreshControl={<RefreshControl refreshing={cargando && mazos !== null} onRefresh={cargar} />}
      ListHeaderComponent={<Text style={[estilos.titulo, { color: t.texto }]}>Mazos</Text>}
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
          <View style={[estilos.codigo, { backgroundColor: item.abierto ? t.ambar : t.niebla }]}>
            <Text style={estilos.codigoTexto}>{item.normaCodigo}</Text>
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

function etiqueta(m: MazoConAcceso) {
  if (!m.abierto) return "Premium";
  if (m.desactualizado) return "Nueva versión disponible";
  if (m.descargado) return "Descargado";
  return m.acceso === "premium" ? "Premium" : "Incluido en tu cupo diario";
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  codigo: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  codigoTexto: { color: "#0F1B2D", fontWeight: "800" },
  nombre: { fontSize: 16, fontWeight: "700" },
  estado: { fontSize: 13, fontWeight: "600", marginTop: 2 },
});
