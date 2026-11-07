import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTema } from "@/lib/tema";

export default function Perfil() {
  const t = useTema();
  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 20, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.titulo, { color: t.texto }]}>Perfil</Text>
      <View style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={{ color: t.texto, fontSize: 16 }}>Monedas</Text>
        <Text style={{ color: t.ambar, fontSize: 16, fontWeight: "800" }}>0</Text>
      </View>
      <View style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={{ color: t.texto, fontSize: 16 }}>Plan</Text>
        <Text style={{ color: t.textoSuave, fontSize: 16 }}>Gratis</Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
  fila: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
});
