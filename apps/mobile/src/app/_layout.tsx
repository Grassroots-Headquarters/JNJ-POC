import "../../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Sentry } from "@/lib/sentry";

const queryClient = new QueryClient();

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#16161A" },
          headerTintColor: "#F1F5F9",
          contentStyle: { backgroundColor: "#0A0A0C" },
        }}
      />
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
