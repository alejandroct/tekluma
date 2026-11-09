import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { EstadoCupo } from "@tekluma/shared";
import { verAnuncioConRecompensa } from "@/lib/anuncios";
import { authClient } from "@/lib/auth";
import { ampliarConMonedas } from "@/lib/cupo";
import { useTema } from "@/lib/tema";

type Props = { estado: EstadoCupo; onAmpliado: (estado: EstadoCupo) => void };

/** Se muestra cuando se acaba el cupo diario: anuncio, monedas o Premium. */
export function CupoAgotado({ estado, onAmpliado }: Props) {
  const t = useTema();
  const { data: sesion } = authClient.useSession();
  const [ocupado, setOcupado] = useState<"anuncio" | "monedas" | null>(null);
  const { reglas } = estado;
  const anunciosRestantes = Math.max(0, reglas.maxAnunciosDia - estado.anunciosVistos);
  const alcanzanMonedas = estado.monedas >= reglas.tarjetasPorCompraMonedas;

  const verAnuncio = async () => {
    if (!sesion) return;
    setOcupado("anuncio");
    try {
      const nuevo = await verAnuncioConRecompensa(sesion.user.id);
      if (nuevo) onAmpliado(nuevo);
    } catch {
      Alert.alert("No hay anuncios disponibles", "Inténtalo de nuevo en un momento.");
    } finally {
      setOcupado(null);
    }
  };

  const usarMonedas = async () => {
    setOcupado("monedas");
    try {
      const { ampliado, estado: nuevo } = await ampliarConMonedas();
      if (ampliado) onAmpliado(nuevo);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.emoji}>⏳</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>Llegaste a tu cupo de hoy</Text>
      <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>
        Repasaste {estado.usadas} tarjetas. Vuelve mañana o sigue ahora:
      </Text>

      <Pressable
        disabled={anunciosRestantes === 0 || ocupado !== null}
        onPress={verAnuncio}
        style={({ pressed }) => [estilos.opcion, { backgroundColor: t.navy, opacity: anunciosRestantes === 0 ? 0.4 : pressed ? 0.85 : 1 }]}
      >
        {ocupado === "anuncio" ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={estilos.opcionTitulo}>▶︎ Ver un anuncio · +{reglas.tarjetasPorAnuncio} tarjetas</Text>
            <Text style={estilos.opcionDetalle}>
              {anunciosRestantes > 0 ? `Te quedan ${anunciosRestantes} anuncios hoy` : "Ya viste todos los anuncios de hoy"}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        disabled={!alcanzanMonedas || ocupado !== null}
        onPress={usarMonedas}
        style={({ pressed }) => [
          estilos.opcion,
          { backgroundColor: t.superficie, borderColor: t.borde, borderWidth: 1, opacity: !alcanzanMonedas ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        {ocupado === "monedas" ? (
          <ActivityIndicator color={t.ambar} />
        ) : (
          <>
            <Text style={[estilos.opcionTitulo, { color: t.texto }]}>🪙 Usar {reglas.tarjetasPorCompraMonedas} monedas · +{reglas.tarjetasPorCompraMonedas} tarjetas</Text>
            <Text style={[estilos.opcionDetalle, { color: t.textoSuave }]}>Tienes {estado.monedas} monedas</Text>
          </>
        )}
      </Pressable>

      <Pressable onPress={() => router.push("/premium")} style={({ pressed }) => [estilos.opcion, { backgroundColor: t.ambar, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[estilos.opcionTitulo, { color: t.navy }]}>★ Tekluma Premium · sin límites</Text>
        <Text style={[estilos.opcionDetalle, { color: t.navy }]}>Prueba 7 días gratis</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 12, paddingTop: 12 },
  emoji: { fontSize: 44 },
  titulo: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitulo: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  opcion: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, gap: 4, minHeight: 72, justifyContent: "center" },
  opcionTitulo: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  opcionDetalle: { color: "#A9B7CC", fontSize: 14 },
});
