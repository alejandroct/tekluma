import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import type { EstadoRecompensas } from "@tekluma/shared";
import { BotonVivo, GananciaFlotante, NumeroAnimado, Rebote } from "@/components/Animaciones";
import { verAnuncioConRecompensa } from "@/lib/anuncios";
import { authClient } from "@/lib/auth";
import { ampliarConMonedas, hacerCheckIn, obtenerRecompensas } from "@/lib/cupo";
import { sonarMoneda } from "@/lib/sonidos";
import { useTema } from "@/lib/tema";

/** Monedas: check-in diario con racha, anuncios para ganar monedas y canje por tarjetas extra. */
export default function Recompensas() {
  const t = useTema();
  const { data: sesion } = authClient.useSession();
  const [estado, setEstado] = useState<EstadoRecompensas | null>(null);
  const [ocupado, setOcupado] = useState<"check-in" | "anuncio" | "canje" | null>(null);
  const [ganancia, setGanancia] = useState<{ id: number; monedas: number } | null>(null);

  const celebrar = (monedas: number) => {
    sonarMoneda();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGanancia({ id: Date.now(), monedas });
  };

  const cargar = useCallback(() => {
    obtenerRecompensas()
      .then(setEstado)
      .catch(() => {});
  }, []);
  useFocusEffect(cargar);

  if (!estado) {
    return (
      <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
        <ActivityIndicator color={t.ambar} />
      </View>
    );
  }

  const { reglas, checkIn } = estado;
  const anunciosRestantes = Math.max(0, reglas.maxAnunciosMonedasDia - estado.anunciosMonedasVistos);
  // Posición dentro del ciclo de 7 días: los ya ganados quedan marcados.
  const ciclo = reglas.checkIn.length;
  const enCiclo = checkIn.racha === 0 ? 0 : ((checkIn.racha - 1) % ciclo) + 1;

  const reclamar = async () => {
    setOcupado("check-in");
    try {
      const { otorgadas, estado: nuevo } = await hacerCheckIn();
      setEstado(nuevo);
      if (otorgadas > 0) celebrar(otorgadas);
    } finally {
      setOcupado(null);
    }
  };

  const verAnuncio = async () => {
    if (!sesion) return;
    setOcupado("anuncio");
    try {
      if (await verAnuncioConRecompensa(sesion.user.id, "monedas")) {
        celebrar(reglas.monedasPorAnuncio);
        cargar();
      }
    } catch {
      Alert.alert("No hay anuncios disponibles", "Inténtalo de nuevo en un momento.");
    } finally {
      setOcupado(null);
    }
  };

  const canjear = async () => {
    setOcupado("canje");
    try {
      const { ampliado } = await ampliarConMonedas();
      if (ampliado) Alert.alert("¡Listo!", `Sumaste ${reglas.tarjetasPorCompraMonedas} tarjetas a tu cupo de hoy.`);
      cargar();
    } finally {
      setOcupado(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={estilos.contenedor}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
    >
      <Text style={[estilos.titulo, { color: t.texto }]}>Recompensas</Text>

      <Rebote disparo={ganancia?.id} style={[estilos.saldo, { backgroundColor: t.navy }]}>
        <Text style={estilos.saldoEtiqueta}>Tus monedas</Text>
        <NumeroAnimado valor={estado.monedas} prefijo="🪙 " style={estilos.saldoNumero} />
        <Text style={estilos.saldoAyuda}>1 moneda = 1 tarjeta extra para hoy</Text>
        {ganancia && <GananciaFlotante key={ganancia.id} texto={`+${ganancia.monedas}`} color={t.ambar} />}
      </Rebote>

      <Animated.View entering={FadeInDown.delay(70).springify()} style={[estilos.tarjeta, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={[estilos.seccion, { color: t.texto }]}>Check-in diario</Text>
        <Text style={{ color: t.textoSuave, fontSize: 14 }}>
          {checkIn.racha > 0 ? `Racha de ${checkIn.racha} ${checkIn.racha === 1 ? "día" : "días"} 🔥` : "Entra cada día para subir tu premio"}
        </Text>
        <View style={estilos.dias}>
          {reglas.checkIn.map((monedas, i) => {
            const ganado = i < enCiclo;
            const hoy = !checkIn.hechoHoy && i === enCiclo % ciclo;
            return (
              <View
                key={i}
                style={[
                  estilos.dia,
                  { borderColor: hoy ? t.ambar : t.borde, backgroundColor: ganado ? t.ambar : t.fondo, borderWidth: hoy ? 2 : 1 },
                ]}
              >
                <Text style={{ fontSize: 11, color: ganado ? t.navy : t.textoSuave }}>Día {i + 1}</Text>
                {ganado ? (
                  <Animated.Text entering={ZoomIn.springify()} style={{ fontSize: 15, fontWeight: "800", color: t.navy }}>
                    ✓
                  </Animated.Text>
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "800", color: t.texto }}>+{monedas}</Text>
                )}
              </View>
            );
          })}
        </View>
        <BotonVivo
          disabled={checkIn.hechoHoy || ocupado !== null}
          onPress={reclamar}
          style={[estilos.boton, { backgroundColor: t.ambar, opacity: checkIn.hechoHoy ? 0.45 : 1 }]}
        >
          {ocupado === "check-in" ? (
            <ActivityIndicator color={t.navy} />
          ) : (
            <Text style={[estilos.botonTexto, { color: t.navy }]}>
              {checkIn.hechoHoy ? `Vuelve mañana por +${checkIn.proxima}` : `Reclamar +${checkIn.proxima} monedas`}
            </Text>
          )}
        </BotonVivo>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify()} style={[estilos.tarjeta, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={[estilos.seccion, { color: t.texto }]}>Gana monedas viendo anuncios</Text>
        <Text style={{ color: t.textoSuave, fontSize: 14 }}>
          {anunciosRestantes > 0 ? `Te quedan ${anunciosRestantes} de ${reglas.maxAnunciosMonedasDia} anuncios hoy` : "Ya viste todos los anuncios de hoy"}
        </Text>
        <BotonVivo
          disabled={anunciosRestantes === 0 || ocupado !== null}
          onPress={verAnuncio}
          style={[estilos.boton, { backgroundColor: t.navy, opacity: anunciosRestantes === 0 ? 0.45 : 1 }]}
        >
          {ocupado === "anuncio" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[estilos.botonTexto, { color: "#FFFFFF" }]}>▶︎ Ver anuncio · +{reglas.monedasPorAnuncio} monedas</Text>
          )}
        </BotonVivo>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(210).springify()} style={[estilos.tarjeta, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={[estilos.seccion, { color: t.texto }]}>Canjear</Text>
        <Pressable
          disabled={estado.monedas < reglas.tarjetasPorCompraMonedas || ocupado !== null}
          onPress={canjear}
          style={({ pressed }) => [
            estilos.boton,
            { borderWidth: 1, borderColor: t.borde, opacity: estado.monedas < reglas.tarjetasPorCompraMonedas ? 0.45 : pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[estilos.botonTexto, { color: t.texto }]}>
            {reglas.tarjetasPorCompraMonedas} monedas → +{reglas.tarjetasPorCompraMonedas} tarjetas hoy
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push("/premium")} hitSlop={8}>
          <Text style={{ color: t.ambar, fontWeight: "700", textAlign: "center", marginTop: 4 }}>¿Prefieres sin límites? Hazte Premium ›</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { padding: 20, gap: 14 },
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  saldo: { borderRadius: 24, padding: 24, gap: 4 },
  saldoEtiqueta: { color: "#A9B7CC", fontSize: 15 },
  saldoNumero: { color: "#FFFFFF", fontSize: 44, fontWeight: "800", fontVariant: ["tabular-nums"] },
  saldoAyuda: { color: "#A9B7CC", fontSize: 13 },
  tarjeta: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  seccion: { fontSize: 17, fontWeight: "800" },
  dias: { flexDirection: "row", gap: 6, marginVertical: 4 },
  dia: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", gap: 2 },
  boton: { borderRadius: 14, paddingVertical: 14, alignItems: "center", minHeight: 50, justifyContent: "center" },
  botonTexto: { fontSize: 16, fontWeight: "800" },
});
