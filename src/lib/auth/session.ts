import type { AstroCookies } from "astro";
import { signToken, verifyToken } from "./token";

export const SESSION_COOKIE = "skyrule_admin";
const SESSION_TTL_MINUTES = 60 * 24 * 7; // 7 days

export async function createSession(cookies: AstroCookies, email: string, secret: string): Promise<void> {
  const token = await signToken({ email }, secret, SESSION_TTL_MINUTES);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MINUTES * 60,
  });
}

export async function readSession(cookies: AstroCookies, secret: string): Promise<string | null> {
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = await verifyToken<{ email: string }>(raw, secret);
  return payload?.email ?? null;
}

export function destroySession(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}
