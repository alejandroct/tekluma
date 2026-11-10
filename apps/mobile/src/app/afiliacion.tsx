import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { REGIONES, UNIVERSIDADES, type Region, type Universidad } from "@tekluma/shared";
import { BotonVivo } from "@/components/Animaciones";
import { guardarAfiliacion, obtenerLiga } from "@/lib/liga";
import { useTema } from "@/lib/tema";
import { IconoCorrecto } from "@/components/Iconos";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Universidad y región por las que compite el usuario. Ambas opcionales. */
export default function Afiliacion() {
  const t = useTema();
  const [universidad, setUniversidad] = useState<Universidad | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      obtenerLiga()
        .then((e) => {
          setUniversidad(e.universidad);
          setRegion(e.region);
        })
        .finally(() => setCargado(true));
    }, []),
  );

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarAfiliacion({ universidad, region });
      router.back();
    } finally {
      setGuardando(false);
    }
  };

  if (!cargado) {
    return (
      <View style={[estilos.centro, { backgroundColor: t.fondo }]}>
        <ActivityIndicator color={t.ambar} />
      </View>
    );
  }

  const filtro = sinTildes(busqueda.trim());
  const universidades = (Object.entries(UNIVERSIDADES) as [Universidad, string][]).filter(([, n]) => !filtro || sinTildes(n).includes(filtro));

  return (
    <View style={{ flex: 1, backgroundColor: t.fondo }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.etiqueta, { color: t.texto }]}>Tu región</Text>
        <View style={estilos.chips}>
          {(Object.entries(REGIONES) as [Region, string][]).map(([codigo, nombre]) => {
            const activa = codigo === region;
            return (
              <Pressable
                key={codigo}
                onPress={() => setRegion(activa ? null : codigo)}
                style={[estilos.chip, { backgroundColor: activa ? t.ambar : t.superficie, borderColor: activa ? t.ambar : t.borde }]}
              >
                <Text style={{ color: activa ? t.navy : t.texto, fontWeight: activa ? "800" : "500" }}>{nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[estilos.etiqueta, { color: t.texto }]}>Tu universidad</Text>
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Busca: UNI, PUCP, San Agustín…"
          placeholderTextColor={t.textoSuave}
          style={[estilos.buscador, { color: t.texto, borderColor: t.borde, backgroundColor: t.superficie }]}
        />
        {universidades.map(([codigo, nombre]) => {
          const activa = codigo === universidad;
          return (
            <Pressable
              key={codigo}
              onPress={() => setUniversidad(activa ? null : codigo)}
              style={[estilos.opcion, { backgroundColor: activa ? "rgba(255,138,31,0.12)" : t.superficie, borderColor: activa ? t.ambar : t.borde }]}
            >
              <Text style={{ flex: 1, color: t.texto, fontWeight: activa ? "800" : "500", fontSize: 15 }}>{nombre}</Text>
              {activa && <IconoCorrecto tamano={18} color={t.ambar} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[estilos.pie, { borderColor: t.borde, backgroundColor: t.fondo }]}>
        <BotonVivo disabled={guardando} onPress={guardar} style={[estilos.boton, { backgroundColor: t.ambar }]}>
          {guardando ? <ActivityIndicator color={t.navy} /> : <Text style={{ color: t.navy, fontWeight: "800", fontSize: 17 }}>Guardar</Text>}
        </BotonVivo>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 20, gap: 10, paddingBottom: 24 },
  etiqueta: { fontSize: 17, fontWeight: "800", marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  buscador: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, letterSpacing: 0 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  pie: { padding: 16, paddingBottom: 34, borderTopWidth: StyleSheet.hairlineWidth },
  boton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", minHeight: 54, justifyContent: "center" },
});
