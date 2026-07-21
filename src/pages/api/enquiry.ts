// POST /api/enquiry — the site's email engine. Receives enquiry JSON from
// the hero search widget and the contact form and sends it to Skyrule's
// inbox via SMTP (Nodemailer).
//
// Configuration (environment variables, see .env.example):
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS — the sending mailbox
//   MAIL_TO   — destination inbox   (default enquiries@skyruletravels.com)
//   MAIL_FROM — From header         (default SMTP_USER)
// Without SMTP_HOST the endpoint runs in DRY-RUN mode: it logs the composed
// email and reports success, so local dev works without credentials.
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const prerender = false;

const FIELD_LABELS: Record<string, string> = {
  kind: "Enquiry type",
  name: "Name",
  email: "Email",
  "first-name": "First name",
  "last-name": "Last name",
  phone: "Phone",
  message: "Message",
  from: "From",
  to: "To",
  departure: "Departure",
  return: "Return",
  "trip-type": "Trip type",
  travellers: "Travellers",
  cabin: "Cabin class",
  destination: "Destination",
  "check-in": "Check-in",
  "check-out": "Check-out",
  rooms: "Rooms",
  guests: "Guests",
  nationality: "Nationality",
  "visa-purpose": "Visa purpose",
  "package-type": "Package type",
  notes: "Special requests",
  pickup: "Pick-up location",
  dropoff: "Drop-off location",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const POST: APIRoute = async ({ request }) => {
  const json = (status: number, body: object) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  // Honeypot: bots fill it; humans never see it. Pretend success.
  if (data._gotcha) return json(200, { ok: true });

  // Basic validation + sanitation
  const email = (data.email || "").trim();
  const personName = (data.name || `${data["first-name"] || ""} ${data["last-name"] || ""}`).trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json(400, { ok: false, error: "A valid email address is required" });
  if (!personName) return json(400, { ok: false, error: "A name is required" });

  const fields = Object.entries(data)
    .filter(([k, v]) => !k.startsWith("_") && typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => [FIELD_LABELS[k] || k, v.trim().slice(0, 2000)] as const);

  const kind = data.kind || "contact";
  const subject =
    kind === "flights"
      ? `Flight quote request: ${data.from} -> ${data.to}`
      : kind === "hotels"
        ? `Hotel quote request: ${data.destination}`
        : kind === "visa"
          ? `Visa assistance request: ${data.destination}`
          : kind === "packages"
            ? `Package quote request: ${data.destination || "Custom"}`
            : kind === "cars"
              ? `Car hire request: ${data.pickup}`
              : `New enquiry from ${personName} — Skyrule website`;

  const text = fields.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `<h2 style="font-family:sans-serif">${esc(subject)}</h2>
<table cellpadding="8" style="font-family:sans-serif;border-collapse:collapse">
${fields
  .map(
    ([k, v]) =>
      `<tr><td style="border:1px solid #ddd;font-weight:bold">${esc(k)}</td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`,
  )
  .join("\n")}
</table>
<p style="font-family:sans-serif;color:#666">Sent from the skyruletravels.com enquiry form. Reply to answer ${esc(personName)} directly.</p>`;

  const env = import.meta.env;
  const mail = {
    to: env.MAIL_TO || "enquiries@skyruletravels.com",
    from: env.MAIL_FROM || env.SMTP_USER || "no-reply@skyruletravels.com",
    replyTo: `${personName} <${email}>`,
    subject,
    text,
    html,
  };

  try {
    if (!env.SMTP_HOST) {
      // DRY RUN — no SMTP configured (local dev): log instead of sending.
      console.log("[enquiry] DRY RUN (no SMTP_HOST configured) — would send:\n" +
        `  To: ${mail.to}\n  Reply-To: ${mail.replyTo}\n  Subject: ${subject}\n${text.replace(/^/gm, "  ")}`);
      return json(200, { ok: true, dryRun: true });
    }
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: Number(env.SMTP_PORT || 587) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    await transporter.sendMail(mail);
    return json(200, { ok: true });
  } catch (err) {
    console.error("[enquiry] send failed:", err);
    return json(500, { ok: false, error: "Failed to send" });
  }
};
