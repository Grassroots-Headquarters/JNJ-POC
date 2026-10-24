import { roleLabel } from "@mba/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Bar } from "@/components/ui";
import { rememberCompanyId } from "@/lib/current-company";
import { rememberedCompanyQueryKey, useMemberships } from "@/lib/queries";

/** Shown after login only when the User belongs to more than one Company. */
export default function ChooseCompanyScreen() {
  const memberships = useMemberships();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function choose(companyId: string) {
    await rememberCompanyId(companyId);
    queryClient.setQueryData(rememberedCompanyQueryKey, companyId);
    router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <Bar title="Choose company" />
      <ScrollView contentContainerClassName="gap-3 p-4">
        {memberships.isSuccess && (
          <Text className="text-xs text-faint">
            You work for {memberships.data.length} companies. Pick one to see its Jobs.
          </Text>
        )}
        {memberships.isPending && <Text className="text-muted">Loading…</Text>}
        {memberships.isError && (
          <Text accessibilityRole="alert" className="text-rose">
            {memberships.error.message}
          </Text>
        )}
        {memberships.data?.map((m) => (
          <Pressable
            key={m.companyId}
            accessibilityRole="button"
            onPress={() => choose(m.companyId)}
            className="gap-1 rounded-[14px] border border-border bg-surface2 p-3.5"
          >
            <Text className="font-semibold text-fg">{m.companyName}</Text>
            <Text className="text-[13px] text-muted">{roleLabel[m.role]}</Text>
          </Pressable>
        ))}
        <View className="pt-2">
          <Text className="text-xs text-faint">If you only work for one company, this step is skipped.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
