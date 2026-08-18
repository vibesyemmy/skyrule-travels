import { describe, it, expect } from "vitest";
import { watLocalToUtcIso, utcIsoToWatLocal } from "./datetime";

describe("watLocalToUtcIso", () => {
  it("subtracts the one hour WAT offset", () => {
    expect(watLocalToUtcIso("2026-09-01T08:00")).toBe("2026-09-01T07:00:00.000Z");
  });

  it("rolls back across midnight", () => {
    expect(watLocalToUtcIso("2026-09-01T00:30")).toBe("2026-08-31T23:30:00.000Z");
  });

  it("returns null for an empty string", () => {
    expect(watLocalToUtcIso("")).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(watLocalToUtcIso("not-a-date")).toBeNull();
  });
});

describe("utcIsoToWatLocal", () => {
  it("adds the one hour WAT offset", () => {
    expect(utcIsoToWatLocal("2026-09-01T07:00:00.000Z")).toBe("2026-09-01T08:00");
  });

  it("rolls forward across midnight", () => {
    expect(utcIsoToWatLocal("2026-08-31T23:30:00.000Z")).toBe("2026-09-01T00:30");
  });

  it("returns an empty string for null", () => {
    expect(utcIsoToWatLocal(null)).toBe("");
  });
});

describe("round trip", () => {
  it("survives both directions unchanged", () => {
    const local = "2026-12-25T17:45";
    expect(utcIsoToWatLocal(watLocalToUtcIso(local)!)).toBe(local);
  });
});
