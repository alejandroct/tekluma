import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTema } from "@/lib/tema";

type Plan = { id: "semanal" | "mensual" | "anual"; nombre: string; precio: string; detalle: string; destacado?: string };

const PLANES: Plan[] = [
  { id: "semanal", nombre: "Semanal", precio: "S/ 6.90", detalle: "Ideal para preparar un examen o concurso" },
  { id: "mensual", nombre: "Mensual", precio: "S/ 19.90", detalle: "7 días gratis, luego S/ 19.90 al mes", destacado: "Más popular" },
  { id: "anual", nombre: "Anual", precio: "S/ 149", detalle: "Equivale a S/ 12.40 al mes", destacado: "Ahorra 37%" },
];

const BENEFICIOS = [
  "Tarjetas ilimitadas cada día",
  "Sin anuncios",
  "Simulacros tipo examen con tiempo",
  "Estadísticas por norma y artículo",
  "Todos los mazos, incluidos los Premium",
];

export default function Premium() {
  const t = useTema();
  const [plan, setPlan] = useState<Plan["id"]>("mensual");

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor}>
      <Text style={[estilos.titulo, { color: t.texto }]}>Tekluma Premium</Text>
      <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>Estudia sin límites y llega listo a tu examen.</Text>

      <View style={{ gap: 10, marginVertical: 8 }}>
        {BENEFICIOS.map((b) => (
          <Text key={b} style={{ color: t.texto, fontSize: 16 }}>
            <Text style={{ color: t.ambar, fontWeight: "800" }}>✓ </Text>
            {b}
          </Text>
        ))}
      </View>

      {PLANES.map((p) => {
        const activo = p.id === plan;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPlan(p.id)}
            style={[estilos.plan, { backgroundColor: t.superficie, borderColor: activo ? t.ambar : t.borde, borderWidth: activo ? 2 : 1 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: t.texto, fontSize: 17, fontWeight: "800" }}>{p.nombre}</Text>
              <Text style={{ color: t.textoSuave, fontSize: 14 }}>{p.detalle}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              {p.destacado && (
                <Text style={[estilos.etiqueta, { backgroundColor: t.ambar, color: t.navy }]}>{p.destacado}</Text>
              )}
              <Text style={{ color: t.texto, fontSize: 18, fontWeight: "800" }}>{p.precio}</Text>
            </View>
          </Pressable>
        );
      })}

      <Pressable
        // TODO: comprar con RevenueCat (react-native-purchases) usando el producto del plan elegido.
        onPress={() => Alert.alert("Muy pronto", "Los pagos se activarán al conectar la App Store (RevenueCat).")}
        style={({ pressed }) => [estilos.boton, { backgroundColor: t.ambar, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[estilos.botonTexto, { color: t.navy }]}>{plan === "mensual" ? "Probar 7 días gratis" : "Continuar"}</Text>
      </Pressable>
      <Text style={[estilos.legal, { color: t.textoSuave }]}>
        Se renueva automáticamente. Cancela cuando quieras desde los ajustes de tu cuenta de la App Store.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 24, gap: 12 },
  titulo: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, lineHeight: 22 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16 },
  etiqueta: { fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  boton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  botonTexto: { fontSize: 17, fontWeight: "800" },
  legal: { fontSize: 12, textAlign: "center", lineHeight: 17 },
});
