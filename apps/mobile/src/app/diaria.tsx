import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import type { EstadoDiaria, PreguntaDiaria } from "@tekluma/shared";
import { BotonVivo, GananciaFlotante } from "@/components/Animaciones";
import { compartirOtros, compartirPorWhatsApp, faltaParaLaSiguiente, intentarDiaria, obtenerDiaria, textoCompartir } from "@/lib/diaria";
import { sonarMoneda } from "@/lib/sonidos";
import { useTema } from "@/lib/tema";
import { Casillas, IconoCorrecto, IconoDuelo, IconoHito, IconoIncorrecto, IconoMoneda, IconoRacha } from "@/components/Iconos";

const VERDE = "#1F9D55";
const ROJO = "#D64545";

/** La pregunta del día: tres intentos, monedas por acertar y resultado para compartir. */
export default function Diaria() {
  const t = useTema();
  const [pregunta, setPregunta] = useState<PreguntaDiaria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [celebracion, setCelebracion] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      obtenerDiaria()
        .then(setPregunta)
        .catch(() => setError("No pudimos cargar la pregunta. Revisa tu conexión."));
    }, []),
  );

  if (!pregunta) {
    return (
      <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
        {error ? <Text style={{ color: t.textoSuave, fontSize: 16, padding: 24, textAlign: "center" }}>{error}</Text> : <ActivityIndicator color={t.ambar} />}
      </View>
    );
  }

  const { estado } = pregunta;
  const restantes = pregunta.intentosMax - estado.intentos.length;

  const elegir = async (opcion: number) => {
    setEnviando(opcion);
    try {
      const nuevo: EstadoDiaria = await intentarDiaria(pregunta.numero, opcion);
      setPregunta({ ...pregunta, estado: nuevo });
      if (nuevo.resuelta) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (nuevo.monedas) {
          sonarMoneda();
          setCelebracion((n) => (n ?? 0) + 1);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      // La pregunta cambió a medianoche o no hay conexión: se recarga.
      obtenerDiaria().then(setPregunta).catch(() => {});
    } finally {
      setEnviando(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenido}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.numero, { color: t.ambar }]}>
          #{pregunta.numero} · {pregunta.norma}
        </Text>
        <View style={estilos.puntos}>
          {Array.from({ length: pregunta.intentosMax }, (_, i) => {
            const o = estado.intentos[i];
            const color = o === undefined ? t.borde : o === estado.solucion?.correcta ? VERDE : ROJO;
            return <View key={i} style={[estilos.punto, { backgroundColor: color }]} />;
          })}
        </View>
      </View>

      <Animated.Text entering={FadeInDown.springify()} style={[estilos.pregunta, { color: t.texto }]}>
        {pregunta.pregunta}
      </Animated.Text>

      {!estado.terminada && (
        <Text style={{ color: t.textoSuave, fontSize: 14 }}>
          {restantes === pregunta.intentosMax
            ? `Acierta al primer intento y gana +${pregunta.premios[0]} monedas`
            : `Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`} · +${pregunta.premios[estado.intentos.length]} monedas si aciertas`}
        </Text>
      )}

      <View style={{ gap: 10 }}>
        {pregunta.opciones.map((texto, i) => (
          <Opcion
            key={i}
            texto={texto}
            indice={i}
            estado={estado}
            cargando={enviando === i}
            deshabilitada={enviando !== null}
            onElegir={() => elegir(i)}
          />
        ))}
      </View>

      {estado.terminada && <Resultado pregunta={pregunta} celebracion={celebracion} />}
    </ScrollView>
  );
}

function Opcion(props: {
  texto: string;
  indice: number;
  estado: EstadoDiaria;
  cargando: boolean;
  deshabilitada: boolean;
  onElegir: () => void;
}) {
  const { texto, indice, estado, cargando, deshabilitada, onElegir } = props;
  const t = useTema();
  // Sin sesión terminada aún no se conoce la correcta: toda opción elegida que no terminó el juego fue un fallo.
  const fallo = estado.intentos.includes(indice) && (estado.terminada ? indice !== estado.solucion?.correcta : true);
  const correcta = estado.terminada && indice === estado.solucion?.correcta;

  // Sacudida al fallar.
  const x = useSharedValue(0);
  useEffect(() => {
    if (fallo) x.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 50 })));
  }, [fallo, x]);
  const sacudida = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const fondo = correcta ? VERDE : fallo ? ROJO : t.superficie;
  const color = correcta || fallo ? "#FFFFFF" : t.texto;
  return (
    <Animated.View style={sacudida}>
      <BotonVivo
        disabled={estado.terminada || fallo || deshabilitada}
        onPress={onElegir}
        style={[estilos.opcion, { backgroundColor: fondo, borderColor: correcta || fallo ? fondo : t.borde, opacity: estado.terminada && !correcta && !fallo ? 0.5 : 1 }]}
      >
        <Text style={[estilos.letra, { color: correcta || fallo ? "#FFFFFF" : t.ambar }]}>{"ABCDEF"[indice]}</Text>
        <Text style={{ flex: 1, color, fontSize: 17, fontWeight: "600" }}>{texto}</Text>
        {cargando ? <ActivityIndicator color={t.ambar} /> : correcta ? <IconoCorrecto tamano={20} color="#FFFFFF" /> : fallo ? <IconoIncorrecto tamano={20} color="#FFFFFF" /> : null}
      </BotonVivo>
    </Animated.View>
  );
}

function Resultado({ pregunta, celebracion }: { pregunta: PreguntaDiaria; celebracion: number | null }) {
  const t = useTema();
  const { estado } = pregunta;
  const texto = textoCompartir(pregunta, estado);
  const [falta, setFalta] = useState(faltaParaLaSiguiente);
  useEffect(() => {
    const id = setInterval(() => setFalta(faltaParaLaSiguiente()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[estilos.resultado, { backgroundColor: t.navy }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {estado.resuelta && <IconoHito tamano={30} color="#FFFFFF" acento={t.ambar} />}
        <Text style={estilos.resultadoTitulo}>{estado.resuelta ? (estado.intentos.length === 1 ? "¡A la primera!" : "¡Correcto!") : "Esta vez no"}</Text>
      </View>
      <Casillas intentos={estado.intentos} correcta={estado.solucion?.correcta} maximo={pregunta.intentosMax} vacio="#3B5174" />
      {!!estado.monedas && (
        <View style={estilos.filaIcono}>
          <IconoMoneda tamano={18} color={t.ambar} acento={t.ambar} />
          <Text style={[estilos.resultadoLinea, { color: t.ambar }]}>+{estado.monedas} monedas</Text>
        </View>
      )}
      {!!estado.racha && (
        <View style={estilos.filaIcono}>
          <IconoRacha tamano={18} color="#FFFFFF" acento={t.ambar} />
          <Text style={estilos.resultadoLinea}>Racha de {estado.racha} {estado.racha === 1 ? "día" : "días"}</Text>
        </View>
      )}
      {celebracion && <GananciaFlotante key={celebracion} texto={`+${estado.monedas}`} color={t.ambar} />}

      {(estado.solucion?.explicacion || estado.solucion?.cita) && (
        <View style={[estilos.solucion, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          {!!estado.solucion.explicacion && <Text style={estilos.solucionTexto}>{estado.solucion.explicacion}</Text>}
          {estado.solucion.cita && (
            <Text style={[estilos.solucionTexto, { color: "#A9B7CC" }]}>
              <Text style={{ color: t.ambar, fontWeight: "800" }}>
                {pregunta.norma} · Art. {estado.solucion.cita.articulo}
                {"  "}
              </Text>
              {estado.solucion.cita.extracto}
            </Text>
          )}
        </View>
      )}

      <BotonVivo onPress={() => compartirPorWhatsApp(texto)} style={[estilos.compartir, { backgroundColor: "#25D366" }]}>
        <Text style={estilos.compartirTexto}>Retar a mi grupo de WhatsApp</Text>
      </BotonVivo>
      <Pressable onPress={() => compartirOtros(texto)} hitSlop={8}>
        <Text style={{ color: "#A9B7CC", fontWeight: "700", textAlign: "center" }}>Compartir en otra app</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/duelo/nuevo")} hitSlop={8}>
        <View style={[estilos.filaIcono, { justifyContent: "center", marginTop: 4 }]}>
          <IconoDuelo tamano={18} color={t.ambar} />
          <Text style={{ color: t.ambar, fontWeight: "800" }}>¿Quieres más? Reta a un colega a un duelo</Text>
        </View>
      </Pressable>
      <Text style={[estilos.resultadoLinea, { fontSize: 13, marginTop: 4 }]}>Nueva pregunta en {falta}</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 20, gap: 16, paddingBottom: 48 },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  numero: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  puntos: { flexDirection: "row", gap: 6 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  pregunta: { fontSize: 24, fontWeight: "800", lineHeight: 31, letterSpacing: -0.3 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, minHeight: 60 },
  letra: { fontSize: 15, fontWeight: "800", width: 18 },
  filaIcono: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultado: { borderRadius: 24, padding: 20, gap: 10, marginTop: 8 },
  resultadoTitulo: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  resultadoLinea: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  solucion: { borderRadius: 14, padding: 14, gap: 8 },
  solucionTexto: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  compartir: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  compartirTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
