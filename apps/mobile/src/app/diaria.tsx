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
import { Figura } from "@/components/Tarjeta";
import { compartirOtros, compartirPorWhatsApp, faltaParaLaSiguiente, intentarDiaria, obtenerDiaria, textoCompartir } from "@/lib/diaria";
import { sonarMoneda } from "@/lib/sonidos";
import { MONO, MONO_FUERTE, useTema } from "@/lib/tema";
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
      <View style={[estilos.rotulo, { borderColor: t.borde }]}>
        <View style={estilos.celda}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>PREGUNTA</Text>
          <Text style={[estilos.celdaValor, { color: t.texto }]}>#{pregunta.numero}</Text>
        </View>
        <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>NORMA</Text>
          <Text style={[estilos.celdaValor, { color: t.texto }]}>{pregunta.norma}</Text>
        </View>
        <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
          <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>INTENTOS</Text>
          <View style={estilos.puntos}>
            {Array.from({ length: pregunta.intentosMax }, (_, i) => {
              const o = estado.intentos[i];
              const color = o === undefined ? t.borde : o === estado.solucion?.correcta ? VERDE : ROJO;
              return <View key={i} style={[estilos.punto, { backgroundColor: color }]} />;
            })}
          </View>
        </View>
      </View>

      <Animated.Text entering={FadeInDown.springify()} style={[estilos.pregunta, { color: t.texto }]}>
        {pregunta.pregunta}
      </Animated.Text>
      {pregunta.imagenUrl && <Figura uri={pregunta.imagenUrl} />}

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

  const marca = correcta ? VERDE : fallo ? ROJO : null;
  return (
    <Animated.View style={sacudida}>
      <BotonVivo
        disabled={estado.terminada || fallo || deshabilitada}
        onPress={onElegir}
        style={[
          estilos.opcion,
          { backgroundColor: t.superficie, borderColor: marca ?? t.borde, opacity: estado.terminada && !marca ? 0.5 : 1 },
          marca && { borderLeftWidth: 3, paddingLeft: 12 },
        ]}
      >
        <Text style={[estilos.letra, { color: marca ?? t.textoSuave, borderColor: marca ?? t.borde }]}>{"ABCDEF"[indice]}</Text>
        <Text style={{ flex: 1, color: t.texto, fontSize: 16, fontWeight: "600", lineHeight: 22 }}>{texto}</Text>
        {cargando ? <ActivityIndicator color={t.texto} /> : correcta ? <IconoCorrecto tamano={20} color={VERDE} /> : fallo ? <IconoIncorrecto tamano={20} color={ROJO} /> : null}
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
        {estado.resuelta && <IconoHito tamano={28} color="#F6F5F2" acento={t.ambar} />}
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
          <IconoRacha tamano={18} color="#F6F5F2" acento={t.ambar} />
          <Text style={estilos.resultadoLinea}>Racha de {estado.racha} {estado.racha === 1 ? "día" : "días"}</Text>
        </View>
      )}
      {celebracion && <GananciaFlotante key={celebracion} texto={`+${estado.monedas}`} color={t.ambar} />}

      {(estado.solucion?.explicacion || estado.solucion?.cita) && (
        <View style={[estilos.solucion, { borderColor: "rgba(246,245,242,0.2)" }]}>
          {!!estado.solucion.explicacion && <Text style={estilos.solucionTexto}>{estado.solucion.explicacion}</Text>}
          {estado.solucion.cita && (
            <View style={{ gap: 4 }}>
              <Text style={estilos.citaArticulo}>
                {pregunta.norma} · ART. {estado.solucion.cita.articulo}
              </Text>
              <Text style={[estilos.solucionTexto, { color: "#A9B7CC" }]}>{estado.solucion.cita.extracto}</Text>
            </View>
          )}
        </View>
      )}

      <BotonVivo onPress={() => compartirPorWhatsApp(texto)} style={[estilos.compartir, { backgroundColor: "#F6F5F2" }]}>
        <Text style={estilos.compartirTexto}>Retar a mi grupo de WhatsApp</Text>
      </BotonVivo>
      <Pressable onPress={() => compartirOtros(texto)} hitSlop={8}>
        <Text style={{ color: "#A9B7CC", fontWeight: "600", textAlign: "center" }}>Compartir en otra app</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/duelo/nuevo")} hitSlop={8}>
        <View style={[estilos.filaIcono, { justifyContent: "center", marginTop: 4 }]}>
          <IconoDuelo tamano={18} color="#F6F5F2" acento={t.ambar} />
          <Text style={{ color: "#F6F5F2", fontWeight: "600" }}>Reta a un colega a un duelo</Text>
        </View>
      </Pressable>
      <Text style={[estilos.rotuloPie, { color: "#A9B7CC" }]}>NUEVA PREGUNTA EN {falta.toUpperCase()}</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 20, gap: 16, paddingBottom: 48 },
  rotulo: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  celda: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  celdaEtiqueta: { fontSize: 10, fontFamily: MONO, letterSpacing: 1.2 },
  celdaValor: { fontSize: 16, fontFamily: MONO_FUERTE },
  puntos: { flexDirection: "row", gap: 5, height: 20, alignItems: "center" },
  punto: { width: 10, height: 10, borderRadius: 2 },
  pregunta: { fontSize: 22, fontWeight: "700", lineHeight: 30, letterSpacing: -0.3 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 14, minHeight: 58 },
  letra: { width: 26, height: 26, borderWidth: 1, borderRadius: 4, textAlign: "center", lineHeight: 24, fontFamily: MONO_FUERTE, fontSize: 13 },
  filaIcono: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultado: { borderRadius: 10, padding: 20, gap: 10, marginTop: 8 },
  resultadoTitulo: { color: "#F6F5F2", fontSize: 24, fontWeight: "700" },
  resultadoLinea: { color: "#F6F5F2", fontSize: 15, fontWeight: "600" },
  rotuloPie: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.2, textAlign: "center", marginTop: 6 },
  citaArticulo: { color: "#FF8A1F", fontSize: 12, fontFamily: MONO_FUERTE, letterSpacing: 0.6 },
  solucion: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 10 },
  solucionTexto: { color: "#F6F5F2", fontSize: 14, lineHeight: 20 },
  compartir: { borderRadius: 8, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  compartirTexto: { color: "#0F1B2D", fontSize: 16, fontWeight: "700" },
});
