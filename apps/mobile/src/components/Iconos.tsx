import { View } from "react-native";
import Svg, { Line, Polyline, Rect } from "react-native-svg";

/**
 * Íconos propios en lenguaje de plano técnico: retícula de 24, trazo de 1.75,
 * extremos y uniones rectas. Sin emojis ni sets genéricos.
 */
type Props = { tamano?: number; color: string; acento?: string };

const trazo = { strokeWidth: 1.75, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const, fill: "none" };

/** Hoja de calendario con el casillero del día marcado. */
export function IconoPreguntaDia({ tamano = 24, color, acento = color }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Rect x={3.5} y={5} width={17} height={15.5} stroke={color} {...trazo} />
      <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} stroke={color} {...trazo} />
      <Line x1={8} y1={2.75} x2={8} y2={6.5} stroke={color} {...trazo} />
      <Line x1={16} y1={2.75} x2={16} y2={6.5} stroke={color} {...trazo} />
      <Rect x={13} y={12.5} width={4.5} height={4.5} fill={acento} />
    </Svg>
  );
}

/** Dos vectores enfrentados: el reto 1 contra 1. */
export function IconoDuelo({ tamano = 24, color, acento = color }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Line x1={3} y1={8} x2={19} y2={8} stroke={color} {...trazo} />
      <Polyline points="15.5,4.5 19,8 15.5,11.5" stroke={color} {...trazo} />
      <Line x1={21} y1={16} x2={5} y2={16} stroke={acento} {...trazo} />
      <Polyline points="8.5,12.5 5,16 8.5,19.5" stroke={acento} {...trazo} />
    </Svg>
  );
}

export function IconoChevron({ tamano = 20, color }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Polyline points="9,5.5 15.5,12 9,18.5" stroke={color} {...trazo} strokeWidth={2} />
    </Svg>
  );
}

/** Marco cuadrado de 44 pt para íconos de lista, con borde fino. */
export function MarcoIcono({ children, borde, fondo }: { children: React.ReactNode; borde: string; fondo: string }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: borde, backgroundColor: fondo, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

/**
 * Resultado de la pregunta del día como casillas: verde acierto, rojo fallo, vacía sin usar.
 * Es un dato, no una decoración: se lee igual que el mensaje que se comparte.
 */
export function Casillas({ intentos, correcta, maximo, vacio }: { intentos: number[]; correcta?: number; maximo: number; vacio: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: maximo }, (_, i) => {
        const o = intentos[i];
        const color = o === undefined ? undefined : o === correcta ? "#1F9D55" : "#D64545";
        return <View key={i} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, borderWidth: color ? 0 : 1, borderColor: vacio }} />;
      })}
    </View>
  );
}
