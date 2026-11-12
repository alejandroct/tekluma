import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { IconoChevron, IconoNorma } from "@/components/Iconos";
import { slugNorma } from "@/lib/normas";
import { MONO, MONO_FUERTE } from "@/lib/tema";

type Props = {
  norma: string;
  articulo: string;
  extracto: string;
  pagina?: number;
  colores: { fondo: string; borde: string; acento: string; texto: string; suave: string };
};

/** Cita de la norma que se toca para abrir el lector justo en ese artículo. */
export function CitaNorma({ norma, articulo, extracto, pagina, colores }: Props) {
  const abrir = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/norma/[slug]", params: { slug: slugNorma(norma), articulo } });
  };
  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="link"
      accessibilityLabel={`Abrir ${norma}, artículo ${articulo}`}
      style={({ pressed }) => [estilos.cita, { backgroundColor: colores.fondo, borderColor: colores.borde, opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={estilos.cabeza}>
        <IconoNorma tamano={15} color={colores.suave} acento={colores.acento} />
        <Text style={[estilos.articulo, { color: colores.acento }]}>
          {norma} · ART. {articulo}
          {pagina ? ` · PÁG. ${pagina}` : ""}
        </Text>
        <Text style={[estilos.ver, { color: colores.suave }]}>LEER</Text>
        <IconoChevron tamano={14} color={colores.suave} />
      </View>
      <Text style={{ color: colores.texto, fontSize: 14, lineHeight: 20 }}>{extracto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cita: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 14, gap: 6 },
  cabeza: { flexDirection: "row", alignItems: "center", gap: 6 },
  articulo: { flex: 1, fontSize: 12, fontFamily: MONO_FUERTE, letterSpacing: 0.6 },
  ver: { fontSize: 10.5, fontFamily: MONO, letterSpacing: 1 },
});
