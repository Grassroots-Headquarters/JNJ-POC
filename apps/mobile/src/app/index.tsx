import { pickCurrentCompany, roleLabel } from "@jnj/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Bar, BarAction, GhostButton, PrimaryButton } from "@/components/ui";
import { getPendingInviteCode } from "@/lib/pending-invite";
import { useMemberships, useMyProfile, useRememberedCompanyId } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

/** My jobs: the screen every Member lands on. No Jobs exist yet, so it is always empty. */
export default function MyJobsScreen() {
  const memberships = useMemberships();
  const remembered = useRememberedCompanyId();
  const profile = useMyProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  // An Invite opened before login is picked up now (User story 29).
  const [pendingInvite, setPendingInvite] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    getPendingInviteCode().then((code) => {
      if (!active) return;
      setPendingInvite(code);
      if (code) router.replace(`/invite/${code}`);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function logOut() {
    await supabase.auth.signOut();
    queryClient.clear();
  }

  if (pendingInvite !== null || memberships.isPending || remembered.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Text className="p-4 text-muted">Loading…</Text>
      </SafeAreaView>
    );
  }
  if (memberships.isError) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View accessibilityRole="alert" className="gap-3 p-4">
          <Text className="font-medium text-rose">Could not load your Companies</Text>
          <Text className="text-sm text-muted">{memberships.error.message}</Text>
          <GhostButton title="Log out" onPress={logOut} />
        </View>
      </SafeAreaView>
    );
  }

  const choice = pickCurrentCompany(memberships.data, remembered.data ?? null);
  if (choice.kind === "choose") return <Redirect href="/choose-company" />;

  if (choice.kind === "none") {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Bar title="My jobs" />
        <View className="flex-1 justify-center gap-3 p-4">
          <Text className="text-center text-xl font-semibold text-fg">You are not part of a Company yet</Text>
          <Text className="text-center text-[13px] text-muted">Ask your office to invite you by SMS.</Text>
          <PrimaryButton title="Log out" onPress={logOut} />
        </View>
      </SafeAreaView>
    );
  }

  const { membership } = choice;
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <Bar
        title="My jobs"
        right={
          <View className="flex-row items-center gap-3">
            {memberships.data.length > 1 && (
              <BarAction title="Switch" onPress={() => router.push("/choose-company")} />
            )}
            <GhostButton title="Log out" onPress={logOut} />
          </View>
        }
      />
      <View className="flex-1 gap-3 p-4">
        <Text className="text-xs text-faint" testID="current-company">
          {membership.companyName} · {roleLabel[membership.role]}
          {profile.data?.fullName ? ` · Logged in as ${profile.data.fullName}` : ""}
        </Text>
        <Text className="text-xs text-faint" testID="jobs-empty">
          No jobs yet. Your office will assign you to one.
        </Text>
      </View>
    </SafeAreaView>
  );
}
