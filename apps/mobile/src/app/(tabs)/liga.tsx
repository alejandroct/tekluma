import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { DIVISIONES, REGIONES, siglaUniversidad, type EstadoLiga, type FilaRanking } from "@tekluma/shared";
import { BotonVivo, NumeroAnimado } from "@/components/Animaciones";
import { TarjetaCompartible } from "@/components/TarjetaCompartible";
import { obtenerLiga, rankingRegiones, rankingUniversidades } from "@/lib/liga";
import { useTema } from "@/lib/tema";
import { IconoCasco, IconoDivision, IconoRegion, IconoUniversidad, Puesto } from "@/components/Iconos";

type Vista = "liga" | "universidades" | "regiones";
const VERDE = "#1F9D55";
const ROJO = "#D64545";

/** Liga semanal por divisiones + rankings de universidades y regiones. */
export default function Liga() {
  const t = useTema();
  const [estado, setEstado] = useState<EstadoLiga | null>(null);
  const [vista, setVista] = useState<Vista>("liga");
  const [grupos, setGrupos] = useState<FilaRanking[] | null>(null);
  const [compartir, setCompartir] = useState(false);

  const cargar = useCallback(() => {
    obtenerLiga()
      .then(setEstado)
      .catch(() => {});
  }, []);
  useFocusEffect(cargar);

  const cambiarVista = (v: Vista) => {
    setVista(v);
    setGrupos(null);
    if (v === "universidades") rankingUniversidades().then(setGrupos, () => setGrupos([]));
    if (v === "regiones") rankingRegiones().then(setGrupos, () => setGrupos([]));
  };

  if (!estado) {
    return (
      <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
        <ActivityIndicator color={t.ambar} />
      </View>
    );
  }

  const division = DIVISIONES.find((d) => d.codigo === estado.division)!;
  const siguiente = DIVISIONES[DIVISIONES.indexOf(division) + 1];
  const progresoTitulo = estado.siguienteTitulo
    ? Math.min(1, estado.puntosTotales / estado.siguienteTitulo.desde)
    : 1;
  const miGrupo =
    vista === "universidades" && estado.universidad
      ? siglaUniversidad(estado.universidad)
      : vista === "regiones" && estado.region
        ? REGIONES[estado.region]
        : null;
  const falta = vista === "universidades" ? !estado.universidad : vista === "regiones" ? !estado.region : false;

  return (
    <ScrollView
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={estilos.contenido}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
    >
      <Text style={[estilos.titulo, { color: t.texto }]}>Liga</Text>

      {estado.cambioDivision === "subio" && (
        <Animated.View entering={ZoomIn.springify()} style={[estilos.aviso, { backgroundColor: "rgba(31,157,85,0.12)", borderColor: VERDE }]}>
          <Text style={{ color: t.texto, fontWeight: "800", fontSize: 16 }}>
            ¡Subiste a {division.nombre}! Así se construye.
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.springify()} style={[estilos.heroe, { backgroundColor: t.navy }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={[estilos.insignia, { backgroundColor: division.color }]}>
            <IconoDivision division={division.codigo} tamano={36} color="#FFFFFF" acento="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#A9B7CC", fontWeight: "700" }}>Liga semanal · cierra en {estado.cierraEn}</Text>
            <Text style={estilos.heroeTitulo}>{division.nombre}</Text>
          </View>
        </View>
        <View style={estilos.cifras}>
          <View style={estilos.cifra}>
            <NumeroAnimado valor={estado.miPosicion} prefijo="#" style={estilos.cifraNumero} />
            <Text style={estilos.cifraEtiqueta}>tu puesto</Text>
          </View>
          <View style={estilos.cifra}>
            <NumeroAnimado valor={estado.misPuntosSemana} style={estilos.cifraNumero} />
            <Text style={estilos.cifraEtiqueta}>puntos esta semana</Text>
          </View>
          <View style={estilos.cifra}>
            <Text style={estilos.cifraNumero}>
              {estado.puntosHoy}/{estado.topeDiario}
            </Text>
            <Text style={estilos.cifraEtiqueta}>hoy</Text>
          </View>
        </View>
        <Text style={{ color: "#A9B7CC", fontSize: 14 }}>
          {!siguiente
            ? "Estás en la división más alta. ¡Defiéndela!"
            : estado.suben === 0
              ? `Cuando se sumen más colegas a tu liga, los primeros subirán a ${siguiente.nombre}`
              : estado.suben === 1
                ? `El primero sube a ${siguiente.nombre}`
                : `Los ${estado.suben} primeros suben a ${siguiente.nombre}`}
          {estado.bajan > 0 ? ` · los ${estado.bajan} últimos bajan` : ""}
        </Text>
        <BotonVivo onPress={() => setCompartir(true)} style={[estilos.boton, { backgroundColor: t.ambar }]}>
          <Text style={[estilos.botonTexto, { color: t.navy }]}>Compartir mi liga</Text>
        </BotonVivo>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={[estilos.carrera, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        <Text style={{ color: t.ambar, fontWeight: "800", fontSize: 13 }}>TU CARGO EN OBRA</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconoCasco tamano={26} color={t.texto} acento={t.ambar} />
          <Text style={{ color: t.texto, fontWeight: "800", fontSize: 20 }}>{estado.titulo}</Text>
        </View>
        <View style={[estilos.barra, { backgroundColor: t.borde }]}>
          <View style={[estilos.barraLlena, { backgroundColor: t.ambar, width: `${progresoTitulo * 100}%` }]} />
        </View>
        <Text style={{ color: t.textoSuave, fontSize: 14 }}>
          {estado.siguienteTitulo
            ? `${estado.puntosTotales} / ${estado.siguienteTitulo.desde} puntos para ${estado.siguienteTitulo.nombre}`
            : `${estado.puntosTotales} puntos: llegaste a lo más alto`}
        </Text>
      </Animated.View>

      <View style={[estilos.segmentos, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        {(["liga", "universidades", "regiones"] as const).map((v) => (
          <Pressable key={v} onPress={() => cambiarVista(v)} style={[estilos.segmento, vista === v && { backgroundColor: t.navy }]}>
            <Text style={{ color: vista === v ? "#FFFFFF" : t.textoSuave, fontWeight: "800", fontSize: 14 }}>
              {v === "liga" ? "Mi liga" : v === "universidades" ? "Universidades" : "Regiones"}
            </Text>
          </Pressable>
        ))}
      </View>

      {vista === "liga" &&
        estado.tabla.map((f, i) => {
          const sube = f.posicion <= estado.suben && f.puntos > 0;
          const baja = estado.bajan > 0 && f.posicion > estado.tabla.length - estado.bajan;
          return (
            <Animated.View key={`${f.posicion}-${f.nombre}`} entering={FadeInDown.delay(Math.min(i, 12) * 40)}>
              <Fila fila={f} resaltar={!!f.soyYo} marca={sube ? VERDE : baja ? ROJO : undefined} />
            </Animated.View>
          );
        })}

      {vista !== "liga" && falta && (
        <BotonVivo onPress={() => router.push("/afiliacion")} style={[estilos.invitacion, { backgroundColor: t.superficie, borderColor: t.ambar }]}>
          {vista === "universidades" ? <IconoUniversidad tamano={28} color={t.texto} acento={t.ambar} /> : <IconoRegion tamano={28} color={t.texto} acento={t.ambar} />}
          <Text style={{ flex: 1, color: t.texto, fontWeight: "700", fontSize: 16 }}>
            {vista === "universidades" ? "Elige tu universidad y suma puntos por ella" : "Elige tu región y súmale puntos"}
          </Text>
          <Text style={{ color: t.ambar, fontSize: 22, fontWeight: "800" }}>›</Text>
        </BotonVivo>
      )}

      {vista !== "liga" &&
        (grupos === null ? (
          <ActivityIndicator color={t.ambar} />
        ) : grupos.length === 0 ? (
          <Text style={{ color: t.textoSuave, fontSize: 15 }}>Aún no hay puntos esta semana. ¡Sé el primero!</Text>
        ) : (
          grupos.map((g, i) => (
            <Animated.View key={g.nombre} entering={FadeInDown.delay(Math.min(i, 12) * 40)}>
              <Fila fila={g} resaltar={g.nombre === miGrupo} />
            </Animated.View>
          ))
        ))}

      {vista !== "liga" && !falta && (
        <Pressable onPress={() => router.push("/afiliacion")} hitSlop={8}>
          <Text style={{ color: t.ambar, fontWeight: "700", textAlign: "center" }}>Cambiar universidad o región</Text>
        </Pressable>
      )}

      <View style={[estilos.reglas, { borderColor: t.borde }]}>
        <Text style={{ color: t.texto, fontWeight: "800" }}>Cómo sumar puntos de obra</Text>
        <Text style={{ color: t.textoSuave, fontSize: 14, lineHeight: 21 }}>
          • 1 por cada tarjeta distinta que repasas (hasta 20 al día){"\n"}• Pregunta del día: 10, 7 o 5 según el intento{"\n"}• Duelos: 2 por acierto (hasta 30 al día){"\n"}• Tope: {estado.topeDiario} puntos al día. Gana quien sabe y vuelve cada día.{"\n"}• Universidades y regiones suman a sus 20 mejores.
        </Text>
      </View>

      {compartir && <TarjetaCompartible estado={estado} onCerrar={() => setCompartir(false)} />}
    </ScrollView>
  );
}

function Fila({ fila, resaltar, marca }: { fila: FilaRanking; resaltar: boolean; marca?: string }) {
  const t = useTema();
  return (
    <View
      style={[
        estilos.fila,
        { backgroundColor: resaltar ? "rgba(255,138,31,0.12)" : t.superficie, borderColor: resaltar ? t.ambar : t.borde },
        marca && { borderLeftColor: marca, borderLeftWidth: 4 },
      ]}
    >
      <Puesto n={fila.posicion} texto={t.textoSuave} ambar={t.ambar} />
      <Text style={{ flex: 1, color: t.texto, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
        {fila.soyYo ? "Tú" : fila.nombre}
      </Text>
      <Text style={{ color: t.texto, fontWeight: "800", fontSize: 16, fontVariant: ["tabular-nums"] }}>{fila.puntos}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 20, gap: 12, paddingBottom: 40 },
  titulo: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  aviso: { borderRadius: 16, borderWidth: 1, padding: 14 },
  heroe: { borderRadius: 24, padding: 20, gap: 14 },
  insignia: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroeTitulo: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  cifras: { flexDirection: "row", gap: 8 },
  cifra: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, padding: 12, gap: 2 },
  cifraNumero: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  cifraEtiqueta: { color: "#A9B7CC", fontSize: 12 },
  boton: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  botonTexto: { fontSize: 16, fontWeight: "800" },
  carrera: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  barra: { height: 8, borderRadius: 4, overflow: "hidden" },
  barraLlena: { height: 8, borderRadius: 4 },
  segmentos: { flexDirection: "row", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4, marginTop: 4 },
  segmento: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  puesto: { width: 30, fontSize: 16, fontWeight: "800", textAlign: "center" },
  invitacion: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  reglas: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginTop: 8, gap: 6 },
});
