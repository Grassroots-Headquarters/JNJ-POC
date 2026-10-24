import { formatStartDate, jobAddress, pickCurrentCompany, roleLabel, type Job, type Membership } from "@jnj/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Bar, BarAction, GhostButton, PrimaryButton } from "@/components/ui";
import { getPendingInviteCode } from "@/lib/pending-invite";
import { useJobs, useMemberships, useMyProfile, useRememberedCompanyId } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

/** My jobs: the screen every Member lands on, listing the Jobs they are assigned to (every Job for an Admin). */
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
      <JobList membership={membership} loggedInAs={profile.data?.fullName} />
    </SafeAreaView>
  );
}

function JobList({ membership, loggedInAs }: { membership: Membership; loggedInAs: string | undefined }) {
  const jobs = useJobs(membership.companyId);
  const { session } = useSession();
  const me = session?.user.id;

  return (
    <ScrollView
      contentContainerClassName="gap-3 p-4"
      refreshControl={<RefreshControl refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()} tintColor="#94A3B8" />}
    >
      <Text className="text-xs text-faint" testID="current-company">
        {membership.companyName} · {roleLabel[membership.role]}
        {loggedInAs ? ` · Logged in as ${loggedInAs}` : ""}
      </Text>
      {jobs.isPending && <Text className="text-muted">Loading…</Text>}
      {jobs.isError && (
        <Text accessibilityRole="alert" className="text-rose">
          {jobs.error.message}
        </Text>
      )}
      {jobs.isSuccess && jobs.data.length === 0 && (
        <Text className="text-xs text-faint" testID="jobs-empty">
          No jobs yet. Your office will assign you to one.
        </Text>
      )}
      {jobs.data?.map((job) => <JobRow key={job.id} job={job} me={me} />)}
    </ScrollView>
  );
}

/** Demo `.job` row: name, address, then the start date and who the Job lead is. */
function JobRow({ job, me }: { job: Job; me: string | undefined }) {
  const starts = formatStartDate(job.startDate);
  const iAmLead = !!me && job.jobLead?.userId === me;
  const detail = [starts && `Starts ${starts}`, !iAmLead && job.jobLead && `Job lead ${job.jobLead.fullName}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <View className="gap-1 rounded-[14px] border border-border bg-surface2 p-3.5" testID="job">
      <Text className="font-semibold text-fg">{job.name}</Text>
      <Text className="text-[13px] text-muted">{jobAddress(job)}</Text>
      {detail ? <Text className="text-[13px] text-muted">{detail}</Text> : null}
      {iAmLead && (
        <View className="flex-row">
          <View className="flex-row items-center gap-1.5 rounded-full border border-green/50 bg-green/10 px-2.5 py-1">
            <View className="h-[7px] w-[7px] rounded-full bg-green" />
            <Text className="text-xs font-medium text-green">You&apos;re the Job lead</Text>
          </View>
        </View>
      )}
    </View>
  );
}
