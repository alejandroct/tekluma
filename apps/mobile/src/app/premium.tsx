import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { comprar, comprasDisponibles, obtenerPlanes, restaurar, type IdPlan, type PlanTienda } from "@/lib/compras";
import { obtenerCupo } from "@/lib/cupo";
import { MONO, MONO_FUERTE, useTema } from "@/lib/tema";
import { IconoCorrecto } from "@/components/Iconos";

type Plan = { id: IdPlan; nombre: string; precio: string; detalle: string; destacado?: string };

/** Precios de referencia; con RevenueCat configurado se muestran los de la tienda. */
const PLANES: Plan[] = [
  { id: "semanal", nombre: "Semanal", precio: "S/ 6.90", detalle: "Ideal para preparar un examen o concurso" },
  { id: "mensual", nombre: "Mensual", precio: "S/ 19.90", detalle: "7 días gratis, luego S/ 19.90 al mes", destacado: "Más popular" },
  { id: "anual", nombre: "Anual", precio: "S/ 149", detalle: "Equivale a S/ 12.40 al mes", destacado: "Ahorra 37%" },
];

/** Solo lo que la app ya hace: nada de funciones futuras en lo que se cobra. */
const BENEFICIOS = [
  "Repaso ilimitado, sin cupo diario",
  "Sin anuncios",
  "Todos los mazos, incluidos los Premium",
];

// TODO: publicar estas páginas antes de enviar a revisión (Apple las exige en suscripciones).
const URL_TERMINOS = "https://tekluma.app/terminos";
const URL_PRIVACIDAD = "https://tekluma.app/privacidad";

export default function Premium() {
  const t = useTema();
  const [plan, setPlan] = useState<IdPlan>("mensual");
  const [tienda, setTienda] = useState<PlanTienda[]>([]);
  const [cargando, setCargando] = useState(comprasDisponibles);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!comprasDisponibles) return;
    obtenerPlanes()
      .then(setTienda)
      .catch(() => Alert.alert("No pudimos cargar los planes", "Revisa tu conexión e inténtalo de nuevo."))
      .finally(() => setCargando(false));
  }, []);

  const planes = PLANES.map((p) => {
    const deTienda = tienda.find((x) => x.id === p.id);
    if (!deTienda) return { ...p, deTienda };
    const detalle = p.id === "mensual" ? (deTienda.conPrueba ? `7 días gratis, luego ${deTienda.precio} al mes` : `${deTienda.precio} al mes`) : p.detalle;
    return { ...p, precio: deTienda.precio, detalle, deTienda };
  });
  const elegido = planes.find((p) => p.id === plan)!;

  const terminar = async () => {
    await obtenerCupo().catch(() => {});
    router.back();
    Alert.alert("¡Bienvenido a Premium!", "Ya tienes tarjetas ilimitadas y sin anuncios.");
  };

  const suscribirse = async () => {
    if (!elegido.deTienda) {
      return Alert.alert("Muy pronto", "Los pagos se activarán al configurar la App Store en RevenueCat.");
    }
    setOcupado(true);
    try {
      if ((await comprar(elegido.deTienda.paquete)) === "ok") await terminar();
    } catch {
      Alert.alert("No se completó la compra", "No se te cobró nada. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  const restaurarCompras = async () => {
    setOcupado(true);
    try {
      if (await restaurar()) await terminar();
      else Alert.alert("Sin compras previas", "No encontramos una suscripción activa en tu cuenta de la App Store.");
    } catch {
      Alert.alert("No se pudo restaurar", "Inténtalo de nuevo en un momento.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={estilos.contenedor}>
      <Text style={[estilos.titulo, { color: t.texto }]}>Tekluma Premium</Text>
      <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>Repasa todo el RNE sin límites, a tu ritmo.</Text>

      <View style={{ gap: 10, marginVertical: 8 }}>
        {BENEFICIOS.map((b) => (
          <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconoCorrecto tamano={18} color={t.ambar} />
            <Text style={{ color: t.texto, fontSize: 16, flex: 1 }}>{b}</Text>
          </View>
        ))}
      </View>

      {cargando ? (
        <ActivityIndicator color={t.ambar} style={{ marginVertical: 24 }} />
      ) : (
        planes.map((p) => {
          const activo = p.id === plan;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPlan(p.id)}
              style={[estilos.plan, { backgroundColor: t.superficie, borderColor: activo ? t.ambar : t.borde, borderWidth: activo ? 2 : 1 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.texto, fontSize: 17, fontWeight: "700" }}>{p.nombre}</Text>
                <Text style={{ color: t.textoSuave, fontSize: 14 }}>{p.detalle}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {p.destacado && <Text style={[estilos.etiqueta, { borderColor: t.ambar, color: t.ambar }]}>{p.destacado.toUpperCase()}</Text>}
                <Text style={{ color: t.texto, fontSize: 18, fontFamily: MONO_FUERTE }}>{p.precio}</Text>
              </View>
            </Pressable>
          );
        })
      )}

      <Pressable
        disabled={ocupado || cargando}
        onPress={suscribirse}
        style={({ pressed }) => [estilos.boton, { backgroundColor: t.ambar, opacity: ocupado || cargando ? 0.6 : pressed ? 0.85 : 1 }]}
      >
        {ocupado ? (
          <ActivityIndicator color={t.navy} />
        ) : (
          <Text style={[estilos.botonTexto, { color: t.navy }]}>
            {plan === "mensual" && (elegido.deTienda?.conPrueba ?? true) ? "Probar 7 días gratis" : "Continuar"}
          </Text>
        )}
      </Pressable>

      {comprasDisponibles && (
        <Pressable disabled={ocupado} onPress={restaurarCompras} hitSlop={8}>
          <Text style={[estilos.enlace, { color: t.textoSuave }]}>Restaurar compras</Text>
        </Pressable>
      )}

      <Text style={[estilos.legal, { color: t.textoSuave }]}>
        El pago se cargará a tu cuenta de la App Store. La suscripción se renueva automáticamente salvo que la canceles al
        menos 24 horas antes del fin del periodo, desde los ajustes de tu cuenta.
      </Text>
      <View style={estilos.legales}>
        <Text onPress={() => Linking.openURL(URL_TERMINOS)} style={[estilos.legal, estilos.subrayado, { color: t.textoSuave }]}>
          Términos de uso
        </Text>
        <Text onPress={() => Linking.openURL(URL_PRIVACIDAD)} style={[estilos.legal, estilos.subrayado, { color: t.textoSuave }]}>
          Política de privacidad
        </Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 24, gap: 12, paddingBottom: 48 },
  titulo: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, lineHeight: 22 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 8 },
  etiqueta: { fontSize: 10, fontFamily: MONO, letterSpacing: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 1, overflow: "hidden" },
  boton: { borderRadius: 8, paddingVertical: 16, alignItems: "center", marginTop: 8, minHeight: 54, justifyContent: "center" },
  botonTexto: { fontSize: 17, fontWeight: "700" },
  enlace: { textAlign: "center", fontSize: 15, fontWeight: "600" },
  legal: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  legales: { flexDirection: "row", justifyContent: "center", gap: 20 },
  subrayado: { textDecorationLine: "underline" },
});
