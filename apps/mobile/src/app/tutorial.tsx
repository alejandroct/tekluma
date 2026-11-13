import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconoCorrecto, IconoDuelo, IconoPodio, IconoPreguntaDia, IconoRacha } from "@/components/Iconos";
import { SelectorHora } from "@/components/SelectorHora";
import { activarRecordatorio, RECORDATORIO_INICIAL } from "@/lib/recordatorio";
import { MONO, MONO_FUERTE, RADIO, useTema, type Tema } from "@/lib/tema";
import { terminarTutorial } from "@/lib/tutorial";

/** Antes del login, una sola vez: qué es Tekluma en tres pantallas y la hora del recordatorio diario. */
export default function Tutorial() {
  const t = useTema();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const carrusel = useRef<ComponentRef<typeof ScrollView>>(null);
  const [pagina, setPagina] = useState(0);
  const [hora, setHora] = useState({ hora: RECORDATORIO_INICIAL.hora, minuto: RECORDATORIO_INICIAL.minuto });
  const [activando, setActivando] = useState(false);

  const paginas = [
    <Pagina key="cita" t={t} rotulo="01 · CON LA NORMA EN LA MANO" titulo="Cada respuesta, con su artículo" texto="Tarjetas redactadas y revisadas por ingenieros. Al responder ves el extracto exacto de la norma que la respalda.">
      <MuestraTarjeta t={t} />
    </Pagina>,
    <Pagina key="repaso" t={t} rotulo="02 · REPETICIÓN ESPACIADA" titulo="Diez minutos al día" texto="Tekluma te devuelve cada tarjeta justo antes de que la olvides. Descarga los mazos y estudia también sin señal, en obra o en el bus.">
      <MuestraRacha t={t} />
    </Pagina>,
    <Pagina key="colegas" t={t} rotulo="03 · CON TUS COLEGAS" titulo="Mídete con otros ingenieros" texto="Compite sin dejar de estudiar.">
      <MuestraColegas t={t} />
    </Pagina>,
    <Pagina key="hora" t={t} rotulo="04 · TU HÁBITO" titulo="¿A qué hora repasas?" texto="Te avisamos una vez al día con la pregunta del día. Puedes cambiar la hora o apagarlo desde tu perfil.">
      <SelectorHora valor={hora} onCambio={setHora} />
    </Pagina>,
  ];
  const ultima = paginas.length - 1;

  const ir = (n: number) => {
    carrusel.current?.scrollTo({ x: n * width, animated: true });
    setPagina(n);
  };

  const activar = async () => {
    setActivando(true);
    const concedido = await activarRecordatorio(hora.hora, hora.minuto).catch(() => false);
    setActivando(false);
    if (!concedido) {
      Alert.alert("Sin permiso para avisarte", "Puedes activarlo después desde Perfil cuando quieras.", [{ text: "Entendido", onPress: terminarTutorial }]);
      return;
    }
    terminarTutorial();
  };

  return (
    <View style={[estilos.pantalla, { backgroundColor: t.fondo, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 16 }]}>
      <View style={estilos.cabecera}>
        <View style={estilos.marca}>
          <Image source={require("../../assets/splash-icon.png")} style={estilos.logo} resizeMode="contain" />
          <Text style={[estilos.marcaTexto, { color: t.texto }]}>tekluma</Text>
        </View>
        {pagina < ultima && (
          <Pressable onPress={() => ir(ultima)} hitSlop={12}>
            <Text style={[estilos.saltar, { color: t.textoSuave }]}>Saltar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={carrusel}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {paginas.map((p, i) => (
          <View key={i} style={{ width }}>
            {p}
          </View>
        ))}
      </ScrollView>

      <View style={estilos.pie}>
        <View style={estilos.puntos} accessibilityLabel={`Paso ${pagina + 1} de ${paginas.length}`}>
          {paginas.map((_, i) => (
            <View key={i} style={[estilos.punto, { backgroundColor: i === pagina ? t.ambar : t.borde, width: i === pagina ? 22 : 8 }]} />
          ))}
        </View>
        {pagina < ultima ? (
          <Boton t={t} texto="Siguiente" onPress={() => ir(pagina + 1)} />
        ) : (
          <>
            <Boton t={t} texto="Activar recordatorio" onPress={activar} cargando={activando} />
            <Pressable onPress={terminarTutorial} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 6 }}>
              <Text style={[estilos.secundario, { color: t.textoSuave }]}>Ahora no</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Pagina({ t, rotulo, titulo, texto, children }: { t: Tema; rotulo: string; titulo: string; texto: string; children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={estilos.pagina} showsVerticalScrollIndicator={false}>
      <View style={estilos.muestra}>{children}</View>
      <Text style={[estilos.rotulo, { color: t.ambar }]}>{rotulo}</Text>
      <Text style={[estilos.titulo, { color: t.texto }]}>{titulo}</Text>
      <Text style={[estilos.texto, { color: t.textoSuave }]}>{texto}</Text>
    </ScrollView>
  );
}

function Boton({ t, texto, onPress, cargando }: { t: Tema; texto: string; onPress: () => void; cargando?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      style={({ pressed }) => [estilos.boton, { backgroundColor: t.primario, opacity: pressed ? 0.85 : 1 }]}
    >
      {cargando ? <ActivityIndicator color={t.sobrePrimario} /> : <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>{texto}</Text>}
    </Pressable>
  );
}

/** Una tarjeta de ejemplo con la cita, como en la web. */
function MuestraTarjeta({ t }: { t: Tema }) {
  return (
    <View style={[estilos.caja, { backgroundColor: t.superficie, borderColor: t.borde }]}>
      <Text style={[estilos.cajaRotulo, { color: t.textoSuave }]}>E.060 · CONCRETO ARMADO</Text>
      <Text style={[estilos.pregunta, { color: t.texto }]}>¿Cuál es la resistencia mínima f’c del concreto estructural?</Text>
      <View style={[estilos.opcion, { borderColor: t.borde }]}>
        <Text style={[estilos.letra, { color: t.textoSuave }]}>A</Text>
        <Text style={[estilos.opcionTexto, { color: t.texto }]}>14 MPa</Text>
      </View>
      <View style={[estilos.opcion, { borderColor: "#1F9D55", backgroundColor: "rgba(31,157,85,0.08)" }]}>
        <Text style={[estilos.letra, { color: "#1F9D55" }]}>B</Text>
        <Text style={[estilos.opcionTexto, { color: t.texto, flex: 1 }]}>17 MPa</Text>
        <IconoCorrecto tamano={18} color="#1F9D55" />
      </View>
      <View style={[estilos.cita, { borderLeftColor: t.ambar }]}>
        <Text style={[estilos.cajaRotulo, { color: t.texto }]}>E.060 · ART. 5.1.1</Text>
        <Text style={[estilos.citaTexto, { color: t.textoSuave }]}>f’c mínimo para concreto estructural: 17 MPa.</Text>
      </View>
    </View>
  );
}

/** Una semana de racha y el repaso del día. */
function MuestraRacha({ t }: { t: Tema }) {
  const dias = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <View style={[estilos.caja, { backgroundColor: t.superficie, borderColor: t.borde, gap: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconoRacha tamano={26} color={t.texto} acento={t.ambar} />
        <Text style={[estilos.cifra, { color: t.texto }]}>5 días</Text>
        <Text style={[estilos.cajaRotulo, { color: t.textoSuave }]}>DE RACHA</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {dias.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={[estilos.dia, { backgroundColor: i < 5 ? t.ambar : "transparent", borderColor: i < 5 ? t.ambar : t.borde }]} />
            <Text style={[estilos.cajaRotulo, { color: t.textoSuave }]}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={[estilos.fila, { borderTopColor: t.borde }]}>
        <Text style={[estilos.opcionTexto, { color: t.texto }]}>Repaso de hoy</Text>
        <Text style={[estilos.cajaRotulo, { color: t.textoSuave }]}>12 TARJETAS · 9 MIN</Text>
      </View>
    </View>
  );
}

/** Pregunta del día, duelos y ligas. */
function MuestraColegas({ t }: { t: Tema }) {
  const filas = [
    { icono: <IconoPreguntaDia tamano={24} color={t.texto} acento={t.ambar} />, titulo: "Pregunta del día", detalle: "La misma para todos, tres intentos" },
    { icono: <IconoDuelo tamano={24} color={t.texto} acento={t.ambar} />, titulo: "Duelos 1 vs 1", detalle: "Reta a un colega por WhatsApp" },
    { icono: <IconoPodio tamano={24} color={t.texto} acento={t.ambar} />, titulo: "Liga semanal", detalle: "Por universidad y por región" },
  ];
  return (
    <View style={[estilos.caja, { backgroundColor: t.superficie, borderColor: t.borde, paddingVertical: 4 }]}>
      {filas.map((f, i) => (
        <View key={f.titulo} style={[estilos.colega, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borde }]}>
          {f.icono}
          <View style={{ flex: 1 }}>
            <Text style={[estilos.opcionTexto, { color: t.texto, fontWeight: "700" }]}>{f.titulo}</Text>
            <Text style={[estilos.citaTexto, { color: t.textoSuave }]}>{f.detalle}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, height: 44 },
  marca: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 26, height: 26 },
  marcaTexto: { fontSize: 20, fontWeight: "700", letterSpacing: -0.6 },
  saltar: { fontSize: 16, fontWeight: "600" },
  pagina: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  muestra: { marginBottom: 20 },
  rotulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4 },
  titulo: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8, lineHeight: 35 },
  texto: { fontSize: 17, lineHeight: 25 },
  pie: { paddingHorizontal: 24, gap: 14 },
  puntos: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 4 },
  punto: { height: 8, borderRadius: 4 },
  boton: { borderRadius: RADIO.medio, paddingVertical: 16, alignItems: "center" },
  botonTexto: { fontSize: 17, fontWeight: "700" },
  secundario: { fontSize: 16, fontWeight: "600" },
  caja: { borderWidth: 1, borderRadius: RADIO.medio, padding: 16, gap: 10 },
  cajaRotulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 0.8 },
  pregunta: { fontSize: 17, fontWeight: "700", lineHeight: 23 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: RADIO.chico, paddingVertical: 10, paddingHorizontal: 12 },
  letra: { fontFamily: MONO_FUERTE, fontSize: 14 },
  opcionTexto: { fontSize: 16 },
  cita: { borderLeftWidth: 2, paddingLeft: 12, gap: 4, marginTop: 4 },
  citaTexto: { fontSize: 14, lineHeight: 20 },
  cifra: { fontSize: 24, fontFamily: MONO_FUERTE },
  dia: { width: "100%", aspectRatio: 1, borderRadius: RADIO.chico, borderWidth: 1.5 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  colega: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
});
