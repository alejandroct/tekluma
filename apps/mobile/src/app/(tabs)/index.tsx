import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { EstadoCupo, PreguntaDiaria } from "@tekluma/shared";
import { BotonVivo, NumeroAnimado } from "@/components/Animaciones";
import { Casillas, IconoChevron, IconoDuelo, IconoPreguntaDia, MarcoIcono } from "@/components/Iconos";
import { cupoEnCache, obtenerCupo } from "@/lib/cupo";
import { obtenerDiaria } from "@/lib/diaria";
import { paquetesLocales } from "@/lib/mazos";
import { pendientes, sincronizar } from "@/lib/repaso";
import { useTema } from "@/lib/tema";

type Resumen = { mazoId: string; codigo: string; pendientes: number };

export default function Hoy() {
  const t = useTema();
  const [resumen, setResumen] = useState<Resumen[] | null>(null);
  const [cupo, setCupo] = useState<EstadoCupo | null>(cupoEnCache);
  const [diaria, setDiaria] = useState<PreguntaDiaria | null>(null);

  useFocusEffect(
    useCallback(() => {
      paquetesLocales()
        .then((paquetes) =>
          setResumen(
            paquetes.map((p) => ({
              mazoId: p.mazoId,
              codigo: p.norma.codigo,
              pendientes: pendientes(p.mazoId, p.tarjetas.map((c) => c.id)).length,
            })),
          ),
        )
        .catch(() => setResumen([]));
      obtenerCupo()
        .then(setCupo)
        .catch(() => {});
      obtenerDiaria()
        .then(setDiaria)
        .catch(() => {});
      // Sube el progreso en segundo plano; si no hay conexión se reintenta luego.
      sincronizar().catch(() => {});
    }, []),
  );

  const total = resumen?.reduce((s, r) => s + r.pendientes, 0) ?? 0;
  const siguiente = resumen?.find((r) => r.pendientes > 0);
  const sinMazos = resumen !== null && resumen.length === 0;

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor} contentInsetAdjustmentBehavior="automatic">
      <Text style={[estilos.saludo, { color: t.textoSuave }]}>Hoy</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>Que la norma fragüe.</Text>

      {diaria && <TarjetaDiaria diaria={diaria} />}
      <AccesoDuelo />

      <Animated.View entering={FadeInDown.springify()} style={[estilos.tarjeta, { backgroundColor: t.navy }]}>
        <NumeroAnimado valor={total} style={estilos.numero} />
        <Text style={estilos.etiqueta}>{sinMazos ? "Aún no tienes mazos descargados" : "tarjetas por repasar"}</Text>
        <BotonVivo
          disabled={!sinMazos && !siguiente}
          onPress={() => (sinMazos ? router.push("/mazos") : siguiente && router.push(`/repaso/${siguiente.mazoId}`))}
          style={[estilos.boton, { backgroundColor: t.ambar }, !sinMazos && !siguiente && estilos.botonInactivo]}
        >
          <Text style={[estilos.botonTexto, !sinMazos && !siguiente && { color: t.niebla }]}>
            {sinMazos ? "Elegir un mazo" : siguiente ? `Repasar ${siguiente.codigo}` : "¡Al día!"}
          </Text>
        </BotonVivo>
      </Animated.View>

      {cupo && (
        <Animated.View entering={FadeInDown.delay(90).springify()}>
        <Pressable
          disabled={cupo.premium}
          onPress={() => router.push("/premium")}
          style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: t.texto, fontSize: 15, fontWeight: "700" }}>
              {cupo.premium ? "★ Premium · tarjetas ilimitadas" : `Cupo de hoy: ${cupo.restantes} de ${cupo.limite} tarjetas`}
            </Text>
            {!cupo.premium && (
              <View style={[estilos.barra, { backgroundColor: t.borde }]}>
                <View style={[estilos.barraLlena, { backgroundColor: t.ambar, width: `${Math.min(100, (cupo.usadas / Math.max(1, cupo.limite)) * 100)}%` }]} />
              </View>
            )}
          </View>
          {!cupo.premium && <Text style={{ color: t.ambar, fontWeight: "800", marginLeft: 12 }}>Ilimitado ›</Text>}
        </Pressable>
        </Animated.View>
      )}

      {resumen && resumen.length > 1 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {resumen.map((r, i) => (
            <Animated.View key={r.mazoId} entering={FadeInDown.delay(150 + i * 60).springify()}>
            <Pressable
              disabled={r.pendientes === 0}
              onPress={() => router.push(`/repaso/${r.mazoId}`)}
              style={[estilos.fila, { backgroundColor: t.superficie, borderColor: t.borde }]}
            >
              <Text style={{ color: t.texto, fontSize: 16, fontWeight: "700" }}>{r.codigo}</Text>
              <Text style={{ color: r.pendientes ? t.ambar : t.textoSuave, fontSize: 16, fontWeight: "700" }}>{r.pendientes}</Text>
            </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** Acceso a la pregunta del día: invita a jugar o, si ya jugó, muestra el resultado y anima a compartir. */
function TarjetaDiaria({ diaria }: { diaria: PreguntaDiaria }) {
  const t = useTema();
  const { estado } = diaria;
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <BotonVivo onPress={() => router.push("/diaria")} style={[estilos.acceso, { backgroundColor: t.superficie, borderColor: estado.terminada ? t.borde : t.ambar }]}>
        <MarcoIcono borde={t.borde} fondo={t.fondo}>
          <IconoPreguntaDia color={t.texto} acento={t.ambar} />
        </MarcoIcono>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[estilos.accesoEtiqueta, { color: t.textoSuave }]}>
            PREGUNTA DEL DÍA <Text style={{ color: t.ambar }}>#{diaria.numero}</Text> · {diaria.norma}
          </Text>
          {estado.terminada ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Casillas intentos={estado.intentos} correcta={estado.solucion?.correcta} maximo={diaria.intentosMax} vacio={t.borde} />
              <Text style={[estilos.accesoTitulo, { color: t.texto }]}>Reta a tu grupo</Text>
            </View>
          ) : (
            <Text style={[estilos.accesoTitulo, { color: t.texto }]}>Juega y gana hasta {diaria.premios[0]} monedas</Text>
          )}
        </View>
        <IconoChevron color={t.textoSuave} />
      </BotonVivo>
    </Animated.View>
  );
}

function AccesoDuelo() {
  const t = useTema();
  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <BotonVivo onPress={() => router.push("/duelo/nuevo")} style={[estilos.acceso, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <MarcoIcono borde={t.borde} fondo={t.fondo}>
          <IconoDuelo color={t.texto} acento={t.ambar} />
        </MarcoIcono>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[estilos.accesoEtiqueta, { color: t.textoSuave }]}>DUELO 1 VS 1</Text>
          <Text style={[estilos.accesoTitulo, { color: t.texto }]}>Reta a un colega por WhatsApp</Text>
        </View>
        <IconoChevron color={t.textoSuave} />
      </BotonVivo>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  acceso: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  accesoEtiqueta: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  accesoTitulo: { fontSize: 16, fontWeight: "700" },
  contenedor: { padding: 20, gap: 8 },
  saludo: { fontSize: 15, fontWeight: "600" },
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 16 },
  tarjeta: { borderRadius: 24, padding: 24, gap: 4 },
  numero: { color: "#FFFFFF", fontSize: 56, fontWeight: "800", fontVariant: ["tabular-nums"] },
  etiqueta: { color: "#A9B7CC", fontSize: 16, marginBottom: 20 },
  boton: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  botonInactivo: { backgroundColor: "#26364F" },
  botonTexto: { color: "#0F1B2D", fontSize: 17, fontWeight: "700" },
  barra: { height: 6, borderRadius: 3, overflow: "hidden" },
  barraLlena: { height: 6, borderRadius: 3 },
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
});
