import { useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import Animated, { ZoomIn } from "react-native-reanimated";
import { DIVISIONES, REGIONES, siglaUniversidad, type EstadoLiga } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { IconoCasco, IconoDivision, IconoRegion, IconoUniversidad } from "@/components/Iconos";
import { compartirPorWhatsApp, WEB_URL } from "@/lib/diaria";

const NAVY = "#0F1B2D";
const AMBAR = "#FF8A1F";
const NIEBLA = "#A9B7CC";

/** Texto para quien prefiere mandar un mensaje en vez de una imagen. */
function textoLiga(e: EstadoLiga) {
  const division = DIVISIONES.find((d) => d.codigo === e.division)!;
  const uni = e.universidad && e.universidad !== "otra" ? `\n🎓 Sumando por la ${siglaUniversidad(e.universidad)}` : "";
  return `${division.emoji} Voy #${e.miPosicion} en la Liga ${division.nombre} de Tekluma con ${e.misPuntosSemana} puntos de obra esta semana.\n👷 Cargo: ${e.titulo}${uni}\n¿Te animas a superarme? ${WEB_URL}/diaria`;
}

/**
 * Tarjeta vertical (formato historia) con la división, el puesto y el cargo.
 * Se captura como imagen y se comparte con la hoja del sistema (WhatsApp, Instagram, LinkedIn…).
 */
export function TarjetaCompartible({ estado, onCerrar }: { estado: EstadoLiga; onCerrar: () => void }) {
  const tarjeta = useRef<ComponentRef<typeof View>>(null);
  const [ocupado, setOcupado] = useState(false);
  const division = DIVISIONES.find((d) => d.codigo === estado.division)!;

  const compartirImagen = async () => {
    setOcupado(true);
    try {
      const uri = await captureRef(tarjeta, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartir mi liga", UTI: "public.png" });
    } catch {
      // El usuario cerró la hoja de compartir o no hay apps disponibles: no es un error.
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={estilos.fondo} onPress={onCerrar}>
        <Animated.View entering={ZoomIn.springify().damping(15)}>
          <Pressable onPress={() => {}}>
            {/* Lo que se captura: colores fijos de marca, sin depender del modo claro/oscuro. */}
            <View ref={tarjeta} collapsable={false} style={estilos.tarjeta}>
              <Text style={estilos.marca}>tekluma</Text>
              <View style={{ alignItems: "center", gap: 6 }}>
                <View style={[estilos.insignia, { backgroundColor: division.color }]}>
                  <IconoDivision division={division.codigo} tamano={64} color="#FFFFFF" acento="#FFFFFF" />
                </View>
                <Text style={estilos.etiqueta}>LIGA</Text>
                <Text style={estilos.division}>{division.nombre}</Text>
              </View>
              <View style={estilos.cifras}>
                <View style={estilos.cifra}>
                  <Text style={estilos.cifraNumero}>#{estado.miPosicion}</Text>
                  <Text style={estilos.cifraEtiqueta}>esta semana</Text>
                </View>
                <View style={estilos.cifra}>
                  <Text style={estilos.cifraNumero}>{estado.misPuntosSemana}</Text>
                  <Text style={estilos.cifraEtiqueta}>puntos de obra</Text>
                </View>
              </View>
              <View style={{ alignItems: "center", gap: 4 }}>
                <View style={estilos.filaIcono}>
                  <IconoCasco tamano={20} color="#FFFFFF" acento={AMBAR} />
                  <Text style={estilos.cargo}>{estado.titulo}</Text>
                </View>
                {estado.universidad && estado.universidad !== "otra" && (
                  <View style={estilos.filaIcono}>
                    <IconoUniversidad tamano={16} color={NIEBLA} acento={NIEBLA} />
                    <Text style={estilos.detalle}>Sumando por la {siglaUniversidad(estado.universidad)}</Text>
                  </View>
                )}
                {estado.region && (
                  <View style={estilos.filaIcono}>
                    <IconoRegion tamano={16} color={NIEBLA} acento={NIEBLA} />
                    <Text style={estilos.detalle}>{REGIONES[estado.region]}</Text>
                  </View>
                )}
              </View>
              <Text style={estilos.pie}>¿Me superas? Repasa el RNE en tekluma.app</Text>
            </View>
          </Pressable>
        </Animated.View>

        <View style={estilos.acciones}>
          <BotonVivo disabled={ocupado} onPress={compartirImagen} style={[estilos.boton, { backgroundColor: AMBAR }]}>
            {ocupado ? <ActivityIndicator color={NAVY} /> : <Text style={[estilos.botonTexto, { color: NAVY }]}>Compartir imagen</Text>}
          </BotonVivo>
          <BotonVivo onPress={() => compartirPorWhatsApp(textoLiga(estado))} style={[estilos.boton, { backgroundColor: "#25D366" }]}>
            <Text style={[estilos.botonTexto, { color: "#FFFFFF" }]}>Enviar por WhatsApp</Text>
          </BotonVivo>
          <Pressable onPress={onCerrar} hitSlop={10}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", textAlign: "center", marginTop: 4 }}>Cerrar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(6,12,22,0.86)", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 },
  tarjeta: {
    width: 270,
    height: 480,
    borderRadius: 10,
    backgroundColor: NAVY,
    padding: 22,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: AMBAR,
  },
  marca: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  insignia: { width: 110, height: 110, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  etiqueta: { color: AMBAR, fontWeight: "700", letterSpacing: 3, fontSize: 13 },
  division: { color: "#FFFFFF", fontSize: 30, fontWeight: "700", letterSpacing: -0.5, textAlign: "center" },
  cifras: { flexDirection: "row", gap: 8 },
  cifra: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, alignItems: "center" },
  cifraNumero: { color: "#FFFFFF", fontSize: 26, fontWeight: "700" },
  cifraEtiqueta: { color: NIEBLA, fontSize: 12 },
  filaIcono: { flexDirection: "row", alignItems: "center", gap: 6 },
  cargo: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  detalle: { color: NIEBLA, fontSize: 14, fontWeight: "600" },
  pie: { color: AMBAR, fontSize: 13, fontWeight: "700", textAlign: "center" },
  acciones: { width: 270, gap: 10 },
  boton: { borderRadius: 8, paddingVertical: 14, alignItems: "center", minHeight: 50, justifyContent: "center" },
  botonTexto: { fontSize: 16, fontWeight: "700" },
});
