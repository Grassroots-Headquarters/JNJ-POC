import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("lets visitors reach login, sign-up, code entry and Invite pages", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
    expect(isPublicPath("/verify")).toBe(true);
    expect(isPublicPath("/invite/ABC123")).toBe(true);
  });

  it("gates everything else behind login", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/choose-company")).toBe(false);
    expect(isPublicPath("/jobs/123")).toBe(false);
    expect(isPublicPath("/login-history")).toBe(false);
  });
});
