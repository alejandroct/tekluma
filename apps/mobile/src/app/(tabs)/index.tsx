import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { mazoDemo } from "@/lib/demo";
import { pendientes } from "@/lib/repaso";
import { useTema } from "@/lib/tema";

export default function Hoy() {
  const t = useTema();
  const [porRepasar, setPorRepasar] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setPorRepasar(pendientes(mazoDemo.mazoId, mazoDemo.tarjetas.map((c) => c.id)).length);
    }, []),
  );

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.saludo, { color: t.textoSuave }]}>Hoy</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>Que la norma fragüe.</Text>

      <View style={[estilos.tarjeta, { backgroundColor: t.navy }]}>
        <Text style={estilos.numero}>{porRepasar}</Text>
        <Text style={estilos.etiqueta}>tarjetas por repasar</Text>
        <Pressable
          disabled={porRepasar === 0}
          onPress={() => router.push(`/repaso/${mazoDemo.mazoId}`)}
          style={({ pressed }) => [estilos.boton, { backgroundColor: t.ambar, opacity: porRepasar === 0 ? 0.4 : pressed ? 0.8 : 1 }]}
        >
          <Text style={estilos.botonTexto}>{porRepasar === 0 ? "¡Al día!" : "Empezar repaso"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, gap: 8 },
  saludo: { fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 16 },
  tarjeta: { borderRadius: 24, padding: 24, gap: 4 },
  numero: { color: "#FFFFFF", fontSize: 56, fontWeight: "800", fontVariant: ["tabular-nums"] },
  etiqueta: { color: "#A9B7CC", fontSize: 16, marginBottom: 20 },
  boton: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  botonTexto: { color: "#0F1B2D", fontSize: 17, fontWeight: "700" },
});
