import { describe, expect, it } from "vitest";
import { normalisePhone } from "./phone";

describe("normalisePhone", () => {
  it("turns a UK mobile typed with the trunk 0 into E.164", () => {
    expect(normalisePhone("07700 900123")).toBe("+447700900123");
  });

  it("accepts a UK number already written with +44", () => {
    expect(normalisePhone("+44 7700 900123")).toBe("+447700900123");
  });

  it("accepts the 00 international prefix", () => {
    expect(normalisePhone("0044 7700 900123")).toBe("+447700900123");
  });

  it("accepts a bare 44 country code", () => {
    expect(normalisePhone("447700900123")).toBe("+447700900123");
  });

  it("ignores punctuation people type", () => {
    expect(normalisePhone("(07700) 900-123")).toBe("+447700900123");
  });

  it("keeps a non-UK number that is already international", () => {
    expect(normalisePhone("+1 415 555 0100")).toBe("+14155550100");
  });

  it("rejects a UK number with the wrong number of digits", () => {
    expect(normalisePhone("07700 9001")).toBeNull();
  });

  it("rejects something that is not a phone number", () => {
    expect(normalisePhone("call me")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });
});
