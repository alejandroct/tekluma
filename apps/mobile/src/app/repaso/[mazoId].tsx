import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Grade } from "ts-fsrs";
import { Tarjeta } from "@/components/Tarjeta";
import { mazoDemo } from "@/lib/demo";
import { calificar, pendientes, Rating } from "@/lib/repaso";
import { useTema } from "@/lib/tema";

const NOTAS: { nota: Grade; texto: string; color: string }[] = [
  { nota: Rating.Again, texto: "Otra vez", color: "#D64545" },
  { nota: Rating.Hard, texto: "Difícil", color: "#3B5174" },
  { nota: Rating.Good, texto: "Bien", color: "#1F9D55" },
  { nota: Rating.Easy, texto: "Fácil", color: "#FF8A1F" },
];

export default function Repaso() {
  const t = useTema();
  const { mazoId } = useLocalSearchParams<{ mazoId: string }>();
  // TODO: cargar el paquete descargado (SQLite/archivo) en vez del mazo demo.
  const mazo = mazoDemo;
  const [cola, setCola] = useState(() => pendientes(mazoId, mazo.tarjetas.map((c) => c.id)));
  const [revelada, setRevelada] = useState(false);

  const actual = mazo.tarjetas.find((c) => c.id === cola[0]);

  if (!actual) {
    return (
      <View style={[estilos.fin, { backgroundColor: t.fondo }]}>
        <Text style={[estilos.finTitulo, { color: t.texto }]}>¡Sesión completa!</Text>
        <Pressable onPress={() => router.back()} style={[estilos.finBoton, { backgroundColor: t.ambar }]}>
          <Text style={{ color: t.navy, fontWeight: "800", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const responder = (nota: Grade) => {
    Haptics.selectionAsync();
    calificar(mazoId, actual.id, nota);
    // "Otra vez" la reinserta al final de la sesión.
    setCola(([, ...resto]) => (nota === Rating.Again ? [...resto, actual.id] : resto));
    setRevelada(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: t.textoSuave, fontWeight: "600" }}>
          {mazo.norma.codigo} · quedan {cola.length}
        </Text>
        <Tarjeta key={`${actual.id}-${cola.length}`} contenido={actual.contenido} revelada={revelada} onRevelar={() => setRevelada(true)} />
      </ScrollView>
      {revelada && (
        <View style={[estilos.notas, { borderColor: t.borde, backgroundColor: t.superficie }]}>
          {NOTAS.map((n) => (
            <Pressable key={n.texto} onPress={() => responder(n.nota)} style={({ pressed }) => [estilos.nota, { backgroundColor: n.color, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={estilos.notaTexto}>{n.texto}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  notas: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nota: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  notaTexto: { color: "#FFFFFF", fontWeight: "700" },
  fin: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  finTitulo: { fontSize: 26, fontWeight: "800" },
  finBoton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
});
