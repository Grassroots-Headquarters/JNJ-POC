/**
 * The fixed test data from `supabase/seed.sql` and `supabase/config.toml`.
 * Phone numbers are in the Ofcom test range; the OTP code is always 123456.
 */
export const TEST_OTP = "123456";

export const TEST_USERS = {
  /** Admin of Company A. */
  alexAdmin: "+447700900001",
  /** Site team member of Company A. */
  samSite: "+447700900002",
  /** Admin of Company B. */
  beaBoss: "+447700900003",
  /** Site team in Company A and Subcontractor in Company B. */
  deeDual: "+447700900004",
  /** Client of Company A's first Job; holds no Membership. */
  cleoClient: "+447700900005",
} as const;

export const TEST_USER_IDS = {
  alexAdmin: "10000000-0000-4000-8000-000000000001",
  samSite: "10000000-0000-4000-8000-000000000002",
  beaBoss: "10000000-0000-4000-8000-000000000003",
  deeDual: "10000000-0000-4000-8000-000000000004",
  cleoClient: "10000000-0000-4000-8000-000000000005",
} as const;

export const COMPANY_A = {
  id: "20000000-0000-4000-8000-00000000000a",
  name: "JNJ Building",
  referralCode: "A7Q4KX",
} as const;

export const COMPANY_B = {
  id: "20000000-0000-4000-8000-00000000000b",
  name: "Hart Builders",
  referralCode: "BH2M9T",
} as const;

/**
 * An unseeded test number for sign-up flows: `freeTestPhone(6)` is
 * +447700900006. Numbers 6-19 are configured; each test picks a distinct one.
 */
export function freeTestPhone(n: number): string {
  if (n < 6 || n > 19) throw new Error("Free test numbers run from 6 to 19");
  return `+4477009000${String(n).padStart(2, "0")}`;
}
