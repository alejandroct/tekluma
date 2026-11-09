import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { PaqueteMazo } from "@tekluma/shared";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Grade } from "ts-fsrs";
import { Tarjeta } from "@/components/Tarjeta";
import { descargarPaquete, paqueteLocal } from "@/lib/mazos";
import { calificar, pendientes, Rating, sincronizar } from "@/lib/repaso";
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
  const [mazo, setMazo] = useState<PaqueteMazo | null>(() => paqueteLocal(mazoId));
  const [error, setError] = useState<string | null>(null);
  const [cola, setCola] = useState<string[]>(() => (mazo ? pendientes(mazoId, mazo.tarjetas.map((c) => c.id)) : []));
  const [revelada, setRevelada] = useState(false);

  // Primera vez que se abre el mazo: se descarga y queda disponible sin conexión.
  useEffect(() => {
    if (mazo) return;
    descargarPaquete(mazoId)
      .then((p) => {
        setMazo(p);
        setCola(pendientes(mazoId, p.tarjetas.map((c) => c.id)));
      })
      .catch(() => setError("No pudimos descargar el mazo. Revisa tu conexión."));
  }, [mazo, mazoId]);

  // Al salir del repaso se sube el progreso.
  useEffect(() => () => void sincronizar().catch(() => {}), []);

  if (!mazo) {
    return (
      <View style={[estilos.fin, { backgroundColor: t.fondo }]}>
        {error ? <Text style={{ color: t.textoSuave, fontSize: 16, textAlign: "center", padding: 24 }}>{error}</Text> : <ActivityIndicator color={t.ambar} />}
      </View>
    );
  }

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
        {revelada &&
          actual.citas.map((c) => (
            <View key={c.articuloId} style={[estilos.cita, { backgroundColor: t.superficie, borderColor: t.borde }]}>
              <Text style={[estilos.citaArticulo, { color: t.ambar }]}>
                {mazo.norma.codigo} · Art. {c.articulo}
              </Text>
              <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20 }}>{c.extracto}</Text>
            </View>
          ))}
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
  cita: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 4 },
  citaArticulo: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  fin: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  finTitulo: { fontSize: 26, fontWeight: "800" },
  finBoton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
});
