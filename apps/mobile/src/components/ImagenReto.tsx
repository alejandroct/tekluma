import { useRef, type ComponentRef } from "react";
import { Image, Platform, Share, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { MONO, MONO_FUERTE } from "@/lib/tema";
import { WEB_URL } from "@/lib/diaria";

const NAVY = "#0F1B2D";
const AMBAR = "#FF8A1F";
const PAPEL = "#F6F5F2";
const NIEBLA = "#A9B7CC";
const VERDE = "#1F9D55";
const ROJO = "#D64545";

/** What the share image shows. Fixed brand colors, independent of light/dark mode. */
export type DatosImagen = {
  rotulo: string;
  /** Big line: the question (daily) or the score (duel). */
  titulo: string;
  figura?: string;
  opciones?: string[];
  /** One box per attempt/question: true = right, false = wrong, null = not used. */
  casillas: (boolean | null)[];
  resultado: string;
  lineas: string[];
  /** Small block under the result, e.g. the duel's first question. */
  anzuelo?: { etiqueta: string; texto: string };
  llamada: string;
  ruta: "diaria" | "duelo";
};

const dominio = WEB_URL.replace(/^https?:\/\//, "");

/** Rendered off screen and captured as a 4:5 image (1080 × 1350 on a 3× screen). */
export function ImagenReto({ datos, captura }: { datos: DatosImagen; captura: React.RefObject<ComponentRef<typeof View> | null> }) {
  return (
    <View style={estilos.fuera} pointerEvents="none">
      <View ref={captura} collapsable={false} style={estilos.tarjeta}>
        <View style={estilos.cab}>
          <Text style={estilos.marca}>tekluma</Text>
          <Text style={estilos.rotulo}>{datos.rotulo}</Text>
        </View>

        <View style={estilos.centro}>
          <Text style={[estilos.titulo, datos.titulo.length > 90 && { fontSize: 19, lineHeight: 25 }]} numberOfLines={5}>
            {datos.titulo}
          </Text>
          {datos.figura && (
            <View style={estilos.figura}>
              <Image source={{ uri: datos.figura }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            </View>
          )}
          {datos.opciones && (
            <View style={estilos.opciones}>
              {datos.opciones.slice(0, 4).map((o, i) => (
                <View key={i} style={estilos.opcion}>
                  <Text style={estilos.letra}>{"ABCDEF"[i]}</Text>
                  <Text style={estilos.opcionTexto} numberOfLines={1}>
                    {o}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {datos.anzuelo && (
            <View style={estilos.anzuelo}>
              <Text style={estilos.anzueloEtiqueta}>{datos.anzuelo.etiqueta}</Text>
              <Text style={estilos.anzueloTexto} numberOfLines={3}>
                {datos.anzuelo.texto}
              </Text>
            </View>
          )}
        </View>

        <View style={estilos.resultado}>
          <View style={estilos.casillas}>
            {datos.casillas.map((c, i) => (
              <View key={i} style={[estilos.casilla, { backgroundColor: c === null ? "#3B5174" : c ? VERDE : ROJO }]} />
            ))}
            <Text style={estilos.resultadoTexto}>{datos.resultado}</Text>
          </View>
          {datos.lineas.map((l) => (
            <Text key={l} style={estilos.linea}>
              {l}
            </Text>
          ))}
        </View>

        <View style={estilos.pie}>
          <Text style={estilos.llamada}>{datos.llamada}</Text>
          <Text style={estilos.enlace}>
            {dominio}/{datos.ruta}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Captures the card and opens the share sheet. On iOS the image goes with the text as caption;
 * Android's sheet only takes the file, so the link is also printed on the image.
 */
export function useCompartirConImagen() {
  const captura = useRef<ComponentRef<typeof View>>(null);
  const compartir = async (texto: string) => {
    const uri = await captureRef(captura, { format: "png", quality: 1, result: "tmpfile" });
    try {
      if (Platform.OS === "ios") await Share.share({ url: uri, message: texto });
      else await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartir", UTI: "public.png" });
    } catch {
      // The user closed the share sheet: not an error.
    }
  };
  return { captura, compartir };
}

const estilos = StyleSheet.create({
  fuera: { position: "absolute", left: -10000, top: 0 },
  tarjeta: { width: 360, height: 450, backgroundColor: NAVY, padding: 22, justifyContent: "space-between", borderTopWidth: 5, borderTopColor: AMBAR },
  cab: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marca: { color: PAPEL, fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  rotulo: { color: NIEBLA, fontSize: 10.5, fontFamily: MONO, letterSpacing: 1.2 },
  centro: { flex: 1, justifyContent: "center", gap: 12, paddingVertical: 10 },
  titulo: { color: PAPEL, fontSize: 22, fontWeight: "700", lineHeight: 28, letterSpacing: -0.3 },
  figura: { height: 110, backgroundColor: "#FFFFFF", borderRadius: 6, padding: 6 },
  opciones: { gap: 6 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "rgba(246,245,242,0.22)", borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10 },
  letra: { color: AMBAR, fontFamily: MONO_FUERTE, fontSize: 13 },
  opcionTexto: { flex: 1, color: PAPEL, fontSize: 14, fontWeight: "600" },
  anzuelo: { borderLeftWidth: 3, borderLeftColor: AMBAR, paddingLeft: 10, gap: 4 },
  anzueloEtiqueta: { color: NIEBLA, fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2 },
  anzueloTexto: { color: PAPEL, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  resultado: { gap: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(246,245,242,0.18)" },
  casillas: { flexDirection: "row", alignItems: "center", gap: 5 },
  casilla: { width: 16, height: 16, borderRadius: 3 },
  resultadoTexto: { color: PAPEL, fontSize: 15, fontWeight: "700", marginLeft: 6, flexShrink: 1 },
  linea: { color: NIEBLA, fontSize: 13, fontWeight: "600" },
  pie: { backgroundColor: AMBAR, marginHorizontal: -22, marginBottom: -22, paddingHorizontal: 22, paddingVertical: 12, gap: 1 },
  llamada: { color: NAVY, fontSize: 14, fontWeight: "700" },
  enlace: { color: NAVY, fontFamily: MONO_FUERTE, fontSize: 13 },
});
