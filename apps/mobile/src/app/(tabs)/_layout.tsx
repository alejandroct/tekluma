import { NativeTabs } from "expo-router/native-tabs";
import { useTema } from "@/lib/tema";

export default function TabsLayout() {
  const t = useTema();
  return (
    <NativeTabs tintColor={t.ambar}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Hoy</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flame.fill" md="local_fire_department" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mazos">
        <NativeTabs.Trigger.Label>Mazos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="rectangle.stack.fill" md="style" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
