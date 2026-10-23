import { describe, expect, it } from "vitest";
import { loginCodeErrorMessage } from "./login";

describe("loginCodeErrorMessage", () => {
  it("tells the User a wrong or expired code needs a new one", () => {
    expect(loginCodeErrorMessage({ message: "Token has expired or is invalid" })).toBe(
      "That code is wrong or has expired. Send a new code and try again.",
    );
  });

  it("passes other problems through so they can be fixed", () => {
    expect(loginCodeErrorMessage({ message: "Network request failed" })).toBe("Network request failed");
  });
});
