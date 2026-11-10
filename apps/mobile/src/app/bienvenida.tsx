import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PROFESSIONS, type Profession } from "@tekluma/shared";
import { authClient } from "@/lib/auth";
import { NOMBRES_PROFESION } from "@/lib/profesiones";
import { MONO, useTema } from "@/lib/tema";

/** Se muestra una sola vez, tras el primer inicio de sesión, si el usuario aún no tiene nombre. */
export default function Bienvenida() {
  const t = useTema();
  const [nombre, setNombre] = useState("");
  const [profesion, setProfesion] = useState<Profession | null>(null);
  const [guardando, setGuardando] = useState(false);
  const listo = nombre.trim().length >= 2 && profesion !== null;

  const guardar = async () => {
    setGuardando(true);
    // Al tener nombre, la guarda del layout raíz muestra las pestañas.
    const { error } = await authClient.updateUser({ name: nombre.trim(), profession: profesion! });
    setGuardando(false);
    if (error) Alert.alert("No pudimos guardar tus datos", "Revisa tu conexión e inténtalo de nuevo.");
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.fondo }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.rotulo, { color: t.textoSuave }]}>PERFIL · 1 MINUTO</Text>
        <Text style={[estilos.titulo, { color: t.texto }]}>Te damos la bienvenida</Text>
        <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>Tu nombre es el que verán tus colegas en duelos y ligas.</Text>

        <Text style={[estilos.etiqueta, { color: t.textoSuave }]}>NOMBRE</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre y apellido"
          placeholderTextColor={t.textoSuave}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          style={[estilos.input, { color: t.texto, borderColor: t.borde, backgroundColor: t.superficie }]}
        />

        <Text style={[estilos.etiqueta, { color: t.textoSuave }]}>PROFESIÓN</Text>
        <View style={estilos.opciones}>
          {PROFESSIONS.map((p) => {
            const activa = p === profesion;
            return (
              <Pressable
                key={p}
                onPress={() => setProfesion(p)}
                style={[estilos.chip, { borderColor: activa ? t.primario : t.borde, backgroundColor: activa ? t.primario : t.superficie }]}
              >
                <Text style={{ color: activa ? t.sobrePrimario : t.texto, fontWeight: "600", fontSize: 15 }}>{NOMBRES_PROFESION[p]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={!listo || guardando}
          onPress={guardar}
          style={({ pressed }) => [estilos.boton, { backgroundColor: t.primario, opacity: !listo ? 0.4 : pressed ? 0.85 : 1 }]}
        >
          {guardando ? <ActivityIndicator color={t.sobrePrimario} /> : <Text style={[estilos.botonTexto, { color: t.sobrePrimario }]}>Empezar</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 24, paddingTop: 96, gap: 12 },
  rotulo: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4 },
  titulo: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  subtitulo: { fontSize: 16, lineHeight: 22, marginBottom: 12 },
  etiqueta: { fontSize: 11, fontFamily: MONO, letterSpacing: 1.4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 17, letterSpacing: 0 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  boton: { borderRadius: 8, paddingVertical: 16, alignItems: "center", marginTop: 20, minHeight: 54, justifyContent: "center" },
  botonTexto: { fontSize: 17, fontWeight: "700" },
});
