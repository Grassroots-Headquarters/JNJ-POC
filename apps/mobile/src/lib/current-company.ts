import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mba.currentCompanyId";

/** The Company the User last chose on this device; RLS still decides access. */
export function getRememberedCompanyId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export function rememberCompanyId(companyId: string): Promise<void> {
  return AsyncStorage.setItem(KEY, companyId);
}
