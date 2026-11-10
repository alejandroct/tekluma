import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** Número que cuenta hasta su nuevo valor en vez de saltar. */
export function NumeroAnimado({ valor, style, prefijo = "" }: { valor: number; style?: StyleProp<TextStyle>; prefijo?: string }) {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(valor);

  useEffect(() => {
    const inicio = desde.current;
    if (inicio === valor) return;
    const t0 = Date.now();
    const DURACION = 650;
    let cuadro = 0;
    const paso = () => {
      const p = Math.min(1, (Date.now() - t0) / DURACION);
      const suave = 1 - Math.pow(1 - p, 3);
      setMostrado(Math.round(inicio + (valor - inicio) * suave));
      if (p < 1) cuadro = requestAnimationFrame(paso);
      else desde.current = valor;
    };
    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      desde.current = valor;
    };
  }, [valor]);

  return (
    <Animated.Text style={style}>
      {prefijo}
      {mostrado}
    </Animated.Text>
  );
}

/** Rebote breve cada vez que cambia `disparo` (p. ej. al ganar monedas). */
export function Rebote({ disparo, children, style }: { disparo: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const escala = useSharedValue(1);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    escala.set(withSequence(withTiming(1.06, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 220 })));
  }, [disparo, escala]);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return <Animated.View style={[style, animado]}>{children}</Animated.View>;
}

/** "+5" que sube y se desvanece. Montarlo con una `key` nueva en cada ganancia. */
export function GananciaFlotante({ texto, color }: { texto: string; color: string }) {
  const y = useSharedValue(0);
  const opacidad = useSharedValue(0);
  const escala = useSharedValue(0.6);
  useEffect(() => {
    opacidad.set(withSequence(withTiming(1, { duration: 120 }), withDelay(550, withTiming(0, { duration: 400 }))));
    y.set(withTiming(-56, { duration: 1050, easing: Easing.out(Easing.cubic) }));
    escala.set(withSpring(1, { damping: 7, stiffness: 260 }));
  }, [y, opacidad, escala]);
  const animado = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ translateY: y.value }, { scale: escala.value }],
  }));
  return (
    <Animated.Text
      pointerEvents="none"
      style={[{ position: "absolute", right: 24, top: 28, fontSize: 30, fontWeight: "800", color }, animado]}
    >
      {texto}
    </Animated.Text>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Botón que se hunde un poco al tocarlo. */
export function BotonVivo({ style, onPressIn, onPressOut, ...props }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const escala = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        escala.set(withTiming(0.96, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        escala.set(withSpring(1, { damping: 10, stiffness: 300 }));
        onPressOut?.(e);
      }}
      style={[style, animado]}
    />
  );
}
