import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { EstadoCupo } from "@tekluma/shared";
import { verAnuncioConRecompensa } from "@/lib/anuncios";
import { authClient } from "@/lib/auth";
import { ampliarConMonedas, obtenerCupo } from "@/lib/cupo";
import { MONO, MONO_FUERTE, useTema } from "@/lib/tema";
import { IconoEspera, IconoMoneda, IconoPremium, IconoReproducir } from "@/components/Iconos";

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
      if (await verAnuncioConRecompensa(sesion.user.id, "tarjetas")) onAmpliado(await obtenerCupo());
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
      <View style={estilos.cabecera}>
        <IconoEspera tamano={40} color={t.texto} acento={t.ambar} />
        <Text style={[estilos.titulo, { color: t.texto }]}>Llegaste a tu cupo de hoy</Text>
        <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>Vuelve mañana o amplía tu sesión ahora.</Text>
      </View>

      <View style={[estilos.rotulo, { borderColor: t.borde }]}>
        <View style={estilos.celda}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>REPASADAS</Text>
          <Text style={[estilos.celdaValor, { color: t.texto }]}>{estado.usadas}</Text>
        </View>
        <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>ANUNCIOS</Text>
          <Text style={[estilos.celdaValor, { color: t.texto }]}>{anunciosRestantes}</Text>
        </View>
        <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>MONEDAS</Text>
          <Text style={[estilos.celdaValor, { color: t.texto }]}>{estado.monedas}</Text>
        </View>
      </View>

      <Pressable
        disabled={anunciosRestantes === 0 || ocupado !== null}
        onPress={verAnuncio}
        style={({ pressed }) => [estilos.opcion, { backgroundColor: t.primario, opacity: anunciosRestantes === 0 ? 0.4 : pressed ? 0.85 : 1 }]}
      >
        {ocupado === "anuncio" ? (
          <ActivityIndicator color={t.sobrePrimario} />
        ) : (
          <View style={estilos.fila}>
            <IconoReproducir tamano={20} color={t.sobrePrimario} />
            <View style={estilos.textos}>
              <Text style={[estilos.opcionTitulo, { color: t.sobrePrimario }]}>Ver un anuncio</Text>
              <Text style={[estilos.opcionDetalle, { color: t.sobrePrimario }]}>
                {anunciosRestantes > 0 ? `Quedan ${anunciosRestantes} hoy` : "Ya viste todos los de hoy"}
              </Text>
            </View>
            <Text style={[estilos.cifra, { color: t.sobrePrimario }]}>+{reglas.tarjetasPorAnuncio}</Text>
          </View>
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
          <ActivityIndicator color={t.texto} />
        ) : (
          <View style={estilos.fila}>
            <IconoMoneda tamano={20} color={t.texto} acento={t.ambar} />
            <View style={estilos.textos}>
              <Text style={[estilos.opcionTitulo, { color: t.texto }]}>Canjear {reglas.tarjetasPorCompraMonedas} monedas</Text>
              <Text style={[estilos.opcionDetalle, { color: t.textoSuave }]}>
                {alcanzanMonedas ? `Tienes ${estado.monedas}` : `Te faltan ${reglas.tarjetasPorCompraMonedas - estado.monedas}`}
              </Text>
            </View>
            <Text style={[estilos.cifra, { color: t.texto }]}>+{reglas.tarjetasPorCompraMonedas}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push("/premium")}
        style={({ pressed }) => [
          estilos.opcion,
          { backgroundColor: t.superficie, borderColor: t.borde, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: t.ambar, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={estilos.fila}>
          <IconoPremium tamano={20} color={t.texto} acento={t.ambar} />
          <View style={estilos.textos}>
            <Text style={[estilos.opcionTitulo, { color: t.texto }]}>Tekluma Premium</Text>
            <Text style={[estilos.opcionDetalle, { color: t.textoSuave }]}>Repaso sin cupo · 7 días gratis</Text>
          </View>
          <Text style={[estilos.cifra, { color: t.ambar }]}>∞</Text>
        </View>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 12, paddingTop: 12 },
  cabecera: { gap: 8, marginBottom: 4 },
  titulo: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  subtitulo: { fontSize: 15, lineHeight: 21 },
  rotulo: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, marginBottom: 4 },
  celda: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  celdaEtiqueta: { fontSize: 10, fontFamily: MONO, letterSpacing: 1.2 },
  celdaValor: { fontSize: 16, fontFamily: MONO_FUERTE },
  opcion: { borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, minHeight: 64, justifyContent: "center" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  textos: { flex: 1, gap: 2 },
  opcionTitulo: { fontSize: 16, fontWeight: "700" },
  opcionDetalle: { fontSize: 13, opacity: 0.8 },
  cifra: { fontSize: 18, fontFamily: MONO_FUERTE },
});
