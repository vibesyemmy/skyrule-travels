import { defineMiddleware } from "astro:middleware";
import { readSession } from "./lib/auth/session";

// Reachable without a session: the login page, the endpoint that mails the
// link, and the page that consumes it.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/verify", "/api/admin/login"];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const guarded = path.startsWith("/admin") || path.startsWith("/api/admin");

  if (!guarded || PUBLIC_ADMIN_PATHS.includes(path)) return next();

  const secret = process.env.AUTH_SECRET;
  // Fail closed: with no secret we cannot verify anyone, so nobody gets in.
  const email = secret ? await readSession(context.cookies, secret) : null;

  if (!email) {
    return path.startsWith("/api/")
      ? new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      : context.redirect("/admin/login");
  }

  context.locals.adminEmail = email;

  // Belt and braces alongside the meta tag: admin pages must never be indexed.
  const response = await next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
