import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { authClient } from "@/lib/auth";
import { useTema } from "@/lib/tema";

export default function RootLayout() {
  const t = useTema();
  const { data: sesion, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.fondo }}>
        <ActivityIndicator color={t.ambar} />
      </View>
    );
  }

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
        <Stack.Protected guard={!sesion}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!sesion}>
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
        </Stack.Protected>
      </Stack>
    </>
  );
}
