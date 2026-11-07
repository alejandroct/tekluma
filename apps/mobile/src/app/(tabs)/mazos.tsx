import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { mazoDemo } from "@/lib/demo";
import { useTema } from "@/lib/tema";

// TODO: reemplazar por GET /catalogo cuando la API esté desplegada.
const catalogo = [mazoDemo];

export default function Mazos() {
  const t = useTema();
  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      contentInsetAdjustmentBehavior="automatic"
      data={catalogo}
      keyExtractor={(m) => m.mazoId}
      ListHeaderComponent={<Text style={[estilos.titulo, { color: t.texto }]}>Mazos</Text>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/repaso/${item.mazoId}`)}
          style={({ pressed }) => [estilos.item, { backgroundColor: t.superficie, borderColor: t.borde, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={[estilos.codigo, { backgroundColor: t.ambar }]}>
            <Text style={estilos.codigoTexto}>{item.norma.codigo}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: t.texto }]}>{item.titulo}</Text>
            <Text style={{ color: t.textoSuave }}>
              {item.tarjetas.length} tarjetas · {item.norma.version}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  codigo: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  codigoTexto: { color: "#0F1B2D", fontWeight: "800" },
  nombre: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
});
