import { getPlatformStatus } from "@mba/shared";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

/** One-line platform status shown under the login form. */
export function ConnectedStatus() {
  const status = useQuery({
    queryKey: ["platform-status"],
    queryFn: () => getPlatformStatus(supabase),
    retry: false,
  });

  if (status.isPending) return <Text className="text-center text-xs text-faint">Connecting…</Text>;
  if (status.isError) {
    return (
      <Text accessibilityRole="alert" className="text-center text-xs text-rose">
        Not connected: {status.error.message}
      </Text>
    );
  }
  return (
    <View className="flex-row justify-center gap-1" testID="connected">
      <Text className="text-xs text-green">Connected</Text>
      <Text className="text-xs text-faint">·</Text>
      <Text className="text-xs text-faint" testID="platform-message">
        {status.data.message}
      </Text>
    </View>
  );
}
