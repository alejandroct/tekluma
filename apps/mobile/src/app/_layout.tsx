import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTema } from "@/lib/tema";

export default function RootLayout() {
  const t = useTema();
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="repaso/[mazoId]" options={{ title: "Repaso", presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
