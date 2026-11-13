import { Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold, useFonts } from "@expo-google-fonts/ibm-plex-mono";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Arranque } from "@/components/Arranque";
import { iniciarAnuncios } from "@/lib/anuncios";
import { authClient } from "@/lib/auth";
import { iniciarCompras } from "@/lib/compras";
import { conErrores, usuarioDeErrores } from "@/lib/errores";
import { iniciarNotificaciones } from "@/lib/recordatorio";
import { iniciarSonidos } from "@/lib/sonidos";
import { useTema } from "@/lib/tema";
import { useTutorialVisto } from "@/lib/tutorial";

// El splash nativo se queda hasta saber si hay sesión; luego lo continúa <Arranque />.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const t = useTema();
  const { data: sesion, isPending } = authClient.useSession();
  const [fuentesListas] = useFonts({ IBMPlexMono_500Medium, IBMPlexMono_600SemiBold });
  const [intro, setIntro] = useState(true);
  const terminarIntro = useCallback(() => setIntro(false), []);
  const tutorialVisto = useTutorialVisto();
  const conNombre = !!sesion?.user.name;

  useEffect(() => {
    iniciarSonidos();
    iniciarNotificaciones();
  }, []);

  // Consentimiento y permiso de rastreo recién cuando el usuario ya está dentro, no en el tutorial ni en el login.
  useEffect(() => {
    if (conNombre) iniciarAnuncios().catch(() => {});
  }, [conNombre]);

  // Tocar el recordatorio abre su ruta (la pregunta del día) si ya se puede entrar a la app.
  const respuesta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = respuesta?.notification.request.content.data?.url;
    if (!conNombre || typeof url !== "string" || respuesta?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    router.push(url as never);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [respuesta, conNombre]);

  useEffect(() => {
    if (!isPending && fuentesListas) SplashScreen.hideAsync().catch(() => {});
  }, [isPending, fuentesListas]);

  // Las compras quedan a nombre del usuario de Tekluma (mismo id en RevenueCat y en la API).
  const usuarioId = sesion?.user.id;
  useEffect(() => {
    usuarioDeErrores(usuarioId ?? null);
    if (usuarioId) iniciarCompras(usuarioId).catch(() => {});
  }, [usuarioId]);

  if (isPending || !fuentesListas) return <View style={{ flex: 1, backgroundColor: t.fondo }} />;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.fondo },
          headerTintColor: t.texto,
          contentStyle: { backgroundColor: t.fondo },
        }}
      >
        {/* Sin sesión: primero el tutorial (una vez por dispositivo), luego el login. */}
        <Stack.Protected guard={!sesion && !tutorialVisto}>
          <Stack.Screen name="tutorial" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!sesion && tutorialVisto}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Tras el primer login, nombre y profesión antes de entrar. */}
        <Stack.Protected guard={!!sesion && !sesion.user.name}>
          <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!sesion?.user.name}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="repaso/[mazoId]"
            options={{
              title: "Repaso",
              presentation: "fullScreenModal",
              headerLeft: () => (
                <Pressable onPress={() => router.back()} hitSlop={12}>
                  <Text style={{ color: t.texto, fontSize: 17 }}>Cerrar</Text>
                </Pressable>
              ),
            }}
          />
          <Stack.Screen name="duelo/nuevo" options={{ title: "Duelo", presentation: "modal", headerShadowVisible: false }} />
          <Stack.Screen name="duelo/[codigo]" options={{ title: "Duelo", presentation: "modal", headerShadowVisible: false }} />
          <Stack.Screen name="afiliacion" options={{ title: "Universidad y región", presentation: "modal", headerShadowVisible: false }} />
          <Stack.Screen name="diaria" options={{ title: "Pregunta del día", presentation: "modal", headerShadowVisible: false }} />
          <Stack.Screen name="premium" options={{ title: "", presentation: "modal", headerShadowVisible: false }} />
          <Stack.Screen name="norma/[slug]" options={{ title: "Norma", presentation: "modal", headerShadowVisible: false }} />
        </Stack.Protected>
      </Stack>
      {intro && <Arranque onFin={terminarIntro} />}
    </>
  );
}

export default conErrores(RootLayout);
