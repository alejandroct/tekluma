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
};

const oscuro: typeof claro = {
  ...marca,
  fondo: marca.navy,
  superficie: "#18263C",
  texto: "#F6F5F2",
  textoSuave: marca.niebla,
  borde: "#26364F",
};

export type Tema = typeof claro;

export function useTema(): Tema {
  return useColorScheme() === "dark" ? oscuro : claro;
}
