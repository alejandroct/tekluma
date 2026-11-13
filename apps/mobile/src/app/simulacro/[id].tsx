import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import type { Simulacro } from "@tekluma/shared";
import { BotonVivo, NumeroAnimado } from "@/components/Animaciones";
import { CitaNorma } from "@/components/CitaNorma";
import { IconoCorrecto, IconoCronometro, IconoIncorrecto } from "@/components/Iconos";
import { Figura } from "@/components/Tarjeta";
import { sonarMoneda } from "@/lib/sonidos";
import { entregarSimulacro, guardarRespuestas, nombreCapitulo, reloj, respuestasGuardadas, verSimulacro } from "@/lib/simulacro";
import { MONO, MONO_FUERTE, RADIO, useTema } from "@/lib/tema";

const VERDE = "#1F9D55";
const ROJO = "#D64545";

/** Segundos que quedan según el reloj del servidor (fuera del componente: render puro). */
const restante = (s: Simulacro) => s.limiteSegundos - (Date.now() - Date.parse(s.iniciado)) / 1000;

/** Un simulacro: el examen con su cronómetro o, si ya se entregó, el resultado. */
export default function SimulacroPantalla() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [simulacro, setSimulacro] = useState<Simulacro | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    verSimulacro(id).then(setSimulacro, () => setError(true));
  }, [id]);

  if (error) return <Centro texto="No encontramos ese simulacro." />;
  if (!simulacro) return <Centro />;
  if (simulacro.resultado) return <Resultado simulacro={simulacro} />;
  return (
    <>
      {/* Mientras se rinde no se cierra con un gesto: se sale con «Salir», que avisa que el tiempo sigue. */}
      <Stack.Screen options={{ gestureEnabled: false, headerBackVisible: false, title: `Simulacro ${simulacro.norma}` }} />
      <Examen simulacro={simulacro} onEntregado={setSimulacro} t={t} />
    </>
  );
}

function Examen({ simulacro, onEntregado, t }: { simulacro: Simulacro; onEntregado: (s: Simulacro) => void; t: ReturnType<typeof useTema> }) {
  const total = simulacro.preguntas.length;
  const [respuestas, setRespuestas] = useState<(number | null)[]>(() => respuestasGuardadas(simulacro.id, total));
  const [indice, setIndice] = useState(() => Math.max(0, respuestasGuardadas(simulacro.id, total).findIndex((r) => r === null)));
  const [quedan, setQuedan] = useState(() => restante(simulacro));
  const [enviando, setEnviando] = useState(false);
  const enviado = useRef(false);
  const tira = useRef<ComponentRef<typeof ScrollView>>(null);
  // Lo último respondido, para que el reloj entregue sin depender del render.
  const ultimas = useRef(respuestas);

  const entregar = useCallback(
    async (actuales: (number | null)[]) => {
      if (enviado.current) return;
      enviado.current = true;
      setEnviando(true);
      try {
        onEntregado(await entregarSimulacro(simulacro.id, actuales));
      } catch {
        enviado.current = false;
        setEnviando(false);
        Alert.alert("No pudimos entregar", "Tus respuestas siguen guardadas. Revisa tu conexión e inténtalo de nuevo.");
      }
    },
    [onEntregado, simulacro.id],
  );

  // Reloj: al llegar a cero se entrega solo con lo respondido.
  useEffect(() => {
    const intervalo = setInterval(() => {
      const q = restante(simulacro);
      setQuedan(q);
      if (q <= 0) entregar(ultimas.current);
    }, 500);
    return () => clearInterval(intervalo);
  }, [simulacro, entregar]);

  useEffect(() => {
    tira.current?.scrollTo({ x: Math.max(0, indice * 40 - 120), animated: true });
  }, [indice]);

  const pregunta = simulacro.preguntas[indice]!;
  const sinResponder = respuestas.filter((r) => r === null).length;

  const elegir = (opcion: number) => {
    Haptics.selectionAsync();
    const nuevas = respuestas.map((r, i) => (i === indice ? opcion : r));
    setRespuestas(nuevas);
    ultimas.current = nuevas;
    guardarRespuestas(simulacro.id, nuevas);
  };

  const confirmarEntrega = () =>
    Alert.alert(
      "¿Entregar el simulacro?",
      sinResponder ? `Te quedan ${sinResponder} preguntas sin responder; cuentan como incorrectas.` : "Respondiste todas las preguntas.",
      [
        { text: "Seguir revisando", style: "cancel" },
        { text: "Entregar", onPress: () => entregar(respuestas) },
      ],
    );

  const salir = () =>
    Alert.alert("¿Salir del simulacro?", "Tus respuestas quedan guardadas, pero el tiempo sigue corriendo.", [
      { text: "Quedarme", style: "cancel" },
      { text: "Salir", onPress: () => router.back() },
    ]);

  if (enviando) return <Centro texto="Calificando…" cargando />;

  const urgente = quedan < 60 ? ROJO : quedan < 300 ? t.ambar : t.texto;

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={salir} hitSlop={12}>
              <Text style={{ color: t.texto, fontSize: 17 }}>Salir</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={confirmarEntrega} hitSlop={12}>
              <Text style={{ color: t.ambar, fontSize: 17, fontWeight: "700" }}>Entregar</Text>
            </Pressable>
          ),
        }}
      />
      <View style={[estilos.barra, { borderBottomColor: t.borde }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IconoCronometro tamano={18} color={urgente} acento={t.ambar} />
          <Text style={{ color: urgente, fontFamily: MONO_FUERTE, fontSize: 17, fontVariant: ["tabular-nums"] }} accessibilityLabel="Tiempo restante">
            {reloj(quedan)}
          </Text>
        </View>
        <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 13 }}>
          {total - sinResponder}/{total} RESPONDIDAS
        </Text>
      </View>

      <ScrollView ref={tira} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={estilos.tira}>
        {simulacro.preguntas.map((p, i) => {
          const actual = i === indice;
          const lista = respuestas[i] !== null;
          return (
            <Pressable
              key={p.id}
              onPress={() => setIndice(i)}
              accessibilityLabel={`Pregunta ${i + 1}${lista ? ", respondida" : ""}`}
              style={[
                estilos.casilla,
                { borderColor: actual ? t.ambar : t.borde, backgroundColor: lista ? t.primario : t.superficie },
                actual && { borderWidth: 2 },
              ]}
            >
              <Text style={{ color: lista ? t.sobrePrimario : t.textoSuave, fontFamily: MONO_FUERTE, fontSize: 12 }}>{i + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}>
        <Animated.View key={pregunta.id} entering={FadeIn.duration(180)} style={{ gap: 14 }}>
          <Text style={[estilos.rotulo, { color: t.textoSuave }]}>
            PREGUNTA {indice + 1}/{total} · {nombreCapitulo(pregunta.mazo).toUpperCase()}
          </Text>
          <Text style={[estilos.pregunta, { color: t.texto }]}>{pregunta.pregunta}</Text>
          {pregunta.imagenUrl && <Figura uri={pregunta.imagenUrl} />}
          {pregunta.opciones.map((texto, i) => {
            const activa = respuestas[indice] === i;
            return (
              <BotonVivo
                key={i}
                onPress={() => elegir(i)}
                accessibilityState={{ selected: activa }}
                style={[estilos.opcion, { backgroundColor: activa ? t.primario : t.superficie, borderColor: activa ? t.primario : t.borde }]}
              >
                <Text style={[estilos.letra, { color: activa ? t.sobrePrimario : t.textoSuave, borderColor: activa ? t.sobrePrimario : t.borde }]}>
                  {"ABCDEF"[i]}
                </Text>
                <Text style={{ flex: 1, color: activa ? t.sobrePrimario : t.texto, fontSize: 16, fontWeight: "600", lineHeight: 22 }}>{texto}</Text>
              </BotonVivo>
            );
          })}
        </Animated.View>
      </ScrollView>

      <View style={[estilos.pie, { borderTopColor: t.borde, backgroundColor: t.fondo }]}>
        <BotonVivo
          disabled={indice === 0}
          onPress={() => setIndice(indice - 1)}
          style={[estilos.navegar, { borderColor: t.borde, opacity: indice === 0 ? 0.35 : 1 }]}
        >
          <Text style={{ color: t.texto, fontSize: 16, fontWeight: "700" }}>‹ Anterior</Text>
        </BotonVivo>
        {indice < total - 1 ? (
          <BotonVivo onPress={() => setIndice(indice + 1)} style={[estilos.navegar, { backgroundColor: t.primario, borderColor: t.primario }]}>
            <Text style={{ color: t.sobrePrimario, fontSize: 16, fontWeight: "700" }}>Siguiente ›</Text>
          </BotonVivo>
        ) : (
          <BotonVivo onPress={confirmarEntrega} style={[estilos.navegar, { backgroundColor: t.ambar, borderColor: t.ambar }]}>
            <Text style={{ color: t.navy, fontSize: 16, fontWeight: "700" }}>Entregar</Text>
          </BotonVivo>
        )}
      </View>
    </View>
  );
}

/** Mensaje según la nota vigesimal. */
const veredicto = (nota: number) =>
  nota >= 17 ? "¡Excelente! Dominas este tema." : nota >= 14 ? "¡Muy bien! Afina los capítulos de abajo." : nota >= 11 ? "Aprobado, pero justo." : "Toca reforzar: empieza por los capítulos de abajo.";

function Resultado({ simulacro }: { simulacro: Simulacro }) {
  const t = useTema();
  const r = simulacro.resultado!;
  const [soloFalladas, setSoloFalladas] = useState(false);
  const minutos = Math.round(r.segundos / 60);

  useEffect(() => {
    if (r.nota >= 14) {
      sonarMoneda();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Solo al mostrar el resultado por primera vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revision = r.solucion.map((s, i) => ({ ...s, i, p: simulacro.preguntas.find((q) => q.id === s.id) })).filter((s) => s.p && (!soloFalladas || s.elegida !== s.correcta));

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}>
      {/* Reemplaza los botones del examen (Salir / Entregar) que quedan en la cabecera. */}
      <Stack.Screen
        options={{
          title: `Simulacro ${simulacro.norma}`,
          gestureEnabled: true,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: t.texto, fontSize: 17 }}>Cerrar</Text>
            </Pressable>
          ),
          headerRight: () => null,
        }}
      />
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[estilos.cabecera, { backgroundColor: t.navy }]}>
        <Text style={[estilos.rotulo, { color: "#A9B7CC" }]}>
          SIMULACRO {simulacro.norma} · {r.total} PREGUNTAS
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <NumeroAnimado valor={r.nota} style={[estilos.nota, { color: r.nota >= 11 ? "#F6F5F2" : "#FF9A8A" }]} />
          <Text style={{ color: "#A9B7CC", fontFamily: MONO_FUERTE, fontSize: 24, marginBottom: 12 }}>/20</Text>
        </View>
        <Text style={{ color: "#F6F5F2", fontSize: 18, fontWeight: "700" }}>{veredicto(r.nota)}</Text>
        <Text style={{ color: "#A9B7CC", fontSize: 15 }}>
          {r.aciertos} de {r.total} aciertos · {minutos} min
        </Text>
      </Animated.View>

      <Text style={[estilos.rotulo, { color: t.textoSuave, marginTop: 8 }]}>POR CAPÍTULO · DE MÁS DIFÍCIL A MÁS FÁCIL</Text>
      {r.porMazo.map((m, i) => (
        <Animated.View key={m.mazo} entering={FadeInDown.delay(i * 50)} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ flex: 1, color: t.texto, fontSize: 15 }}>{nombreCapitulo(m.mazo)}</Text>
            <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 13 }}>
              {m.aciertos}/{m.total}
            </Text>
          </View>
          <View style={[estilos.barraFondo, { backgroundColor: t.borde }]}>
            <View
              style={[estilos.barraLlena, { width: `${(m.aciertos / m.total) * 100}%`, backgroundColor: m.aciertos / m.total >= 0.55 ? VERDE : t.ambar }]}
            />
          </View>
        </Animated.View>
      ))}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <Text style={[estilos.rotulo, { color: t.textoSuave }]}>REVISIÓN</Text>
        <Pressable onPress={() => setSoloFalladas(!soloFalladas)} hitSlop={8}>
          <Text style={{ color: t.ambar, fontWeight: "700" }}>{soloFalladas ? "Ver todas" : "Solo las falladas"}</Text>
        </Pressable>
      </View>
      {revision.length === 0 && <Text style={{ color: t.textoSuave }}>¡No fallaste ninguna!</Text>}
      {revision.map((s) => {
        const p = s.p!;
        const bien = s.elegida === s.correcta;
        return (
          <View key={s.id} style={[estilos.revision, { backgroundColor: t.superficie, borderColor: t.borde }]}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {bien ? <IconoCorrecto tamano={18} color={VERDE} /> : <IconoIncorrecto tamano={18} color={ROJO} />}
              <Text style={{ flex: 1, color: t.texto, fontWeight: "700", fontSize: 15, lineHeight: 21 }}>
                {s.i + 1}. {p.pregunta}
              </Text>
            </View>
            {!bien && <Text style={{ color: ROJO, fontSize: 14 }}>Tu respuesta: {s.elegida === null ? "sin responder" : p.opciones[s.elegida]}</Text>}
            <Text style={{ color: VERDE, fontSize: 14, fontWeight: "600" }}>Correcta: {p.opciones[s.correcta]}</Text>
            {!!s.explicacion && <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 19 }}>{s.explicacion}</Text>}
            {s.citas.map((c) => (
              <CitaNorma
                key={c.articulo}
                norma={simulacro.norma}
                articulo={c.articulo}
                extracto={c.extracto}
                colores={{ fondo: t.fondo, borde: t.borde, acento: t.ambar, texto: t.texto, suave: t.textoSuave }}
              />
            ))}
          </View>
        );
      })}

      <BotonVivo onPress={() => router.replace("/simulacro")} style={[estilos.boton, { backgroundColor: t.primario }]}>
        <Text style={{ color: t.sobrePrimario, fontSize: 17, fontWeight: "700" }}>Otro simulacro</Text>
      </BotonVivo>
    </ScrollView>
  );
}

function Centro({ texto, cargando }: { texto?: string; cargando?: boolean }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: t.fondo, padding: 24 }}>
      {(!texto || cargando) && <ActivityIndicator color={t.ambar} />}
      {texto && <Text style={{ color: t.textoSuave, fontSize: 16, textAlign: "center" }}>{texto}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tira: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  casilla: { width: 34, height: 34, borderWidth: 1, borderRadius: RADIO.chico, alignItems: "center", justifyContent: "center" },
  rotulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4 },
  pregunta: { fontSize: 20, fontWeight: "700", lineHeight: 27, letterSpacing: -0.2 },
  letra: { width: 26, height: 26, borderWidth: 1, borderRadius: 4, textAlign: "center", lineHeight: 24, fontFamily: MONO_FUERTE, fontSize: 13 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: RADIO.medio, padding: 16, minHeight: 58 },
  pie: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth },
  navegar: { flex: 1, borderWidth: 1, borderRadius: RADIO.medio, paddingVertical: 14, alignItems: "center" },
  cabecera: { borderRadius: 10, padding: 20, gap: 4 },
  nota: { fontSize: 72, fontFamily: MONO_FUERTE, letterSpacing: -3 },
  barraFondo: { height: 8, borderRadius: 4, overflow: "hidden" },
  barraLlena: { height: 8, borderRadius: 4 },
  revision: { padding: 14, borderRadius: RADIO.medio, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  boton: { borderRadius: RADIO.medio, paddingVertical: 16, alignItems: "center", marginTop: 12 },
});
