import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { paquetesLocales } from "@/lib/mazos";
import { pendientes, sincronizar } from "@/lib/repaso";
import { useTema } from "@/lib/tema";

type Resumen = { mazoId: string; codigo: string; pendientes: number };

export default function Hoy() {
  const t = useTema();
  const [resumen, setResumen] = useState<Resumen[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      setResumen(
        paquetesLocales().map((p) => ({
          mazoId: p.mazoId,
          codigo: p.norma.codigo,
          pendientes: pendientes(p.mazoId, p.tarjetas.map((c) => c.id)).length,
        })),
      );
      // Sube el progreso en segundo plano; si no hay conexión se reintenta luego.
      sincronizar().catch(() => {});
    }, []),
  );

  const total = resumen?.reduce((s, r) => s + r.pendientes, 0) ?? 0;
  const siguiente = resumen?.find((r) => r.pendientes > 0);
  const sinMazos = resumen !== null && resumen.length === 0;

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.saludo, { color: t.textoSuave }]}>Hoy</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>Que la norma fragüe.</Text>

      <View style={[estilos.tarjeta, { backgroundColor: t.navy }]}>
        <Text style={estilos.numero}>{total}</Text>
        <Text style={estilos.etiqueta}>{sinMazos ? "Aún no tienes mazos descargados" : "tarjetas por repasar"}</Text>
        <Pressable
          disabled={!sinMazos && !siguiente}
          onPress={() => (sinMazos ? router.push("/mazos") : siguiente && router.push(`/repaso/${siguiente.mazoId}`))}
          style={({ pressed }) => [estilos.boton, { backgroundColor: t.ambar, opacity: pressed ? 0.8 : 1 }, !sinMazos && !siguiente && estilos.botonInactivo]}
        >
          <Text style={[estilos.botonTexto, !sinMazos && !siguiente && { color: t.niebla }]}>
            {sinMazos ? "Elegir un mazo" : siguiente ? `Repasar ${siguiente.codigo}` : "¡Al día!"}
          </Text>
        </Pressable>
      </View>

      {resumen && resumen.length > 1 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {resumen.map((r) => (
            <Pressable
              key={r.mazoId}
              disabled={r.pendientes === 0}
              onPress={() => router.push(`/repaso/${r.mazoId}`)}
              style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
            >
              <Text style={{ color: t.texto, fontSize: 16, fontWeight: "700" }}>{r.codigo}</Text>
              <Text style={{ color: r.pendientes ? t.ambar : t.textoSuave, fontSize: 16, fontWeight: "700" }}>{r.pendientes}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  botonInactivo: { backgroundColor: "#26364F" },
  botonTexto: { color: "#0F1B2D", fontSize: 17, fontWeight: "700" },
  fila: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
});
