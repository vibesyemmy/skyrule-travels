import type { APIRoute } from "astro";
import { isAllowed } from "../../../lib/auth/allowlist";
import { signToken } from "../../../lib/auth/token";
import { createTransport, fromAddress } from "../../../lib/mail";

export const prerender = false;

const LINK_TTL_MINUTES = 15;

export const POST: APIRoute = async ({ request, url }) => {
  // The same response is returned whether or not the address is allowed, so
  // this endpoint cannot be used to discover who has admin access.
  const accepted = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[admin] AUTH_SECRET is not set — refusing to issue links");
    return new Response(JSON.stringify({ ok: false, error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let email = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return accepted();
  }

  if (!isAllowed(email, process.env.ADMIN_EMAILS)) return accepted();

  const token = await signToken({ email: email.trim().toLowerCase() }, secret, LINK_TTL_MINUTES);
  const link = new URL(`/admin/verify?token=${encodeURIComponent(token)}`, url.origin).toString();

  const transporter = createTransport();
  if (!transporter) {
    console.log(`[admin] DRY RUN — magic link for ${email}: ${link}`);
    return accepted();
  }

  try {
    await transporter.sendMail({
      to: email,
      from: fromAddress(),
      subject: "Your Skyrule admin sign-in link",
      text: `Sign in to the Skyrule promo admin:\n\n${link}\n\nThis link expires in ${LINK_TTL_MINUTES} minutes. If you didn't request it, ignore this email.`,
    });
  } catch (error) {
    console.error("[admin] failed to send magic link:", error);
  }

  return accepted();
};
