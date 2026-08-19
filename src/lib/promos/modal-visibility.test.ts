import { describe, it, expect } from "vitest";
import {
  shouldShowModal, parseDismissedUntil, isSuppressedPath, snoozeUntil,
  SNOOZE_MS, type ModalContext,
} from "./modal-visibility";

const NOW = Date.parse("2026-08-19T12:00:00Z");

const ctx = (over: Partial<ModalContext> = {}): ModalContext => ({
  path: "/", now: NOW, dismissedRaw: null, shownThisSession: false, converted: false, ...over,
});

describe("shouldShowModal", () => {
  it("shows for a first-time visitor on an ordinary page", () => {
    expect(shouldShowModal(ctx())).toBe(true);
  });

  it("does not show twice in one session — the main fatigue rule", () => {
    expect(shouldShowModal(ctx({ shownThisSession: true }))).toBe(false);
  });

  it("does not show to someone who already submitted an enquiry", () => {
    expect(shouldShowModal(ctx({ converted: true }))).toBe(false);
  });

  it("does not show on the contact page", () => {
    expect(shouldShowModal(ctx({ path: "/contact" }))).toBe(false);
  });

  it("does not show on plan-your-trip", () => {
    expect(shouldShowModal(ctx({ path: "/plan-your-trip" }))).toBe(false);
  });

  it("still shows on other pages", () => {
    expect(shouldShowModal(ctx({ path: "/destinations" }))).toBe(true);
  });

  it("stays hidden inside the snooze window after a dismissal", () => {
    const dismissedRaw = String(NOW + SNOOZE_MS);
    expect(shouldShowModal(ctx({ dismissedRaw }))).toBe(false);
  });

  it("shows again once the snooze window has passed", () => {
    const dismissedRaw = String(NOW - 1);
    expect(shouldShowModal(ctx({ dismissedRaw }))).toBe(true);
  });

  it("shows exactly at the moment the snooze expires", () => {
    expect(shouldShowModal(ctx({ dismissedRaw: String(NOW) }))).toBe(true);
  });

  it("honours the legacy permanent dismissal flag", () => {
    // written by the first version of this feature — must keep opting people out
    expect(shouldShowModal(ctx({ dismissedRaw: "1" }))).toBe(false);
  });

  it("ignores a corrupt dismissal value rather than hiding forever", () => {
    expect(shouldShowModal(ctx({ dismissedRaw: "not-a-number" }))).toBe(true);
  });
});

describe("parseDismissedUntil", () => {
  it("returns null when nothing is stored", () => {
    expect(parseDismissedUntil(null)).toBeNull();
    expect(parseDismissedUntil("")).toBeNull();
    expect(parseDismissedUntil(undefined)).toBeNull();
  });

  it("treats the legacy flag as permanent", () => {
    expect(parseDismissedUntil("1")).toBe(Number.POSITIVE_INFINITY);
  });

  it("parses a timestamp", () => {
    expect(parseDismissedUntil(String(NOW))).toBe(NOW);
  });

  it("returns null for junk", () => {
    expect(parseDismissedUntil("abc")).toBeNull();
  });
});

describe("isSuppressedPath", () => {
  it("matches exactly", () => {
    expect(isSuppressedPath("/contact")).toBe(true);
  });

  it("matches sub-paths", () => {
    expect(isSuppressedPath("/contact/thanks")).toBe(true);
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(isSuppressedPath("/contacts-of-ours")).toBe(false);
  });

  it("does not match unrelated pages", () => {
    expect(isSuppressedPath("/about")).toBe(false);
  });
});

describe("snoozeUntil", () => {
  it("is 30 days out", () => {
    expect(snoozeUntil(NOW) - NOW).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
