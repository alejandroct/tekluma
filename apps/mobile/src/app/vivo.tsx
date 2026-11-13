import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { VIVO } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { IconoChevron, IconoVivo } from "@/components/Iconos";
import { compartirOtros, compartirPorWhatsApp } from "@/lib/diaria";
import { normasDuelo } from "@/lib/duelos";
import { MONO, MONO_FUERTE, RADIO, useTema } from "@/lib/tema";
import { crearPartida, enlaceAnfitrion, enlaceJugador, misPartidas, textoInvitacion, type MiPartida, type PartidaCreada } from "@/lib/vivo";

/** Crear una partida en vivo para un grupo: se proyecta desde la web y cada uno juega desde su celular. */
export default function Vivo() {
  const t = useTema();
  const [normas, setNormas] = useState<string[] | null>(null);
  const [norma, setNorma] = useState<string | undefined>(undefined);
  const [preguntas, setPreguntas] = useState<number>(10);
  const [segundos, setSegundos] = useState<number>(20);
  const [creando, setCreando] = useState(false);
  const [creada, setCreada] = useState<(PartidaCreada & { norma: string }) | null>(null);
  const [recientes, setRecientes] = useState<MiPartida[]>([]);

  useFocusEffect(
    useCallback(() => {
      normasDuelo()
        .then((n) => {
          setNormas(n);
          setNorma((actual) => actual ?? n[0]);
        })
        .catch(() => setNormas([]));
      misPartidas()
        .then(setRecientes)
        .catch(() => {});
    }, []),
  );

  const crear = async () => {
    setCreando(true);
    try {
      const p = await crearPartida({ norma, preguntas, segundos });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreada({ ...p, norma: norma ?? "RNE" });
    } catch (e) {
      Alert.alert("No pudimos crear la partida", (e as Error).message);
    } finally {
      setCreando(false);
    }
  };

  if (creada) return <Sala partida={creada} onOtra={() => setCreada(null)} />;

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenido}>
      <IconoVivo tamano={48} color={t.texto} acento={t.ambar} />
      <Text style={[estilos.titulo, { color: t.texto }]}>Partida en vivo</Text>
      <Text style={[estilos.texto, { color: t.textoSuave }]}>
        Para clases, capacitaciones o la charla de obra. Proyectas las preguntas en una laptop o TV y cada uno responde desde su celular, sin instalar nada.
        Gana quien acierta más y más rápido.
      </Text>

      <Text style={[estilos.etiqueta, { color: t.textoSuave }]}>NORMA</Text>
      {normas === null ? (
        <ActivityIndicator color={t.ambar} />
      ) : normas.length === 0 ? (
        <Text style={[estilos.texto, { color: t.textoSuave }]}>Todavía no hay suficientes preguntas publicadas para una partida.</Text>
      ) : (
        <View style={estilos.chips}>
          {normas.map((n) => (
            <Pressable
              key={n}
              onPress={() => setNorma(n)}
              style={[estilos.chip, { borderColor: n === norma ? t.ambar : t.borde, backgroundColor: t.superficie }]}
            >
              <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 16 }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[estilos.etiqueta, { color: t.textoSuave }]}>PREGUNTAS</Text>
      <Selector valores={VIVO.preguntas} actual={preguntas} onCambio={setPreguntas} sufijo="" />
      <Text style={[estilos.etiqueta, { color: t.textoSuave }]}>TIEMPO POR PREGUNTA</Text>
      <Selector valores={VIVO.segundos} actual={segundos} onCambio={setSegundos} sufijo=" s" />

      <BotonVivo
        disabled={creando || !normas?.length}
        onPress={crear}
        style={[estilos.boton, { backgroundColor: t.primario }, !normas?.length && { opacity: 0.4 }]}
      >
        {creando ? <ActivityIndicator color={t.sobrePrimario} /> : <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>Crear la sala</Text>}
      </BotonVivo>

      {recientes.length > 0 && (
        <>
          <Text style={[estilos.etiqueta, { color: t.textoSuave, marginTop: 16 }]}>TUS PARTIDAS</Text>
          {recientes.map((r) => (
            <Pressable
              key={r.codigo}
              onPress={() => Linking.openURL(enlaceAnfitrion(r))}
              style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
            >
              <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 16 }}>{r.codigo}</Text>
              <Text style={{ flex: 1, color: t.textoSuave }}>
                {r.norma} · {r.fase === "fin" ? "terminada" : r.fase === "sala" ? "en espera" : "en juego"}
              </Text>
              <IconoChevron color={t.textoSuave} />
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Selector({ valores, actual, onCambio, sufijo }: { valores: readonly number[]; actual: number; onCambio: (n: number) => void; sufijo: string }) {
  const t = useTema();
  return (
    <View style={estilos.chips}>
      {valores.map((v) => (
        <Pressable
          key={v}
          onPress={() => (Haptics.selectionAsync(), onCambio(v))}
          accessibilityState={{ selected: v === actual }}
          style={[estilos.chip, { borderColor: v === actual ? t.ambar : t.borde, backgroundColor: t.superficie }]}
        >
          <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 16 }}>
            {v}
            {sufijo}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** La sala recién creada: el código, proyectar y compartir. */
function Sala({ partida, onOtra }: { partida: PartidaCreada & { norma: string }; onOtra: () => void }) {
  const t = useTema();
  const invitacion = textoInvitacion(partida.codigo, partida.norma);
  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenido}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[estilos.cabecera, { backgroundColor: t.navy }]}>
        <Text style={[estilos.etiqueta, { color: "#A9B7CC", marginTop: 0 }]}>SALA LISTA · {partida.norma}</Text>
        <Text style={estilos.codigo} accessibilityLabel={`Código ${partida.codigo.split("").join(" ")}`}>
          {partida.codigo}
        </Text>
        <Text style={{ color: "#A9B7CC", fontSize: 15, lineHeight: 21 }}>
          Se entra en {enlaceJugador("").replace(/^https?:\/\//, "").replace(/\?c=$/, "")} con este código, o escaneando el QR de la pantalla proyectada.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80)} style={{ gap: 10 }}>
        <Paso n={1} titulo="Proyecta la sala" texto="Abre este enlace en la laptop o TV conectada al proyector. Desde ahí empiezas y avanzas las preguntas." />
        <BotonVivo onPress={() => Linking.openURL(enlaceAnfitrion(partida))} style={[estilos.boton, { backgroundColor: t.primario }]}>
          <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>Abrir la pantalla del anfitrión</Text>
        </BotonVivo>
        <Pressable onPress={() => compartirOtros(`Pantalla del anfitrión (no la compartas con los jugadores): ${enlaceAnfitrion(partida)}`)} hitSlop={8}>
          <Text style={{ color: t.textoSuave, textAlign: "center", fontWeight: "600" }}>Enviar el enlace a mi laptop</Text>
        </Pressable>

        <Paso n={2} titulo="Invita al grupo" texto="Que entren con el código. También puedes mandarles el enlace por WhatsApp." />
        <BotonVivo onPress={() => compartirPorWhatsApp(invitacion)} style={[estilos.boton, { backgroundColor: t.ambar }]}>
          <Text style={[estilos.botonTexto, { color: t.navy }]}>Invitar por WhatsApp</Text>
        </BotonVivo>
        <BotonVivo
          onPress={() => Linking.openURL(enlaceJugador(partida.codigo))}
          style={[estilos.boton, { backgroundColor: "transparent", borderWidth: 1, borderColor: t.borde }]}
        >
          <Text style={[estilos.botonTexto, { color: t.texto }]}>Jugar yo también</Text>
        </BotonVivo>
      </Animated.View>

      <Pressable onPress={onOtra} hitSlop={8} style={{ marginTop: 8 }}>
        <Text style={{ color: t.textoSuave, textAlign: "center" }}>Crear otra partida</Text>
      </Pressable>
    </ScrollView>
  );
}

function Paso({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
      <Text style={[estilos.paso, { color: t.ambar, borderColor: t.ambar }]}>{n}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.texto, fontSize: 16, fontWeight: "700" }}>{titulo}</Text>
        <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20 }}>{texto}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 20, gap: 10, paddingBottom: 48 },
  titulo: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginTop: 6 },
  texto: { fontSize: 16, lineHeight: 22 },
  etiqueta: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4, marginTop: 10 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderWidth: 1.5, borderRadius: RADIO.medio, paddingVertical: 10, paddingHorizontal: 16, minWidth: 56, alignItems: "center" },
  boton: { borderRadius: RADIO.medio, paddingVertical: 16, alignItems: "center", minHeight: 54, justifyContent: "center", marginTop: 6 },
  botonTexto: { fontSize: 17, fontWeight: "700" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: RADIO.medio, borderWidth: 1 },
  cabecera: { borderRadius: 10, padding: 20, gap: 8 },
  codigo: { color: "#F6F5F2", fontFamily: MONO_FUERTE, fontSize: 52, letterSpacing: 8 },
  paso: { width: 28, height: 28, borderWidth: 1.5, borderRadius: RADIO.chico, textAlign: "center", lineHeight: 25, fontFamily: MONO_FUERTE },
});
