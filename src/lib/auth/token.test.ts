import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./token";

const SECRET = "test-secret-value";
const now = new Date("2026-08-18T10:00:00Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe("signToken / verifyToken", () => {
  it("round-trips a payload", async () => {
    const token = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    const payload = await verifyToken<{ email: string }>(token, SECRET, now);
    expect(payload?.email).toBe("a@b.com");
  });

  it("rejects a token after it expires", async () => {
    const token = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    expect(await verifyToken(token, SECRET, later(16))).toBeNull();
  });

  it("accepts a token one minute before expiry", async () => {
    const token = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    expect(await verifyToken(token, SECRET, later(14))).not.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    expect(await verifyToken(token, "other-secret", now)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    const [body, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ email: "attacker@evil.com", exp: 9999999999 }),
    ).toString("base64url");
    expect(await verifyToken(`${forged}.${signature}`, SECRET, now)).toBeNull();
    expect(body).not.toBe(forged);
  });

  it("rejects a malformed token", async () => {
    expect(await verifyToken("garbage", SECRET, now)).toBeNull();
  });

  it("rejects an empty token", async () => {
    expect(await verifyToken("", SECRET, now)).toBeNull();
  });

  it("gives two tokens for the same payload different signatures via the nonce", async () => {
    const a = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    const b = await signToken({ email: "a@b.com" }, SECRET, 15, now);
    expect(a).not.toBe(b);
  });
});
