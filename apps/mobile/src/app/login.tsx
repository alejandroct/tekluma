import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { authClient } from "@/lib/auth";
import { useTema } from "@/lib/tema";

export default function Login() {
  const t = useTema();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviarCodigo = async () => {
    setCargando(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setCargando(false);
    if (error) return setError(error.message ?? "No pudimos enviar el código");
    setPaso("codigo");
  };

  const verificar = async () => {
    setCargando(true);
    setError(null);
    // Al iniciar sesión, la guarda del layout raíz muestra las pestañas.
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: codigo });
    setCargando(false);
    if (error) setError(error.message ?? "Código incorrecto o vencido");
  };

  const input = [estilos.input, { color: t.texto, borderColor: t.borde, backgroundColor: t.superficie }];
  const correoValido = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <KeyboardAvoidingView behavior="padding" style={[estilos.pantalla, { backgroundColor: t.fondo }]}>
      <View style={estilos.contenido}>
        <Text style={[estilos.marca, { color: t.texto }]}>tekluma</Text>
        <Text style={[estilos.subtitulo, { color: t.textoSuave }]}>
          {paso === "correo" ? "Repasa el RNE con tarjetas. Entra con tu correo." : `Escribe el código de 6 dígitos que enviamos a ${email.trim()}.`}
        </Text>

        {paso === "correo" ? (
          <TextInput
            key="correo"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={t.textoSuave}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={input}
          />
        ) : (
          <TextInput
            key="codigo"
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={t.textoSuave}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            style={[input, estilos.codigo]}
          />
        )}

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable
          disabled={cargando || (paso === "correo" ? !correoValido : codigo.length !== 6)}
          onPress={paso === "correo" ? enviarCodigo : verificar}
          style={({ pressed }) => [
            estilos.boton,
            { backgroundColor: t.ambar, opacity: pressed ? 0.8 : 1 },
            (paso === "correo" ? !correoValido : codigo.length !== 6) && { opacity: 0.5 },
          ]}
        >
          {cargando ? <ActivityIndicator color={t.navy} /> : <Text style={[estilos.botonTexto, { color: t.navy }]}>{paso === "correo" ? "Enviar código" : "Entrar"}</Text>}
        </Pressable>

        {paso === "codigo" && (
          <Pressable onPress={() => { setPaso("correo"); setCodigo(""); setError(null); }} hitSlop={8}>
            <Text style={[estilos.enlace, { color: t.textoSuave }]}>Usar otro correo</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  marca: { fontSize: 40, fontWeight: "800", letterSpacing: -1.5 },
  subtitulo: { fontSize: 16, lineHeight: 22, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 17, letterSpacing: 0 },
  codigo: { fontSize: 28, letterSpacing: 10, textAlign: "center", fontVariant: ["tabular-nums"] },
  error: { color: "#D64545", fontSize: 15 },
  boton: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  botonTexto: { fontSize: 17, fontWeight: "800" },
  enlace: { textAlign: "center", fontSize: 15, marginTop: 6 },
});
