import { useCallback, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { EstadoCupo } from "@tekluma/shared";
import { authClient } from "@/lib/auth";
import { cerrarSesion, eliminarCuenta } from "@/lib/cuenta";
import { cupoEnCache, obtenerCupo } from "@/lib/cupo";
import { NOMBRES_PROFESION } from "@/lib/profesiones";
import type { Profession } from "@tekluma/shared";
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

  const confirmarEliminacion = () => {
    const aviso = cupo?.premium
      ? "\n\nTu suscripción Premium NO se cancela sola: cancélala en la configuración de tu tienda para que no se renueve."
      : "";
    Alert.alert(
      "¿Eliminar tu cuenta?",
      `Se borrarán para siempre tu progreso, tus monedas y tus datos. Esta acción no se puede deshacer.${aviso}`,
      [
        { text: "Cancelar", style: "cancel" },
        ...(cupo?.premium
          ? [{
              text: "Gestionar suscripción",
              onPress: () =>
                Linking.openURL(Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions"),
            }]
          : []),
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            eliminarCuenta().catch((e: Error) => Alert.alert("No se pudo eliminar", e.message)),
        },
      ],
    );
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 20, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.titulo, { color: t.texto }]}>Perfil</Text>
      <View style={{ gap: 2, marginBottom: 4 }}>
        <Text style={{ color: t.texto, fontSize: 18, fontWeight: "700" }}>{sesion?.user.name}</Text>
        <Text style={{ color: t.textoSuave, fontSize: 15 }}>
          {[sesion?.user.profession && NOMBRES_PROFESION[sesion.user.profession as Profession], sesion?.user.email].filter(Boolean).join(" · ")}
        </Text>
      </View>
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
      <Pressable onPress={() =>
          cerrarSesion().catch(() =>
            Alert.alert("Sin conexión", "Conéctate a internet para guardar tu progreso antes de cerrar sesión."),
          )
        } style={({ pressed }) => [estilos.salir, { borderColor: t.borde, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: "#D64545", fontSize: 16, fontWeight: "600" }}>Cerrar sesión</Text>
      </Pressable>
      <Pressable onPress={confirmarEliminacion} hitSlop={8} style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ color: t.textoSuave, fontSize: 14, textDecorationLine: "underline" }}>Eliminar mi cuenta</Text>
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
