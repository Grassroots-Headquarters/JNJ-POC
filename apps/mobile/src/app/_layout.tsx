import "../../global.css";

import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, Platform } from "react-native";

import { Sentry } from "@/lib/sentry";
import { SessionProvider, useSession } from "@/lib/session";

const queryClient = new QueryClient();

// Refetch when the app comes back to the foreground, so a Job assigned or
// removed while it was in the background shows up straight away. The web
// build gets this from the browser's visibility events already.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}

function RootNavigator() {
  const { session } = useSession();
  // Keep the splash up until the stored session has been read.
  if (session === undefined) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0C" },
      }}
    >
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="index" />
        <Stack.Screen name="choose-company" />
      </Stack.Protected>
      {/* Invite links land here logged in or out; the screen decides what to do. */}
      <Stack.Screen name="invite/[code]" />
    </Stack>
  );
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
