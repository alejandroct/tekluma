import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { EstadoCupo } from "@tekluma/shared";
import { authClient } from "@/lib/auth";
import { cupoEnCache, obtenerCupo } from "@/lib/cupo";
import { useTema } from "@/lib/tema";

export default function Perfil() {
  const t = useTema();
  const { data: sesion } = authClient.useSession();
  const [cupo, setCupo] = useState<EstadoCupo | null>(cupoEnCache);

  useFocusEffect(
    useCallback(() => {
      obtenerCupo()
        .then(setCupo)
        .catch(() => {});
    }, []),
  );

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 20, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.titulo, { color: t.texto }]}>Perfil</Text>
      <Text style={{ color: t.textoSuave, fontSize: 15, marginBottom: 4 }}>{sesion?.user.email}</Text>
      <View style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={{ color: t.texto, fontSize: 16 }}>Monedas</Text>
        <Text style={{ color: t.ambar, fontSize: 16, fontWeight: "800" }}>{cupo?.monedas ?? "—"}</Text>
      </View>
      <View style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={{ color: t.texto, fontSize: 16 }}>Plan</Text>
        <Text style={{ color: cupo?.premium ? t.ambar : t.textoSuave, fontSize: 16, fontWeight: cupo?.premium ? "800" : "400" }}>
          {cupo?.premium ? "★ Premium" : "Gratis"}
        </Text>
      </View>
      {!cupo?.premium && (
        <Pressable onPress={() => router.push("/premium")} style={({ pressed }) => [estilos.premium, { backgroundColor: t.ambar, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ color: t.navy, fontSize: 16, fontWeight: "800" }}>★ Hazte Premium · 7 días gratis</Text>
        </Pressable>
      )}
      <Pressable onPress={() => authClient.signOut()} style={({ pressed }) => [estilos.salir, { borderColor: t.borde, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: "#D64545", fontSize: 16, fontWeight: "600" }}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  fila: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  premium: { padding: 16, borderRadius: 16, alignItems: "center" },
  salir: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: "center" },
});
