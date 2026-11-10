import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTema } from "@/lib/tema";

const ANCHO_LOGO = 200; // igual que `imageWidth` del splash nativo en app.json
const PROPORCION = 1177 / 1024;

/**
 * Continúa el splash nativo: el mismo logo en la misma posición rebota, aparece la marca
 * y todo se abre hacia la app. Dura ~1.3 s.
 */
export function Arranque({ onFin }: { onFin: () => void }) {
  const t = useTema();
  const { height } = useWindowDimensions();
  const escala = useSharedValue(1);
  const giro = useSharedValue(0);
  const marca = useSharedValue(0);
  const telon = useSharedValue(1);

  useEffect(() => {
    escala.set(
      withSequence(
        withTiming(0.88, { duration: 160, easing: Easing.out(Easing.quad) }),
        withSpring(1.04, { damping: 6, stiffness: 180 }),
        withDelay(380, withTiming(1.7, { duration: 380, easing: Easing.in(Easing.cubic) })),
      ),
    );
    giro.set(withSequence(withTiming(-6, { duration: 160 }), withSpring(0, { damping: 5, stiffness: 160 })));
    marca.set(withDelay(260, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })));
    telon.set(
      withDelay(
        950,
        withTiming(0, { duration: 340 }, (terminado) => {
          if (terminado) runOnJS(onFin)();
        }),
      ),
    );
  }, [escala, giro, marca, telon, onFin]);

  const estiloTelon = useAnimatedStyle(() => ({ opacity: telon.value }));
  const estiloLogo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }, { rotate: `${giro.value}deg` }] }));
  const estiloMarca = useAnimatedStyle(() => ({ opacity: marca.value, transform: [{ translateY: (1 - marca.value) * 16 }] }));

  const altoLogo = ANCHO_LOGO * PROPORCION;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.fondo }, estiloTelon]}>
      <Animated.Image
        source={require("../../assets/splash-icon.png")}
        style={[{ position: "absolute", width: ANCHO_LOGO, height: altoLogo, left: "50%", marginLeft: -ANCHO_LOGO / 2, top: (height - altoLogo) / 2 }, estiloLogo]}
      />
      <Animated.Text
        style={[
          { position: "absolute", top: (height + altoLogo) / 2 + 20, width: "100%", textAlign: "center", fontSize: 34, fontWeight: "800", letterSpacing: -1, color: t.texto },
          estiloMarca,
        ]}
      >
        tekluma
      </Animated.Text>
    </Animated.View>
  );
}
