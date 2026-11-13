import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";
import type { Division } from "@tekluma/shared";

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

// ───────────── Set general ─────────────

type Icono = (p: Props) => React.ReactElement;
const lienzo = (tamano: number, children: React.ReactNode) => (
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
    {children}
  </Svg>
);

/** Moneda: canto doble y marca central. */
export const IconoMoneda: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={color} {...trazo} />
      <Circle cx={12} cy={12} r={5.25} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={12} y1={9.5} x2={12} y2={14.5} stroke={acento} {...trazo} />
    </>,
  );

/** Racha: barras escalonadas que crecen. */
export const IconoRacha: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3.5} y={14} width={4} height={6.5} stroke={color} {...trazo} />
      <Rect x={10} y={9.5} width={4} height={11} stroke={color} {...trazo} />
      <Rect x={16.5} y={4} width={4} height={16.5} stroke={acento} {...trazo} fill={acento} />
    </>,
  );

/** Hito: estaca de topografía con banderola, para logros. */
export const IconoHito: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Line x1={7} y1={3} x2={7} y2={21} stroke={color} {...trazo} />
      <Polygon points="7,3.5 18.5,7 7,10.5" stroke={acento} {...trazo} fill={acento} />
      <Line x1={3.5} y1={21} x2={11} y2={21} stroke={color} {...trazo} />
    </>,
  );

/** Podio de tres bloques: el primero, al centro y en acento. */
export const IconoPodio: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={2.5} y={12.5} width={6} height={8} stroke={color} {...trazo} />
      <Rect x={9} y={6} width={6} height={14.5} stroke={acento} {...trazo} fill={acento} />
      <Rect x={15.5} y={15} width={6} height={5.5} stroke={color} {...trazo} />
    </>,
  );

/** Hoja de examen con casillas marcadas: el simulacro. */
export const IconoSimulacro: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={4.5} y={3} width={15} height={18} stroke={color} {...trazo} />
      <Line x1={11} y1={8} x2={16.5} y2={8} stroke={color} {...trazo} />
      <Line x1={11} y1={12.5} x2={16.5} y2={12.5} stroke={color} {...trazo} />
      <Line x1={11} y1={17} x2={16.5} y2={17} stroke={color} {...trazo} />
      <Rect x={7.25} y={6.75} width={2.5} height={2.5} fill={acento} />
      <Rect x={7.25} y={11.25} width={2.5} height={2.5} fill={acento} />
      <Rect x={7.25} y={15.75} width={2.5} height={2.5} stroke={color} {...trazo} strokeWidth={1.25} />
    </>,
  );

/** Cronómetro. */
export const IconoCronometro: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Circle cx={12} cy={13.5} r={7.5} stroke={color} {...trazo} />
      <Line x1={10} y1={2.75} x2={14} y2={2.75} stroke={color} {...trazo} />
      <Line x1={12} y1={2.75} x2={12} y2={6} stroke={color} {...trazo} />
      <Polyline points="12,9.5 12,13.5 15,15.5" stroke={acento} {...trazo} />
    </>,
  );

/** Reloj de arena: en espera. */
export const IconoEspera: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Line x1={5.5} y1={3} x2={18.5} y2={3} stroke={color} {...trazo} />
      <Line x1={5.5} y1={21} x2={18.5} y2={21} stroke={color} {...trazo} />
      <Polyline points="7,3 7,6 12,12 7,18 7,21" stroke={color} {...trazo} />
      <Polyline points="17,3 17,6 12,12 17,18 17,21" stroke={color} {...trazo} />
      <Polygon points="9.5,19.5 14.5,19.5 12,16.5" fill={acento} />
    </>,
  );

/** Sello Premium: rombo doble. */
export const IconoPremium: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Polygon points="12,2.5 21.5,12 12,21.5 2.5,12" stroke={color} {...trazo} />
      <Polygon points="12,7.5 16.5,12 12,16.5 7.5,12" fill={acento} />
    </>,
  );

/** Reproducir (anuncio con recompensa). */
export const IconoReproducir: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3} y={4.5} width={18} height={15} stroke={color} {...trazo} />
      <Polygon points="10,8.5 15.5,12 10,15.5" fill={color} />
    </>,
  );

/** Correcto: ángulo preciso, no la palomita genérica. */
export const IconoCorrecto: Icono = ({ tamano = 24, color }) => lienzo(tamano, <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" stroke={color} {...trazo} strokeWidth={2} />);

export const IconoIncorrecto: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} {...trazo} strokeWidth={2} />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} {...trazo} strokeWidth={2} />
    </>,
  );

/** Casco de obra: el cargo. */
export const IconoCasco: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Path d="M5 16 V13 A7 7 0 0 1 19 13 V16" stroke={color} {...trazo} />
      <Line x1={2.5} y1={16.5} x2={21.5} y2={16.5} stroke={color} {...trazo} />
      <Line x1={12} y1={6} x2={12} y2={11} stroke={acento} {...trazo} />
      <Rect x={10} y={4} width={4} height={2} fill={acento} />
    </>,
  );

/** Fachada con columnas: universidad. */
export const IconoUniversidad: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Polygon points="2.5,8.5 12,3 21.5,8.5" stroke={acento} {...trazo} fill={acento} />
      <Line x1={5.5} y1={11} x2={5.5} y2={17.5} stroke={color} {...trazo} />
      <Line x1={10} y1={11} x2={10} y2={17.5} stroke={color} {...trazo} />
      <Line x1={14} y1={11} x2={14} y2={17.5} stroke={color} {...trazo} />
      <Line x1={18.5} y1={11} x2={18.5} y2={17.5} stroke={color} {...trazo} />
      <Line x1={3} y1={20.5} x2={21} y2={20.5} stroke={color} {...trazo} />
    </>,
  );

/** Punto topográfico: región. */
export const IconoRegion: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Circle cx={12} cy={12} r={6.5} stroke={color} {...trazo} />
      <Line x1={12} y1={2.5} x2={12} y2={7} stroke={color} {...trazo} />
      <Line x1={12} y1={17} x2={12} y2={21.5} stroke={color} {...trazo} />
      <Line x1={2.5} y1={12} x2={7} y2={12} stroke={color} {...trazo} />
      <Line x1={17} y1={12} x2={21.5} y2={12} stroke={color} {...trazo} />
      <Circle cx={12} cy={12} r={2} fill={acento} />
    </>,
  );

// ───────────── Divisiones: cada una dibujada como su material ─────────────

const IconoAdobe: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3} y={13} width={8.5} height={6} stroke={color} {...trazo} />
      <Rect x={12.5} y={13} width={8.5} height={6} stroke={color} {...trazo} />
      <Rect x={7.75} y={6} width={8.5} height={6} stroke={color} {...trazo} />
    </>,
  );

const IconoAlbanileria: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3} y={4} width={18} height={16} stroke={color} {...trazo} />
      <Line x1={3} y1={9.33} x2={21} y2={9.33} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={3} y1={14.66} x2={21} y2={14.66} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={12} y1={4} x2={12} y2={9.33} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={7.5} y1={9.33} x2={7.5} y2={14.66} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={16.5} y1={9.33} x2={16.5} y2={14.66} stroke={color} {...trazo} strokeWidth={1.25} />
      <Line x1={12} y1={14.66} x2={12} y2={20} stroke={color} {...trazo} strokeWidth={1.25} />
    </>,
  );

const IconoConcreto: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3.5} y={3.5} width={17} height={17} stroke={color} {...trazo} />
      <Polygon points="7,7 9.5,7.5 8,9.5" fill={color} />
      <Polygon points="14,6.5 16.5,8 14.5,9" fill={color} />
      <Polygon points="10.5,12 13,11.5 12.5,14" fill={color} />
      <Polygon points="6.5,15 8.5,14 9,16.5" fill={color} />
      <Polygon points="15,14.5 17,15.5 15,17" fill={color} />
    </>,
  );

const IconoConcretoArmado: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={4} y={3} width={16} height={18} stroke={color} {...trazo} />
      <Rect x={7} y={6} width={10} height={12} stroke={color} {...trazo} strokeWidth={1.25} />
      <Circle cx={8.25} cy={7.25} r={1.4} fill={acento} />
      <Circle cx={15.75} cy={7.25} r={1.4} fill={acento} />
      <Circle cx={8.25} cy={16.75} r={1.4} fill={acento} />
      <Circle cx={15.75} cy={16.75} r={1.4} fill={acento} />
    </>,
  );

const IconoAcero: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <Polygon points="4,3.5 20,3.5 20,6.5 13.5,6.5 13.5,17.5 20,17.5 20,20.5 4,20.5 4,17.5 10.5,17.5 10.5,6.5 4,6.5" stroke={color} {...trazo} />,
  );

const IconoPostensado: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={2.5} y={7} width={19} height={10} stroke={color} {...trazo} />
      <Path d="M2.5 9 Q12 20 21.5 9" stroke={acento} {...trazo} fill="none" />
      <Line x1={1} y1={9} x2={2.5} y2={9} stroke={acento} {...trazo} />
      <Line x1={21.5} y1={9} x2={23} y2={9} stroke={acento} {...trazo} />
    </>,
  );

const ICONOS_DIVISION: Record<Division, Icono> = {
  adobe: IconoAdobe,
  albanileria: IconoAlbanileria,
  concreto: IconoConcreto,
  concreto_armado: IconoConcretoArmado,
  acero: IconoAcero,
  postensado: IconoPostensado,
};

export function IconoDivision({ division, ...props }: Props & { division: Division }) {
  const Componente = ICONOS_DIVISION[division];
  return <Componente {...props} />;
}

/**
 * Puesto en un ranking como celda de rótulo de plano: el 1.º relleno en ámbar,
 * 2.º y 3.º con borde ámbar, el resto solo el número.
 */
export function Puesto({ n, texto, ambar }: { n: number; texto: string; ambar: string }) {
  const podio = n <= 3;
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: n === 1 ? ambar : "transparent",
        borderWidth: podio && n !== 1 ? 1.5 : 0,
        borderColor: ambar,
      }}
    >
      <Text style={{ fontSize: 14, fontFamily: "IBMPlexMono_600SemiBold", fontVariant: ["tabular-nums"], color: n === 1 ? "#0F1B2D" : podio ? ambar : texto }}>{n}</Text>
    </View>
  );
}

// ───────── Lector de normas ─────────

/** Lupa de plano: aro y mango recto. */
export const IconoBuscar: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Circle cx={10.5} cy={10.5} r={6} stroke={color} {...trazo} />
      <Line x1={15} y1={15} x2={20.5} y2={20.5} stroke={color} {...trazo} />
    </>,
  );

/** Índice: renglones con su número a la izquierda. */
export const IconoIndice: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={3.5} y={5} width={2.5} height={2.5} fill={acento} />
      <Rect x={3.5} y={10.75} width={2.5} height={2.5} fill={acento} />
      <Rect x={3.5} y={16.5} width={2.5} height={2.5} fill={acento} />
      <Line x1={9} y1={6.25} x2={20.5} y2={6.25} stroke={color} {...trazo} />
      <Line x1={9} y1={12} x2={20.5} y2={12} stroke={color} {...trazo} />
      <Line x1={9} y1={17.75} x2={17} y2={17.75} stroke={color} {...trazo} />
    </>,
  );

/** Compartir: flecha que sale de una bandeja. */
export const IconoCompartir: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Line x1={12} y1={3.5} x2={12} y2={14.5} stroke={color} {...trazo} />
      <Polyline points="8,7.5 12,3.5 16,7.5" stroke={color} {...trazo} />
      <Polyline points="5,11 5,20.5 19,20.5 19,11" stroke={color} {...trazo} />
    </>,
  );

export const IconoCerrar: Icono = ({ tamano = 24, color }) =>
  lienzo(
    tamano,
    <>
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} {...trazo} />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} {...trazo} />
    </>,
  );

/** Hoja de la norma con esquina doblada: abre la página original del PDF. */
export const IconoPagina: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Polyline points="14.5,3.5 5,3.5 5,20.5 19,20.5 19,8" stroke={color} {...trazo} />
      <Polyline points="14.5,3.5 14.5,8 19,8 14.5,3.5" stroke={color} {...trazo} />
      <Line x1={8.5} y1={12} x2={15.5} y2={12} stroke={acento} {...trazo} />
      <Line x1={8.5} y1={15.5} x2={13} y2={15.5} stroke={acento} {...trazo} />
    </>,
  );

/** Norma: tomo con lomo y marcador. */
export const IconoNorma: Icono = ({ tamano = 24, color, acento = color }) =>
  lienzo(
    tamano,
    <>
      <Rect x={5} y={3.5} width={14} height={17} stroke={color} {...trazo} />
      <Line x1={8.5} y1={3.5} x2={8.5} y2={20.5} stroke={color} {...trazo} />
      <Polyline points="12,3.5 12,10 14,8.5 16,10 16,3.5" stroke={acento} {...trazo} />
    </>,
  );
