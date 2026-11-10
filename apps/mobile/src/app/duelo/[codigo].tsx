import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, ZoomIn } from "react-native-reanimated";
import type { Duelo, ResultadoDuelo } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { compartirOtros, compartirPorWhatsApp } from "@/lib/diaria";
import { crearDuelo, jugarDuelo, textoReto, verDuelo } from "@/lib/duelos";
import { sonarMoneda } from "@/lib/sonidos";
import { MONO, MONO_FUERTE, useTema } from "@/lib/tema";
import { IconoCorrecto, IconoCronometro, IconoDuelo, IconoIncorrecto, Puesto } from "@/components/Iconos";

/** Segundos desde `desde` (fuera del componente: el React Compiler exige render puro). */
const transcurrido = (desde: number) => (Date.now() - desde) / 1000;

const VERDE = "#1F9D55";
const ROJO = "#D64545";

/** Un duelo: presentación, 5 preguntas con cronómetro y marcador para compartir. */
export default function DueloPantalla() {
  const t = useTema();
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const [duelo, setDuelo] = useState<Duelo | null>(null);
  const [resultado, setResultado] = useState<ResultadoDuelo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jugando, setJugando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      verDuelo(codigo)
        .then((d) => {
          setDuelo(d);
          if (d.resultado) setResultado(d.resultado);
        })
        .catch(() => setError("No encontramos ese duelo."));
    }, [codigo]),
  );

  if (error) return <Centro texto={error} />;
  if (!duelo) return <Centro />;
  if (resultado) return <Marcador duelo={duelo} resultado={resultado} />;
  if (jugando) return <Partida duelo={duelo} onFin={setResultado} />;

  return (
    <View style={[estilos.centro, { backgroundColor: t.fondo, padding: 24, gap: 14 }]}>
      <Animated.View entering={ZoomIn.springify()}>
        <IconoDuelo tamano={64} color={t.texto} acento={t.ambar} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(80)} style={[estilos.titulo, { color: t.texto, textAlign: "center" }]}>
        {duelo.soyRetador ? "Tu duelo" : `${duelo.retador} te reta`}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(110)} style={[estilos.rotuloTexto, { color: t.textoSuave }]}>
        {duelo.norma === "RNE" ? "TODO EL RNE" : duelo.norma} · 5 PREGUNTAS · 1 INTENTO
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(140)} style={{ color: t.textoSuave, fontSize: 16, textAlign: "center", lineHeight: 22 }}>
        {duelo.soyRetador
          ? "Responde primero; luego envía el reto y tus colegas intentarán superarte."
          : "Cuenta el tiempo: a igualdad de aciertos gana el más rápido."}
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(200)} style={{ alignSelf: "stretch" }}>
        <BotonVivo onPress={() => setJugando(true)} style={[estilos.boton, { backgroundColor: t.primario }]}>
          <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>{duelo.soyRetador ? "Empezar" : "¡Acepto el reto!"}</Text>
        </BotonVivo>
      </Animated.View>
    </View>
  );
}

function Centro({ texto }: { texto?: string }) {
  const t = useTema();
  return (
    <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
      {texto ? <Text style={{ color: t.textoSuave, fontSize: 16, padding: 24, textAlign: "center" }}>{texto}</Text> : <ActivityIndicator color={t.ambar} />}
    </View>
  );
}

function Partida({ duelo, onFin }: { duelo: Duelo; onFin: (r: ResultadoDuelo) => void }) {
  const t = useTema();
  const [indice, setIndice] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const respuestas = useRef<(number | null)[]>([]);
  const inicio = useRef(0);

  useEffect(() => {
    inicio.current = Date.now();
    const id = setInterval(() => setSegundos(Math.floor(transcurrido(inicio.current))), 250);
    return () => clearInterval(id);
  }, []);

  const pregunta = duelo.preguntas[indice]!;

  const elegir = async (opcion: number) => {
    if (elegida !== null) return;
    Haptics.selectionAsync();
    setElegida(opcion);
    respuestas.current[indice] = opcion;
    await new Promise((r) => setTimeout(r, 350));
    if (indice < duelo.preguntas.length - 1) {
      setIndice(indice + 1);
      setElegida(null);
      return;
    }
    setEnviando(true);
    try {
      const resultado = await jugarDuelo(duelo.codigo, respuestas.current, transcurrido(inicio.current));
      onFin(resultado);
    } catch {
      setEnviando(false);
      Alert.alert("No pudimos enviar tus respuestas", "Revisa tu conexión e inténtalo de nuevo.", [
        { text: "Reintentar", onPress: () => elegir(opcion) },
      ]);
      setElegida(null);
    }
  };

  if (enviando) return <Centro />;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo, padding: 20, gap: 16 }}>
      <View style={estilos.barraSuperior}>
        <View style={estilos.progreso}>
          {duelo.preguntas.map((p, i) => (
            <View key={p.id} style={[estilos.segmento, { backgroundColor: i <= indice ? t.ambar : t.borde }]} />
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IconoCronometro tamano={18} color={t.texto} acento={t.ambar} />
          <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 15, minWidth: 36 }}>{segundos}s</Text>
        </View>
      </View>
      <Animated.View key={pregunta.id} entering={FadeInRight.springify().damping(16)} style={{ gap: 14 }}>
        <Text style={[estilos.rotuloTexto, { color: t.textoSuave, textAlign: "left" }]}>
          PREGUNTA {indice + 1}/{duelo.preguntas.length}
        </Text>
        <Text style={[estilos.pregunta, { color: t.texto }]}>{pregunta.pregunta}</Text>
        {pregunta.opciones.map((texto, i) => {
          const activa = elegida === i;
          return (
            <BotonVivo
              key={i}
              disabled={elegida !== null}
              onPress={() => elegir(i)}
              style={[estilos.opcion, { backgroundColor: activa ? t.primario : t.superficie, borderColor: activa ? t.primario : t.borde }]}
            >
              <Text style={[estilos.letra, { color: activa ? t.sobrePrimario : t.textoSuave, borderColor: activa ? t.sobrePrimario : t.borde }]}>{"ABCDEF"[i]}</Text>
              <Text style={{ flex: 1, color: activa ? t.sobrePrimario : t.texto, fontSize: 16, fontWeight: "600", lineHeight: 22 }}>{texto}</Text>
            </BotonVivo>
          );
        })}
      </Animated.View>
    </View>
  );
}

function Marcador({ duelo, resultado }: { duelo: Duelo; resultado: ResultadoDuelo }) {
  const t = useTema();
  const [revancha, setRevancha] = useState(false);
  const yo = resultado.jugadas.find((j) => j.soyYo);
  const posicion = resultado.jugadas.findIndex((j) => j.soyYo);
  const rivales = resultado.jugadas.filter((j) => !j.soyYo);
  const texto = textoReto(resultado);

  const titulo = !yo
    ? "Marcador"
    : rivales.length === 0
      ? `${yo.aciertos}/5 en ${yo.segundos} s`
      : posicion === 0
        ? "¡Ganaste!"
        : "Te ganaron esta vez";

  useEffect(() => {
    if (yo && rivales.length > 0 && posicion === 0) {
      sonarMoneda();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Solo al mostrar el marcador por primera vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nuevaRevancha = async () => {
    setRevancha(true);
    try {
      const nuevo = await crearDuelo(resultado.norma === "RNE" ? undefined : resultado.norma);
      router.replace(`/duelo/${nuevo.codigo}`);
    } catch {
      setRevancha(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[estilos.cabecera, { backgroundColor: t.navy }]}>
        <Text style={[estilos.rotuloTexto, { color: "#A9B7CC", textAlign: "left" }]}>DUELO {resultado.norma} · {resultado.codigo}</Text>
        <Text style={estilos.cabeceraTitulo}>{titulo}</Text>
        {rivales.length === 0 && <Text style={{ color: "#A9B7CC", fontSize: 15 }}>Envía el reto y mira quién te gana.</Text>}
        <BotonVivo onPress={() => compartirPorWhatsApp(texto)} style={[estilos.boton, { backgroundColor: "#F6F5F2", marginTop: 8 }]}>
          <Text style={[estilos.botonTexto, { color: "#0F1B2D" }]}>Retar por WhatsApp</Text>
        </BotonVivo>
        <Pressable onPress={() => compartirOtros(texto)} hitSlop={8}>
          <Text style={{ color: "#A9B7CC", fontWeight: "700", textAlign: "center" }}>Compartir en otra app</Text>
        </Pressable>
      </Animated.View>

      {resultado.jugadas.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>MARCADOR</Text>
          {resultado.jugadas.map((j, i) => (
            <Animated.View
              key={`${j.nombre}-${i}`}
              entering={FadeInDown.delay(i * 60)}
              style={[estilos.jugada, { backgroundColor: t.superficie, borderColor: t.borde }, j.soyYo && { borderLeftWidth: 3, borderLeftColor: t.ambar }]}
            >
              <Puesto n={i + 1} texto={t.textoSuave} ambar={t.ambar} />
              <Text style={{ flex: 1, color: t.texto, fontWeight: "700", fontSize: 16 }}>
                {j.soyYo ? "Tú" : j.nombre}
                {j.esRetador && !j.soyYo ? <Text style={{ color: t.textoSuave, fontWeight: "600", fontSize: 13 }}>  · retador</Text> : null}
              </Text>
              <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 15 }}>{j.aciertos}/5</Text>
              <Text style={{ color: t.textoSuave, fontFamily: MONO, width: 56, textAlign: "right", fontVariant: ["tabular-nums"] }}>{j.segundos}s</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {resultado.solucion && (
        <View style={{ gap: 8 }}>
          <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>TUS RESPUESTAS</Text>
          {resultado.solucion.map((s, i) => {
            const p = duelo.preguntas.find((q) => q.id === s.id);
            if (!p) return null;
            const bien = s.elegida === s.correcta;
            return (
              <View key={s.id} style={[estilos.revision, { backgroundColor: t.superficie, borderColor: t.borde }]}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {bien ? <IconoCorrecto tamano={18} color={VERDE} /> : <IconoIncorrecto tamano={18} color={ROJO} />}
                  <Text style={{ flex: 1, color: t.texto, fontWeight: "700", fontSize: 15 }}>
                    {i + 1}. {p.pregunta}
                  </Text>
                </View>
                {!bien && s.elegida !== null && <Text style={{ color: ROJO, fontSize: 14 }}>Tu respuesta: {p.opciones[s.elegida]}</Text>}
                <Text style={{ color: VERDE, fontSize: 14, fontWeight: "600" }}>Correcta: {p.opciones[s.correcta]}</Text>
                {!!s.explicacion && <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 19 }}>{s.explicacion}</Text>}
              </View>
            );
          })}
        </View>
      )}

      <BotonVivo disabled={revancha} onPress={nuevaRevancha} style={[estilos.boton, { backgroundColor: "transparent", borderWidth: 1, borderColor: t.borde }]}>
        {revancha ? <ActivityIndicator color={t.texto} /> : <Text style={[estilos.botonTexto, { color: t.texto }]}>Nuevo duelo de {resultado.norma}</Text>}
      </BotonVivo>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  boton: { borderRadius: 8, paddingVertical: 16, alignItems: "center", minHeight: 54, justifyContent: "center" },
  botonTexto: { fontSize: 17, fontWeight: "700" },
  barraSuperior: { flexDirection: "row", alignItems: "center", gap: 14 },
  progreso: { flex: 1, flexDirection: "row", gap: 6 },
  segmento: { flex: 1, height: 4, borderRadius: 2 },
  pregunta: { fontSize: 21, fontWeight: "700", lineHeight: 28, letterSpacing: -0.2 },
  rotuloTexto: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4, textAlign: "center" },
  letra: { width: 26, height: 26, borderWidth: 1, borderRadius: 4, textAlign: "center", lineHeight: 24, fontFamily: MONO_FUERTE, fontSize: 13 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 16, minHeight: 58 },
  cabecera: { borderRadius: 10, padding: 20, gap: 8 },
  cabeceraTitulo: { color: "#F6F5F2", fontSize: 28, fontWeight: "700" },
  subtitulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4, marginTop: 8 },
  jugada: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 8, borderWidth: 1 },
  revision: { padding: 14, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
});
