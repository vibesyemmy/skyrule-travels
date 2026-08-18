import type { APIRoute } from "astro";
import { promoStore } from "../../../lib/promos/store";
import { renderMarkdown } from "../../../lib/promos/markdown";
import { watLocalToUtcIso } from "../../../lib/promos/datetime";
import { sanitizeDimension } from "../../../lib/promos/image";
import { PLACEMENTS, type Placement, type Promo } from "../../../lib/promos/schema";

export const prerender = false;

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asOptional = (v: unknown): string | null => (asString(v) === "" ? null : asString(v));

export const POST: APIRoute = async ({ request, locals }) => {
  // Same-origin enforcement: the session cookie is SameSite=Lax, and this
  // check stops a cross-site form post from reaching the store. This is
  // defence in depth, not the only barrier — Astro 7's own
  // `security.checkOrigin` (default `true`) already rejects cross-site POSTs
  // before middleware runs. We keep this manual check anyway so the
  // guarantee holds even if that config is ever changed.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json(403, { ok: false, error: "Cross-origin request rejected" });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const placement = asString(body.placement) as Placement;
  if (!PLACEMENTS.includes(placement)) return json(400, { ok: false, error: "Unknown placement" });

  if (body.action === "clear") {
    try {
      await promoStore.clear(placement);
      return json(200, { ok: true });
    } catch (error) {
      console.error("[admin] failed to clear promo:", error);
      return json(500, { ok: false, error: "Could not clear the promo. Your changes were not saved." });
    }
  }

  const headline = asString(body.headline);
  if (!headline) return json(400, { ok: false, error: "A headline is required" });

  const markdown = asString(body.body);

  let image: Promo["image"] = null;
  if (body.image && typeof body.image === "object") {
    const raw = body.image as Record<string, unknown>;
    const url = asString(raw.url);
    const alt = asString(raw.alt);
    const width = sanitizeDimension(raw.width);
    const height = sanitizeDimension(raw.height);
    if (url) {
      // Alt text is required whenever an image is present.
      if (!alt) return json(400, { ok: false, error: "Alt text is required when an image is set" });
      if (width === null || height === null) return json(400, { ok: false, error: "Image dimensions missing" });
      image = { url, alt, width, height };
    }
  }

  let cta: Promo["cta"] = null;
  if (body.cta && typeof body.cta === "object") {
    const raw = body.cta as Record<string, unknown>;
    const label = asString(raw.label);
    const href = asString(raw.href);
    if (label || href) {
      if (!label || !href) return json(400, { ok: false, error: "A CTA needs both a label and a link" });
      cta = { label, href };
    }
  }

  const startsAt = body.startsAt ? watLocalToUtcIso(asString(body.startsAt)) : null;
  const endsAt = body.endsAt ? watLocalToUtcIso(asString(body.endsAt)) : null;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return json(400, { ok: false, error: "The end time must be after the start time" });
  }

  const promo: Promo = {
    id: asString(body.id) || crypto.randomUUID(),
    placement,
    enabled: body.enabled === true,
    eyebrow: asOptional(body.eyebrow),
    headline,
    body: markdown,
    bodyHtml: renderMarkdown(markdown),
    image,
    cta,
    startsAt,
    endsAt,
    updatedAt: new Date().toISOString(),
    updatedBy: locals.adminEmail ?? "unknown",
  };

  try {
    await promoStore.save(promo);
    return json(200, { ok: true, id: promo.id });
  } catch (error) {
    console.error("[admin] failed to save promo:", error);
    return json(500, { ok: false, error: "Could not save. Your changes are still in the form — try again." });
  }
};
