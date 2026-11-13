import { Pressable, StyleSheet, Text, View } from "react-native";
import { horaTexto } from "@/lib/recordatorio";
import { MONO, MONO_FUERTE, RADIO, useTema } from "@/lib/tema";

type Hora = { hora: number; minuto: number };

const SUGERIDAS: (Hora & { etiqueta: string })[] = [
  { hora: 7, minuto: 0, etiqueta: "Mañana" },
  { hora: 13, minuto: 0, etiqueta: "Almuerzo" },
  { hora: 19, minuto: 0, etiqueta: "Tarde" },
  { hora: 21, minuto: 30, etiqueta: "Noche" },
];
const PASO = 15;

/** Hora del recordatorio: cuatro momentos típicos y ajuste fino de 15 en 15 minutos. */
export function SelectorHora({ valor, onCambio }: { valor: Hora; onCambio: (h: Hora) => void }) {
  const t = useTema();
  const mover = (delta: number) => {
    const total = (valor.hora * 60 + valor.minuto + delta + 24 * 60) % (24 * 60);
    onCambio({ hora: Math.floor(total / 60), minuto: total % 60 });
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={[estilos.reloj, { borderColor: t.borde, backgroundColor: t.superficie }]}>
        <Pressable onPress={() => mover(-PASO)} hitSlop={8} accessibilityLabel="15 minutos antes" style={({ pressed }) => [estilos.paso, { borderColor: t.borde, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[estilos.pasoTexto, { color: t.texto }]}>−</Text>
        </Pressable>
        <Text style={[estilos.hora, { color: t.texto }]} accessibilityLiveRegion="polite">
          {horaTexto(valor)}
        </Text>
        <Pressable onPress={() => mover(PASO)} hitSlop={8} accessibilityLabel="15 minutos después" style={({ pressed }) => [estilos.paso, { borderColor: t.borde, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[estilos.pasoTexto, { color: t.texto }]}>+</Text>
        </Pressable>
      </View>
      <View style={estilos.sugeridas}>
        {SUGERIDAS.map((s) => {
          const elegida = s.hora === valor.hora && s.minuto === valor.minuto;
          return (
            <Pressable
              key={s.etiqueta}
              onPress={() => onCambio(s)}
              accessibilityState={{ selected: elegida }}
              style={[estilos.chip, { borderColor: elegida ? t.ambar : t.borde, backgroundColor: t.superficie }]}
            >
              <Text style={[estilos.chipHora, { color: t.texto }]}>{horaTexto(s)}</Text>
              <Text style={[estilos.chipEtiqueta, { color: t.textoSuave }]}>{s.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  reloj: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: RADIO.medio, padding: 12 },
  paso: { width: 48, height: 48, borderWidth: 1, borderRadius: RADIO.medio, alignItems: "center", justifyContent: "center" },
  pasoTexto: { fontSize: 24, fontWeight: "500", marginTop: -2 },
  hora: { fontSize: 44, fontFamily: MONO_FUERTE, fontVariant: ["tabular-nums"], letterSpacing: 1 },
  sugeridas: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, borderWidth: 1.5, borderRadius: RADIO.medio, paddingVertical: 10, alignItems: "center", gap: 2 },
  chipHora: { fontSize: 15, fontFamily: MONO_FUERTE, fontVariant: ["tabular-nums"] },
  chipEtiqueta: { fontSize: 11, fontFamily: MONO, letterSpacing: 0.4 },
});
