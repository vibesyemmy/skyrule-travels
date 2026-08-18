import nodemailer from "nodemailer";

/**
 * Build the shared SMTP transport.
 *
 * Config is read from process.env, not import.meta.env — Vite would inline the
 * credentials into the build output. astro.config.mjs mirrors .env into
 * process.env so this works in `astro dev` too.
 *
 * Returns null when SMTP_HOST is unset, which callers treat as dry-run mode.
 */
export function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/** The address mail is sent from. Zoho only accepts the authenticated mailbox or a verified alias. */
export function fromAddress(): string {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@skyruletravels.com";
}
