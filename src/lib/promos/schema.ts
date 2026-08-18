export type Placement = "bar" | "modal" | "section";

export const PLACEMENTS: Placement[] = ["bar", "modal", "section"];

export interface PromoImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface PromoCta {
  label: string;
  href: string;
}

export interface Promo {
  id: string;
  placement: Placement;
  enabled: boolean;
  eyebrow: string | null;
  headline: string;
  body: string;
  bodyHtml: string;
  image: PromoImage | null;
  cta: PromoCta | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface PromoDocument {
  version: 1;
  promos: Promo[];
}

export const EMPTY_DOCUMENT: PromoDocument = { version: 1, promos: [] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === "string";
const isNullOrString = (v: unknown): v is string | null => v === null || isString(v);

function parseImage(raw: unknown): PromoImage | null | undefined {
  if (raw === null) return null;
  if (!isObject(raw)) return undefined;
  const { url, width, height, alt } = raw;
  // alt is required whenever an image is present — a promo must not ship inaccessible.
  if (!isString(url) || !isString(alt)) return undefined;
  if (typeof width !== "number" || typeof height !== "number") return undefined;
  if (width <= 0 || height <= 0) return undefined;
  return { url, width, height, alt };
}

function parseCta(raw: unknown): PromoCta | null | undefined {
  if (raw === null) return null;
  if (!isObject(raw)) return undefined;
  const { label, href } = raw;
  if (!isString(label) || !isString(href)) return undefined;
  return { label, href };
}

function parsePromo(raw: unknown): Promo | null {
  try {
    if (!isObject(raw)) return null;

    const { id, placement, enabled, eyebrow, headline, body, bodyHtml,
            startsAt, endsAt, updatedAt, updatedBy } = raw;

    if (!isString(id) || !isString(headline) || !isString(body) || !isString(bodyHtml)) return null;
    if (!isString(placement) || !PLACEMENTS.includes(placement as Placement)) return null;
    if (typeof enabled !== "boolean") return null;
    if (!isNullOrString(eyebrow)) return null;
    if (!isNullOrString(startsAt) || !isNullOrString(endsAt)) return null;
    if (!isString(updatedAt) || !isString(updatedBy)) return null;

    const image = parseImage(raw.image);
    if (image === undefined) return null;
    const cta = parseCta(raw.cta);
    if (cta === undefined) return null;

    return {
      id, placement: placement as Placement, enabled, eyebrow, headline, body,
      bodyHtml, image, cta, startsAt, endsAt, updatedAt, updatedBy,
    };
  } catch {
    // A hostile or unexpected input (e.g. a throwing getter) must not break
    // the whole document — treat it the same as any other malformed promo.
    return null;
  }
}

/**
 * Parse an untrusted promo document. Never throws: anything unrecognisable
 * degrades to an empty document, and individual malformed promos are dropped
 * so one bad record cannot hide the others.
 */
export function parseDocument(raw: unknown): PromoDocument {
  try {
    if (!isObject(raw) || !Array.isArray(raw.promos)) return EMPTY_DOCUMENT;
    const promos = raw.promos
      .map(parsePromo)
      .filter((p): p is Promo => p !== null);
    return { version: 1, promos };
  } catch {
    // A hostile input (e.g. a throwing getter or Proxy) must not break a
    // visitor's page — degrade to "no promos" rather than propagating.
    return EMPTY_DOCUMENT;
  }
}
