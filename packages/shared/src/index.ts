export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";
export { createTypedClient, type TypedClient } from "./client";
export { getPlatformStatus, type PlatformStatus } from "./platform-status";
export { normalisePhone } from "./phone";
export {
  listMyMemberships,
  signUpCompany,
  getMyProfile,
  roleLabel,
  type Membership,
  type Profile,
  type Role,
  type SignUpCompanyInput,
} from "./memberships";
export { pickCurrentCompany, type CurrentCompanyChoice } from "./current-company";
export { requestLoginCode, verifyLoginCode, loginCodeErrorMessage, WRONG_CODE_MESSAGE } from "./login";
export {
  addOnLabel,
  listAddOns,
  companyHasAddOn,
  summariseAddOn,
  startCheckout,
  openBillingPortal,
  functionErrorMessage,
  setBillingEmail,
  getCompanyBilling,
  type AddOn,
  type AddOnState,
  type AddOnSummary,
  type CheckoutInput,
  type CompanyBilling,
} from "./billing";
