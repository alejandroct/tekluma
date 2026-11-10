import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { EstadoCupo, PaqueteMazo } from "@tekluma/shared";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown, FadeInRight, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { Grade } from "ts-fsrs";
import { CupoAgotado } from "@/components/CupoAgotado";
import { Tarjeta } from "@/components/Tarjeta";
import { intersticialAlTerminar } from "@/lib/anuncios";
import { consumirTarjeta, cupoEnCache } from "@/lib/cupo";
import { descargarPaquete, paqueteLocal } from "@/lib/mazos";
import { calificar, pendientes, Rating, sincronizar } from "@/lib/repaso";
import { MONO, MONO_FUERTE, useTema } from "@/lib/tema";
import { IconoHito } from "@/components/Iconos";

const NOTAS: { nota: Grade; texto: string; color: string }[] = [
  { nota: Rating.Again, texto: "Otra vez", color: "#D64545" },
  { nota: Rating.Hard, texto: "Difícil", color: "#3B5174" },
  { nota: Rating.Good, texto: "Bien", color: "#1F9D55" },
  { nota: Rating.Easy, texto: "Fácil", color: "#FF8A1F" },
];

export default function Repaso() {
  const t = useTema();
  const { mazoId } = useLocalSearchParams<{ mazoId: string }>();
  const [mazo, setMazo] = useState<PaqueteMazo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cola, setCola] = useState<string[]>([]);
  const [revelada, setRevelada] = useState(false);
  const [cupo, setCupo] = useState<EstadoCupo | null>(cupoEnCache);
  /** Tarjeta para la que el servidor ya dio permiso (consumió cupo o ya se había visto hoy). */
  const [permitida, setPermitida] = useState<string | null>(null);
  const [agotado, setAgotado] = useState(false);
  const vistasEnSesion = useRef(0);
  const actualId = mazo ? cola[0] : undefined;

  // Abre la copia cifrada del dispositivo; la primera vez se descarga y queda disponible sin conexión.
  useEffect(() => {
    let vigente = true;
    paqueteLocal(mazoId)
      .then((local) => local ?? descargarPaquete(mazoId))
      .then((p) => {
        if (!vigente) return;
        setMazo(p);
        setCola(pendientes(mazoId, p.tarjetas.map((c) => c.id)));
      })
      .catch(() => vigente && setError("No pudimos descargar el mazo. Revisa tu conexión."));
    return () => {
      vigente = false;
    };
  }, [mazoId]);

  // Antes de mostrar cada tarjeta se descuenta del cupo diario.
  useEffect(() => {
    if (!actualId || permitida === actualId || agotado) return;
    let vigente = true;
    consumirTarjeta(actualId).then(({ permitido, estado }) => {
      if (!vigente) return;
      if (estado) setCupo(estado);
      if (permitido) {
        vistasEnSesion.current += 1;
        setPermitida(actualId);
      } else setAgotado(true);
    });
    return () => {
      vigente = false;
    };
  }, [actualId, permitida, agotado]);

  // Al terminar una sesión con tarjetas vistas, un intersticial (con tope diario; nunca a Premium).
  useEffect(() => {
    if (mazo && !actualId && vistasEnSesion.current > 0 && cupo) {
      intersticialAlTerminar(cupo.reglas.maxIntersticialesDia, cupo.premium).catch(() => {});
    }
  }, [mazo, actualId, cupo]);

  // Al salir del repaso se sube el progreso.
  useEffect(() => () => void sincronizar().catch(() => {}), []);

  if (!mazo) {
    return (
      <View style={[estilos.fin, { backgroundColor: t.fondo }]}>
        {error ? <Text style={{ color: t.textoSuave, fontSize: 16, textAlign: "center", padding: 24 }}>{error}</Text> : <ActivityIndicator color={t.ambar} />}
      </View>
    );
  }

  const actual = mazo.tarjetas.find((c) => c.id === cola[0]);

  if (!actual) {
    return (
      <View style={[estilos.fin, { backgroundColor: t.fondo }]}>
        <Animated.View entering={ZoomIn.springify()}>
          <IconoHito tamano={64} color={t.texto} acento={t.ambar} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(120)} style={[estilos.finTitulo, { color: t.texto }]}>
          ¡Sesión completa!
        </Animated.Text>
        <Pressable onPress={() => router.back()} style={[estilos.finBoton, { backgroundColor: t.primario }]}>
          <Text style={{ color: t.sobrePrimario, fontWeight: "700", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (agotado && cupo) {
    return (
      <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={{ padding: 24 }}>
        <CupoAgotado
          estado={cupo}
          onAmpliado={(nuevo) => {
            setCupo(nuevo);
            if (nuevo.restantes > 0) setAgotado(false);
          }}
        />
      </ScrollView>
    );
  }

  if (permitida !== actual.id) {
    return (
      <View style={[estilos.fin, { backgroundColor: t.fondo }]}>
        <ActivityIndicator color={t.ambar} />
      </View>
    );
  }

  const responder = (nota: Grade) => {
    Haptics.selectionAsync();
    calificar(mazoId, actual.id, nota);
    // "Otra vez" la reinserta al final de la sesión.
    setCola(([, ...resto]) => (nota === Rating.Again ? [...resto, actual.id] : resto));
    setRevelada(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Rótulo de la sesión: norma, pendientes y cupo, como en una hoja de plano. */}
        <View style={[estilos.rotulo, { borderColor: t.borde }]}>
          <View style={estilos.celda}>
            <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>NORMA</Text>
            <Text style={[estilos.celdaValor, { color: t.texto }]}>{mazo.norma.codigo}</Text>
          </View>
          <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
            <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>QUEDAN</Text>
            <Text style={[estilos.celdaValor, { color: t.texto }]}>{cola.length}</Text>
          </View>
          {cupo && !cupo.premium && (
            <View style={[estilos.celda, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: t.borde }]}>
              <Text style={[estilos.celdaEtiqueta, { color: t.textoSuave }]}>CUPO HOY</Text>
              <Text style={[estilos.celdaValor, { color: t.texto }]}>{cupo.restantes}</Text>
            </View>
          )}
        </View>
        <Animated.View key={`${actual.id}-${cola.length}`} entering={FadeInRight.springify().damping(16)}>
          <Tarjeta contenido={actual.contenido} revelada={revelada} onRevelar={() => setRevelada(true)} />
        </Animated.View>
        {revelada &&
          actual.citas.map((c, i) => (
            <Animated.View
              key={c.articuloId}
              entering={FadeInDown.delay(120 + i * 80)}
              style={[estilos.cita, { backgroundColor: t.superficie, borderColor: t.borde }]}
            >
              <Text style={[estilos.citaArticulo, { color: t.ambar }]}>
                {mazo.norma.codigo} · ART. {c.articulo}
              </Text>
              <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 20 }}>{c.extracto}</Text>
            </Animated.View>
          ))}
      </ScrollView>
      {revelada && (
        <Animated.View entering={FadeInUp.springify().damping(18)} style={[estilos.notas, { borderColor: t.borde, backgroundColor: t.superficie }]}>
          {NOTAS.map((n) => (
            <Pressable
              key={n.texto}
              onPress={() => responder(n.nota)}
              style={({ pressed }) => [estilos.nota, { borderColor: t.borde, backgroundColor: pressed ? t.fondo : t.superficie, borderTopColor: n.color }]}
            >
              <Text style={[estilos.notaTexto, { color: t.texto }]}>{n.texto}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  notas: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth },
  nota: { flex: 1, borderRadius: 6, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderTopWidth: 3 },
  notaTexto: { fontWeight: "700", fontSize: 15 },
  cita: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 14, gap: 4 },
  citaArticulo: { fontSize: 12, fontFamily: MONO_FUERTE, letterSpacing: 0.6 },
  rotulo: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  celda: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  celdaEtiqueta: { fontSize: 10, fontFamily: MONO, letterSpacing: 1.2 },
  celdaValor: { fontSize: 16, fontFamily: MONO_FUERTE },
  fin: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  finTitulo: { fontSize: 26, fontWeight: "700" },
  finBoton: { borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40 },
});
