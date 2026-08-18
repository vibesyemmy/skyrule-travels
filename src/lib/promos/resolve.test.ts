import { describe, it, expect } from "vitest";
import { isLive, activeFor } from "./resolve";
import type { Promo } from "./schema";

const base: Promo = {
  id: "1", placement: "bar", enabled: true, eyebrow: null,
  headline: "H", body: "B", bodyHtml: "<p>B</p>",
  image: null, cta: null, startsAt: null, endsAt: null,
  updatedAt: "2026-08-01T00:00:00.000Z", updatedBy: "a@b.com",
};

const at = (iso: string) => new Date(iso);

describe("isLive", () => {
  it("is live with no window at all", () => {
    expect(isLive(base, at("2026-09-01T12:00:00Z"))).toBe(true);
  });

  it("is not live when disabled, even inside its window", () => {
    expect(isLive({ ...base, enabled: false }, at("2026-09-01T12:00:00Z"))).toBe(false);
  });

  it("is not live before the start", () => {
    const p = { ...base, startsAt: "2026-09-01T08:00:00Z" };
    expect(isLive(p, at("2026-09-01T07:59:59Z"))).toBe(false);
  });

  it("is live exactly at the start (inclusive)", () => {
    const p = { ...base, startsAt: "2026-09-01T08:00:00Z" };
    expect(isLive(p, at("2026-09-01T08:00:00Z"))).toBe(true);
  });

  it("is live one second before the end", () => {
    const p = { ...base, endsAt: "2026-09-30T23:00:00Z" };
    expect(isLive(p, at("2026-09-30T22:59:59Z"))).toBe(true);
  });

  it("is not live exactly at the end (exclusive)", () => {
    const p = { ...base, endsAt: "2026-09-30T23:00:00Z" };
    expect(isLive(p, at("2026-09-30T23:00:00Z"))).toBe(false);
  });

  it("treats a null start as already live", () => {
    const p = { ...base, startsAt: null, endsAt: "2026-09-30T23:00:00Z" };
    expect(isLive(p, at("2020-01-01T00:00:00Z"))).toBe(true);
  });

  it("treats a null end as never expiring", () => {
    const p = { ...base, startsAt: "2026-09-01T08:00:00Z", endsAt: null };
    expect(isLive(p, at("2099-01-01T00:00:00Z"))).toBe(true);
  });
});

describe("activeFor", () => {
  it("returns null when nothing matches the placement", () => {
    expect(activeFor([base], "modal", at("2026-09-01T12:00:00Z"))).toBeNull();
  });

  it("returns the live promo for the placement", () => {
    const found = activeFor([base], "bar", at("2026-09-01T12:00:00Z"));
    expect(found?.id).toBe("1");
  });

  it("ignores promos for other placements", () => {
    const modal: Promo = { ...base, id: "2", placement: "modal" };
    const found = activeFor([base, modal], "modal", at("2026-09-01T12:00:00Z"));
    expect(found?.id).toBe("2");
  });

  it("returns null when the only candidate has expired", () => {
    const expired = { ...base, endsAt: "2026-08-01T00:00:00Z" };
    expect(activeFor([expired], "bar", at("2026-09-01T12:00:00Z"))).toBeNull();
  });
});
