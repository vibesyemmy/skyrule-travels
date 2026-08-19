import { describe, it, expect } from "vitest";
import { isAllowed } from "./allowlist";

describe("isAllowed", () => {
  it("accepts an address on the list", () => {
    expect(isAllowed("a@b.com", "a@b.com,c@d.com")).toBe(true);
  });

  it("rejects an address not on the list", () => {
    expect(isAllowed("x@y.com", "a@b.com,c@d.com")).toBe(false);
  });

  it("ignores case", () => {
    expect(isAllowed("A@B.CoM", "a@b.com")).toBe(true);
  });

  it("ignores surrounding whitespace in the list", () => {
    expect(isAllowed("c@d.com", "a@b.com , c@d.com ")).toBe(true);
  });

  it("ignores surrounding whitespace in the input", () => {
    expect(isAllowed("  a@b.com  ", "a@b.com")).toBe(true);
  });

  it("allows nobody when the list is empty", () => {
    expect(isAllowed("a@b.com", "")).toBe(false);
  });

  it("allows nobody when the list is undefined", () => {
    expect(isAllowed("a@b.com", undefined)).toBe(false);
  });

  it("rejects an empty address even against a populated list", () => {
    expect(isAllowed("", "a@b.com")).toBe(false);
  });
});
