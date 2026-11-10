import { useColorScheme } from "react-native";

const marca = {
  navy: "#0F1B2D",
  ambar: "#FF8A1F",
  pizarra: "#3B5174",
  niebla: "#A9B7CC",
};

const claro = {
  ...marca,
  fondo: "#F6F5F2",
  superficie: "#FFFFFF",
  texto: marca.navy,
  textoSuave: "#5B6B85",
  borde: "#E3E1DC",
  /** Botón principal: tinta sobre papel. El ámbar queda como acento, no como relleno de todo. */
  primario: marca.navy,
  sobrePrimario: "#F6F5F2",
};

const oscuro: typeof claro = {
  ...marca,
  fondo: marca.navy,
  superficie: "#18263C",
  texto: "#F6F5F2",
  textoSuave: marca.niebla,
  borde: "#26364F",
  primario: "#F6F5F2",
  sobrePrimario: marca.navy,
};

export type Tema = typeof claro;

export function useTema(): Tema {
  return useColorScheme() === "dark" ? oscuro : claro;
}

/** Tipografía de datos (códigos de norma, cifras, rótulos), la misma que la web. */
export const MONO = "IBMPlexMono_500Medium";
export const MONO_FUERTE = "IBMPlexMono_600SemiBold";

/** Radios: precisos, como en un plano. */
export const RADIO = { chico: 4, medio: 8 } as const;
