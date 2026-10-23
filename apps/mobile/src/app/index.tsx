import { getPlatformStatus } from "@jnj/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

/** The Mobile app's "connected" screen: reads platform_status from Supabase. */
export default function HomeScreen() {
  const status = useQuery({
    queryKey: ["platform_status"],
    queryFn: () => getPlatformStatus(supabase),
    retry: false,
  });

  return (
    <View className="flex-1 items-center justify-center bg-bg p-4">
      <Stack.Screen options={{ title: "JNJ Site App" }} />
      <View className="w-full max-w-sm gap-2 rounded-2xl border border-border bg-surface p-4" testID="connected-card">
        <Text className="text-xl font-semibold text-fg">JNJ Site App</Text>
        <Text className="text-sm text-muted">Mobile app</Text>
        {status.isPending && <Text className="text-muted">Connecting…</Text>}
        {status.isError && (
          <View accessibilityRole="alert" className="gap-1">
            <Text className="font-medium text-rose">Not connected</Text>
            <Text className="text-sm text-muted">{status.error.message}</Text>
          </View>
        )}
        {status.isSuccess && (
          <View className="gap-1" testID="connected">
            <Text className="font-medium text-green">Connected</Text>
            <Text className="text-sm text-muted" testID="platform-message">
              {status.data.message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
