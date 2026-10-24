import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTypedClient } from "@mba/shared";
import { AppState } from "react-native";

// EXPO_PUBLIC_* values are inlined at build time and must be referenced literally.
export const supabase = createTypedClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
