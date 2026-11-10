import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { ResumenDuelo } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { crearDuelo, misDuelos, normasDuelo } from "@/lib/duelos";
import { useTema } from "@/lib/tema";

/** Elegir norma y crear un duelo; abajo, los duelos recientes con su marcador. */
export default function NuevoDuelo() {
  const t = useTema();
  const [normas, setNormas] = useState<string[] | null>(null);
  const [norma, setNorma] = useState<string | undefined>(undefined);
  const [recientes, setRecientes] = useState<ResumenDuelo[]>([]);
  const [creando, setCreando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      normasDuelo()
        .then(setNormas)
        .catch(() => setNormas([]));
      misDuelos()
        .then(setRecientes)
        .catch(() => {});
    }, []),
  );

  const crear = async () => {
    setCreando(true);
    try {
      const duelo = await crearDuelo(norma);
      router.replace(`/duelo/${duelo.codigo}`);
    } catch {
      Alert.alert("No pudimos crear el duelo", "Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCreando(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenido}>
      <Text style={{ fontSize: 44 }}>⚔️</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>Reta a un colega</Text>
      <Text style={[estilos.texto, { color: t.textoSuave }]}>
        Responde 5 preguntas, un intento cada una. Luego envía el reto por WhatsApp: tu colega lo juega sin instalar nada y ven quién sabe más.
      </Text>

      <Text style={[estilos.etiqueta, { color: t.texto }]}>¿De qué norma?</Text>
      {normas === null ? (
        <ActivityIndicator color={t.ambar} />
      ) : (
        <View style={estilos.chips}>
          {[undefined, ...normas].map((n) => {
            const activa = n === norma;
            return (
              <Pressable
                key={n ?? "mixto"}
                onPress={() => setNorma(n)}
                style={[estilos.chip, { backgroundColor: activa ? t.ambar : t.superficie, borderColor: activa ? t.ambar : t.borde }]}
              >
                <Text style={{ color: activa ? t.navy : t.texto, fontWeight: activa ? "800" : "600", fontSize: 15 }}>{n ?? "Mixto (todo el RNE)"}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <BotonVivo disabled={creando} onPress={crear} style={[estilos.boton, { backgroundColor: t.ambar }]}>
        {creando ? <ActivityIndicator color={t.navy} /> : <Text style={[estilos.botonTexto, { color: t.navy }]}>Empezar duelo</Text>}
      </BotonVivo>

      {recientes.length > 0 && (
        <View style={{ gap: 8, marginTop: 16 }}>
          <Text style={[estilos.etiqueta, { color: t.texto }]}>Tus duelos</Text>
          {recientes.map((d, i) => {
            const gano = d.misAciertos !== null && d.mejorRival && d.misAciertos > d.mejorRival.aciertos;
            const perdio = d.misAciertos !== null && d.mejorRival && d.misAciertos < d.mejorRival.aciertos;
            return (
              <Animated.View key={d.codigo} entering={FadeInDown.delay(i * 50)}>
                <Pressable
                  onPress={() => router.push(`/duelo/${d.codigo}`)}
                  style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
                >
                  <Text style={{ fontSize: 22 }}>{d.misAciertos === null ? "⏳" : gano ? "🏆" : perdio ? "💪" : "⚔️"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.texto, fontWeight: "700", fontSize: 16 }}>
                      {d.norma} · {d.misAciertos === null ? "sin jugar" : `${d.misAciertos}/5`}
                    </Text>
                    <Text style={{ color: t.textoSuave, fontSize: 14 }}>
                      {d.mejorRival
                        ? `vs ${d.mejorRival.nombre}: ${d.mejorRival.aciertos}/5${d.rivales > 1 ? ` · ${d.rivales} rivales` : ""}`
                        : "Aún nadie aceptó el reto"}
                    </Text>
                  </View>
                  <Text style={{ color: t.ambar, fontSize: 20, fontWeight: "800" }}>›</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 24, gap: 12, paddingBottom: 48 },
  titulo: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  texto: { fontSize: 16, lineHeight: 22 },
  etiqueta: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  boton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12, minHeight: 54, justifyContent: "center" },
  botonTexto: { fontSize: 17, fontWeight: "800" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
});
