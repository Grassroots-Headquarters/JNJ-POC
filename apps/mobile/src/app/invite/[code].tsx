import { acceptInvite, inviteStatusLabel, previewInvite, roleLabel } from "@mba/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Bar, Field, GhostButton, Input, Note, PrimaryButton } from "@/components/ui";
import { rememberCompanyId } from "@/lib/current-company";
import { clearPendingInviteCode, rememberPendingInviteCode } from "@/lib/pending-invite";
import { membershipsQueryKey, myUserQueryKey, rememberedCompanyQueryKey, useMyUser } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

/**
 * Where an Invite link lands: mybuilderapp://invite/<code> and
 * https://app.example.com/invite/<code> both open this screen. Logged out, the
 * code is kept and the person logs in first; logged in, they confirm their
 * name (and trade, for a Subcontractor) and join the Company.
 */
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loggedIn = Boolean(session);

  useEffect(() => {
    if (session !== null || !code) return;
    // Logged out: remember the Invite, log in, and index.tsx brings us back here.
    rememberPendingInviteCode(code).then(() => router.replace("/login"));
  }, [session, code, router]);

  const preview = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: () => previewInvite(supabase, code),
    enabled: loggedIn && Boolean(code),
    retry: false,
  });
  const me = useMyUser({ enabled: loggedIn });

  const [typedName, setTypedName] = useState<string | null>(null);
  const [trade, setTrade] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prefilled with the Invite's name if the Admin typed one, else the User's own, until edited.
  const fullName = typedName ?? (preview.data?.invitedName || me.data?.fullName || "");

  const unusable = preview.isError || (preview.isSuccess && (preview.data === null || preview.data.status !== "pending"));
  useEffect(() => {
    if (unusable) void clearPendingInviteCode();
  }, [unusable]);

  async function join() {
    if (!code) return;
    setError(null);
    setBusy(true);
    try {
      const companyId = await acceptInvite(supabase, { code, fullName, trade });
      await clearPendingInviteCode();
      await rememberCompanyId(companyId);
      queryClient.setQueryData(rememberedCompanyQueryKey, companyId);
      await queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
      await queryClient.invalidateQueries({ queryKey: myUserQueryKey });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept the Invite.");
      setBusy(false);
    }
  }

  async function notNow() {
    await clearPendingInviteCode();
    router.replace("/");
  }

  if (!loggedIn || preview.isPending || me.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Text className="p-4 text-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (preview.isError || preview.data === null) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Bar title="Invite" />
        <View className="flex-1 justify-center gap-3 p-4">
          <Text className="text-center text-xl font-semibold text-fg">This Invite link is not valid</Text>
          <Text className="text-center text-[13px] text-muted">
            {preview.isError ? preview.error.message : "Ask the person who invited you to send it again."}
          </Text>
          <PrimaryButton title="Continue" onPress={notNow} />
        </View>
      </SafeAreaView>
    );
  }

  const invite = preview.data;
  if (invite.status !== "pending") {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <Bar title="Invite" />
        <View className="flex-1 justify-center gap-3 p-4">
          <Text className="text-center text-xl font-semibold text-fg">This Invite is no longer open</Text>
          <Text className="text-center text-[13px] text-muted">
            {inviteStatusLabel[invite.status]}: ask {invite.companyName} to send a new one.
          </Text>
          <PrimaryButton title="Continue" onPress={notNow} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Bar title={`Join ${invite.companyName}`} />
        <ScrollView contentContainerClassName="flex-grow justify-center gap-4 p-4">
          <View className="items-center gap-1">
            <Text className="text-xl font-bold text-fg" testID="invite-company">
              {invite.companyName}
            </Text>
            <Text className="text-xs text-faint">has invited you as {roleLabel[invite.role]}</Text>
          </View>
          <View className="gap-3">
            <Field label="Your name">
              <Input aria-label="Your name" autoComplete="name" value={fullName} onChangeText={setTypedName} />
            </Field>
            {invite.role === "subcontractor" && (
              <Field label="Your trade">
                <Input aria-label="Your trade" placeholder="e.g. Electrician" value={trade} onChangeText={setTrade} />
              </Field>
            )}
            {error && <Note>{error}</Note>}
            <PrimaryButton title={`Join ${invite.companyName}`} onPress={join} disabled={busy || fullName.trim() === ""} />
            <GhostButton title="Not now" onPress={notNow} disabled={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
