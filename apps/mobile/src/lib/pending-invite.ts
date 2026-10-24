import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "jnj.pendingInviteCode";

/**
 * The Invite code the app was opened with while logged out, kept until the
 * person has logged in so the Invite is picked up without the link again.
 */
export function getPendingInviteCode(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export function rememberPendingInviteCode(code: string): Promise<void> {
  return AsyncStorage.setItem(KEY, code);
}

export function clearPendingInviteCode(): Promise<void> {
  return AsyncStorage.removeItem(KEY);
}
