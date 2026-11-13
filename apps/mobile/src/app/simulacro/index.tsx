import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SIMULACRO, type OpcionesSimulacro } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { IconoChevron, IconoCorrecto, IconoPremium, IconoSimulacro, MarcoIcono } from "@/components/Iconos";
import { crearSimulacro, nombreCapitulo, opcionesSimulacro } from "@/lib/simulacro";
import { MONO, MONO_FUERTE, RADIO, useTema } from "@/lib/tema";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "America/Lima" }).format(new Date(iso)).replace(".", "");

/** Elegir el simulacro (norma, largo y capítulos) y ver los anteriores. */
export default function Simulacros() {
  const t = useTema();
  const [datos, setDatos] = useState<OpcionesSimulacro | null>(null);
  const [error, setError] = useState(false);
  const [norma, setNorma] = useState<string | null>(null);
  const [largo, setLargo] = useState<number>(SIMULACRO.largoGratis);
  const [mazos, setMazos] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      opcionesSimulacro()
        .then((d) => {
          setDatos(d);
          setNorma((actual) => actual ?? d.normas[0]?.codigo ?? null);
        })
        .catch(() => setError(true));
    }, []),
  );

  if (error) return <Centro texto="No pudimos cargar los simulacros. Revisa tu conexión." />;
  if (!datos) return <Centro />;
  if (datos.normas.length === 0) return <Centro texto="Todavía no hay preguntas suficientes para un simulacro." />;

  const elegida = datos.normas.find((n) => n.codigo === norma) ?? datos.normas[0]!;
  const disponibles = mazos.length ? elegida.mazos.filter((m) => mazos.includes(m.id)).reduce((s, m) => s + m.preguntas, 0) : elegida.preguntas;
  const sinGratis = !datos.premium && datos.gratisRestantes === 0;
  const minutos = (largo * SIMULACRO.segundosPorPregunta) / 60;

  const alternarMazo = (id: string) => {
    Haptics.selectionAsync();
    setMazos((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const empezar = async () => {
    if (sinGratis || (largo > SIMULACRO.largoGratis && !datos.premium)) return router.push("/premium");
    setCreando(true);
    try {
      const s = await crearSimulacro({ norma: elegida.codigo, preguntas: largo, ...(mazos.length ? { mazos } : {}) });
      router.push(`/simulacro/${s.id}`);
    } catch (e) {
      Alert.alert("No pudimos empezar", (e as Error).message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor}>
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 6 }}>
        <IconoSimulacro tamano={44} color={t.texto} acento={t.ambar} />
        <Text style={[estilos.titulo, { color: t.texto }]}>Simulacro de examen</Text>
        <Text style={{ color: t.textoSuave, fontSize: 16, lineHeight: 22 }}>
          Preguntas al azar con tiempo límite, como en un examen. Al entregar ves tu nota sobre 20, en qué capítulos fallas y el artículo de cada
          respuesta.
        </Text>
      </Animated.View>

      {datos.enCurso && (
        <BotonVivo
          onPress={() => router.push(`/simulacro/${datos.enCurso!.id}`)}
          style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.ambar }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[estilos.rotulo, { color: t.ambar }]}>EN CURSO · {datos.enCurso.norma}</Text>
            <Text style={{ color: t.texto, fontSize: 16, fontWeight: "700" }}>Continúa tu simulacro de {datos.enCurso.total} preguntas</Text>
          </View>
          <IconoChevron color={t.textoSuave} />
        </BotonVivo>
      )}

      {datos.normas.length > 1 && (
        <>
          <Text style={[estilos.rotulo, { color: t.textoSuave }]}>NORMA</Text>
          <View style={estilos.chips}>
            {datos.normas.map((n) => (
              <Pressable
                key={n.codigo}
                onPress={() => (setNorma(n.codigo), setMazos([]))}
                style={[estilos.chip, { borderColor: n.codigo === elegida.codigo ? t.ambar : t.borde, backgroundColor: t.superficie }]}
              >
                <Text style={{ color: t.texto, fontFamily: MONO_FUERTE }}>{n.codigo}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={[estilos.rotulo, { color: t.textoSuave }]}>PREGUNTAS</Text>
      <View style={estilos.chips}>
        {SIMULACRO.largos.map((n) => {
          const bloqueado = n > SIMULACRO.largoGratis && !datos.premium;
          const activo = largo === n;
          return (
            <Pressable
              key={n}
              onPress={() => (Haptics.selectionAsync(), setLargo(n))}
              accessibilityState={{ selected: activo }}
              style={[estilos.largo, { borderColor: activo ? t.ambar : t.borde, backgroundColor: t.superficie }]}
            >
              <Text style={{ color: t.texto, fontFamily: MONO_FUERTE, fontSize: 22 }}>{n}</Text>
              <Text style={{ color: t.textoSuave, fontSize: 13 }}>{(n * SIMULACRO.segundosPorPregunta) / 60} min</Text>
              {bloqueado && (
                <View style={estilos.candado}>
                  <IconoPremium tamano={14} color={t.textoSuave} acento={t.ambar} />
                  <Text style={{ color: t.textoSuave, fontSize: 11, fontFamily: MONO }}>PREMIUM</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={[estilos.rotulo, { color: t.textoSuave }]}>CAPÍTULOS · {mazos.length ? `${mazos.length} ELEGIDOS` : "TODA LA NORMA"}</Text>
      <View style={[estilos.lista, { borderColor: t.borde, backgroundColor: t.superficie }]}>
        <Pressable onPress={() => setMazos([])} style={estilos.capitulo}>
          <Marca activa={mazos.length === 0} />
          <Text style={{ flex: 1, color: t.texto, fontWeight: "700" }}>Toda la {elegida.codigo}</Text>
          <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 12 }}>{elegida.preguntas}</Text>
        </Pressable>
        {elegida.mazos.map((m) => (
          <Pressable key={m.id} onPress={() => alternarMazo(m.id)} style={[estilos.capitulo, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borde }]}>
            <Marca activa={mazos.includes(m.id)} />
            <Text style={{ flex: 1, color: t.texto }}>{nombreCapitulo(m.titulo)}</Text>
            <Text style={{ color: t.textoSuave, fontFamily: MONO, fontSize: 12 }}>{m.preguntas}</Text>
          </Pressable>
        ))}
      </View>
      {disponibles < largo && (
        <Text style={{ color: "#D64545", fontSize: 14 }}>
          Esos capítulos tienen {disponibles} preguntas: elige más capítulos o un simulacro más corto.
        </Text>
      )}

      <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
        {minutos} minutos · {SIMULACRO.segundosPorPregunta} s por pregunta · puedes cambiar respuestas hasta entregar
        {datos.premium
          ? "."
          : sinGratis
            ? ". Ya usaste tu simulacro gratis de esta semana."
            : `. Plan gratuito: ${datos.gratisRestantes} simulacro de ${SIMULACRO.largoGratis} por semana.`}
      </Text>

      <BotonVivo
        disabled={creando || (disponibles < largo && !sinGratis)}
        onPress={empezar}
        style={[estilos.boton, { backgroundColor: t.primario }, disponibles < largo && !sinGratis && { opacity: 0.4 }]}
      >
        {creando ? (
          <ActivityIndicator color={t.sobrePrimario} />
        ) : (
          <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>
            {sinGratis || (largo > SIMULACRO.largoGratis && !datos.premium) ? "Desbloquear con Premium" : "Empezar simulacro"}
          </Text>
        )}
      </BotonVivo>

      {datos.historial.length > 0 && (
        <>
          <Text style={[estilos.rotulo, { color: t.textoSuave, marginTop: 16 }]}>TUS SIMULACROS</Text>
          {datos.historial.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/simulacro/${h.id}`)}
              style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
            >
              <MarcoIcono borde={t.borde} fondo={t.fondo}>
                <Text style={{ color: h.nota === null ? t.textoSuave : h.nota >= 11 ? t.texto : "#D64545", fontFamily: MONO_FUERTE, fontSize: 16 }}>
                  {h.nota ?? "—"}
                </Text>
              </MarcoIcono>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.texto, fontWeight: "700" }}>
                  {h.norma} · {h.total} preguntas
                </Text>
                <Text style={{ color: t.textoSuave, fontSize: 13 }}>
                  {fecha(h.creadoEn)} · {h.entregado ? `${h.aciertos} aciertos` : "sin entregar"}
                </Text>
              </View>
              <IconoChevron color={t.textoSuave} />
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Marca({ activa }: { activa: boolean }) {
  const t = useTema();
  return (
    <View style={[estilos.marca, { borderColor: activa ? t.ambar : t.borde, backgroundColor: activa ? t.ambar : "transparent" }]}>
      {activa && <IconoCorrecto tamano={14} color={t.navy} />}
    </View>
  );
}

function Centro({ texto }: { texto?: string }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.fondo, padding: 24 }}>
      {texto ? <Text style={{ color: t.textoSuave, fontSize: 16, textAlign: "center" }}>{texto}</Text> : <ActivityIndicator color={t.ambar} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, gap: 10, paddingBottom: 48 },
  titulo: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginTop: 6 },
  rotulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4, marginTop: 10 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderWidth: 1.5, borderRadius: RADIO.medio, paddingVertical: 10, paddingHorizontal: 16 },
  largo: { flex: 1, borderWidth: 1.5, borderRadius: RADIO.medio, padding: 14, gap: 2 },
  candado: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  lista: { borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIO.medio, overflow: "hidden" },
  capitulo: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  marca: { width: 20, height: 20, borderWidth: 1.5, borderRadius: RADIO.chico, alignItems: "center", justifyContent: "center" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: RADIO.medio, borderWidth: 1 },
  boton: { borderRadius: RADIO.medio, paddingVertical: 16, alignItems: "center", minHeight: 54, justifyContent: "center", marginTop: 6 },
  botonTexto: { fontSize: 17, fontWeight: "700" },
});
