# Promo Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated admin area where Skyrule staff publish a promo — image, markdown copy, optional CTA — choosing its placement (announcement bar, entry modal, or homepage section) and an optional schedule.

**Architecture:** Pure logic (schema, live-window resolution, markdown, timezone, tokens) is separated from I/O so it can be unit tested without network or mocks. Vercel Blob stores both the uploaded images and a single `promos.json`. Authentication is a signed magic link against an email allowlist — no user table. The homepage renders promos server-side; other pages fetch them client-side.

**Tech Stack:** Astro 7, React 19, Tailwind 4, Vercel adapter, `@vercel/blob`, `marked`, `sanitize-html`, `nodemailer` (already present), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-promo-management-design.md`

---

## Conventions for the engineer

You are working in an Astro site that is currently **fully static** except for `src/pages/api/enquiry.ts`. A few things that will bite you if nobody says them:

- **Astro opts a page into server rendering per-file** with `export const prerender = false;`. There is no global "SSR mode" switch to flip, and you should not add one.
- **Environment variables must be read from `process.env`, never `import.meta.env`.** `astro.config.mjs` mirrors `.env` into `process.env` deliberately — reading `import.meta.env` would inline secrets into the build output. See `src/pages/api/enquiry.ts` for the established pattern.
- **Never run a dev server with plain `npm run dev`.** This project uses `astro dev --background`, managed with `astro dev stop`, `astro dev status`, `astro dev logs`.
- Commit after every task. The commit command is given in each task's final step.

## File structure

**Pure logic — no I/O, fully unit tested:**

| File | Responsibility |
|---|---|
| `src/lib/promos/schema.ts` | Types, constants, and validation of the promo document |
| `src/lib/promos/resolve.ts` | Given promos + a `now`, decide which is live |
| `src/lib/promos/markdown.ts` | Markdown to sanitized HTML |
| `src/lib/promos/datetime.ts` | WAT to UTC conversion for form fields |
| `src/lib/auth/token.ts` | HMAC sign/verify for magic links and sessions |

**I/O:**

| File | Responsibility |
|---|---|
| `src/lib/promos/store.ts` | Read/write `promos.json` in Blob; enforce one-per-placement on write |
| `src/lib/mail.ts` | Shared nodemailer transport (extracted from `enquiry.ts`) |

**HTTP surface:**

| File | Responsibility |
|---|---|
| `src/middleware.ts` | Guard `/admin/*` and `/api/admin/*` |
| `src/pages/api/admin/login.ts` | Issue a magic link |
| `src/pages/api/admin/promo.ts` | Save or clear a promo |
| `src/pages/api/admin/upload.ts` | Image upload to Blob |
| `src/pages/api/promo/active.ts` | Public live-promo status |

**UI:**

| File | Responsibility |
|---|---|
| `src/pages/admin/login.astro` | Email entry |
| `src/pages/admin/verify.astro` | Consume magic link, set session |
| `src/pages/admin/index.astro` | Dashboard — three placement slots |
| `src/pages/admin/[placement].astro` | Editor |
| `src/components/promo/AnnouncementBar.astro` | Bar renderer |
| `src/components/promo/PromoModal.astro` | Modal renderer |
| `src/components/promo/PromoSection.astro` | Homepage section renderer |

**Modified:** `src/pages/api/enquiry.ts` (use shared mail transport), `src/pages/index.astro` (server-render promos), `src/layouts/BaseLayout.astro` (client-side injection), `.env.example`, `package.json`.

---

# Phase 1 — Test harness and pure logic

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Test: `src/lib/smoke.test.ts` (deleted at the end of this task)

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 6: Delete the smoke test**

```bash
rm src/lib/smoke.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest"
```

---

## Task 2: Promo schema and validation

A corrupt or hand-edited `promos.json` must never throw on a visitor's page request — it degrades to "no promos". That is what makes this validation load-bearing rather than ceremonial.

**Files:**
- Create: `src/lib/promos/schema.ts`
- Test: `src/lib/promos/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/promos/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseDocument, EMPTY_DOCUMENT, PLACEMENTS } from "./schema";

const validPromo = {
  id: "abc",
  placement: "bar",
  enabled: true,
  eyebrow: null,
  headline: "Dubai from N850,000",
  body: "**Return fares**",
  bodyHtml: "<p><strong>Return fares</strong></p>",
  image: null,
  cta: null,
  startsAt: null,
  endsAt: null,
  updatedAt: "2026-08-18T10:00:00.000Z",
  updatedBy: "someone@skyruletravels.com",
};

describe("PLACEMENTS", () => {
  it("has exactly the three supported placements", () => {
    expect(PLACEMENTS).toEqual(["bar", "modal", "section"]);
  });
});

describe("parseDocument", () => {
  it("accepts a valid document", () => {
    const doc = parseDocument({ version: 1, promos: [validPromo] });
    expect(doc.promos).toHaveLength(1);
    expect(doc.promos[0].headline).toBe("Dubai from N850,000");
  });

  it("returns an empty document for null", () => {
    expect(parseDocument(null)).toEqual(EMPTY_DOCUMENT);
  });

  it("returns an empty document for a non-object", () => {
    expect(parseDocument("nonsense")).toEqual(EMPTY_DOCUMENT);
  });

  it("returns an empty document when promos is not an array", () => {
    expect(parseDocument({ version: 1, promos: {} })).toEqual(EMPTY_DOCUMENT);
  });

  it("drops individual promos that are malformed, keeping valid ones", () => {
    const doc = parseDocument({
      version: 1,
      promos: [validPromo, { id: "broken" }],
    });
    expect(doc.promos).toHaveLength(1);
    expect(doc.promos[0].id).toBe("abc");
  });

  it("drops a promo with an unknown placement", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, placement: "sidebar" }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("keeps a fully populated image and cta", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{
        ...validPromo,
        image: { url: "https://x/y.jpg", width: 1600, height: 900, alt: "A plane" },
        cta: { label: "Get a quote", href: "/contact" },
      }],
    });
    expect(doc.promos[0].image?.width).toBe(1600);
    expect(doc.promos[0].cta?.label).toBe("Get a quote");
  });

  it("drops a promo whose image is missing alt text", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{
        ...validPromo,
        image: { url: "https://x/y.jpg", width: 1600, height: 900 },
      }],
    });
    expect(doc.promos).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/promos/schema.ts`:

```ts
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
}

/**
 * Parse an untrusted promo document. Never throws: anything unrecognisable
 * degrades to an empty document, and individual malformed promos are dropped
 * so one bad record cannot hide the others.
 */
export function parseDocument(raw: unknown): PromoDocument {
  if (!isObject(raw) || !Array.isArray(raw.promos)) return EMPTY_DOCUMENT;
  const promos = raw.promos
    .map(parsePromo)
    .filter((p): p is Promo => p !== null);
  return { version: 1, promos };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/promos/schema.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promos/schema.ts src/lib/promos/schema.test.ts
git commit -m "feat: promo document schema and forgiving validation"
```

---

## Task 3: Live-window resolution

**Files:**
- Create: `src/lib/promos/resolve.ts`
- Test: `src/lib/promos/resolve.test.ts`

`now` is always a parameter, never read from the clock inside these functions. That is what makes the boundary cases testable.

- [ ] **Step 1: Write the failing test**

Create `src/lib/promos/resolve.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/resolve.test.ts`
Expected: FAIL — cannot resolve `./resolve`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/promos/resolve.ts`:

```ts
import type { Placement, Promo } from "./schema";

/**
 * Whether a promo should be showing at `now`. The start boundary is inclusive
 * and the end boundary exclusive, so a promo ending at 23:00 is gone at 23:00
 * exactly rather than lingering for that second.
 */
export function isLive(promo: Promo, now: Date): boolean {
  if (!promo.enabled) return false;
  if (promo.startsAt && now.getTime() < new Date(promo.startsAt).getTime()) return false;
  if (promo.endsAt && now.getTime() >= new Date(promo.endsAt).getTime()) return false;
  return true;
}

/**
 * The single live promo for a placement, or null. One-per-placement is enforced
 * when saving, so this can return the first match without tie-breaking.
 */
export function activeFor(promos: Promo[], placement: Placement, now: Date): Promo | null {
  return promos.find((p) => p.placement === placement && isLive(p, now)) ?? null;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/promos/resolve.test.ts`
Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promos/resolve.ts src/lib/promos/resolve.test.ts
git commit -m "feat: live-window resolution for promos"
```

---

## Task 4: WAT/UTC conversion

The client types times meaning West Africa Time (UTC+1, no daylight saving). Storing those values as UTC without conversion would fire every promo an hour late. These two functions are the only place that conversion happens.

**Files:**
- Create: `src/lib/promos/datetime.ts`
- Test: `src/lib/promos/datetime.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/promos/datetime.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { watLocalToUtcIso, utcIsoToWatLocal } from "./datetime";

describe("watLocalToUtcIso", () => {
  it("subtracts the one hour WAT offset", () => {
    expect(watLocalToUtcIso("2026-09-01T08:00")).toBe("2026-09-01T07:00:00.000Z");
  });

  it("rolls back across midnight", () => {
    expect(watLocalToUtcIso("2026-09-01T00:30")).toBe("2026-08-31T23:30:00.000Z");
  });

  it("returns null for an empty string", () => {
    expect(watLocalToUtcIso("")).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(watLocalToUtcIso("not-a-date")).toBeNull();
  });
});

describe("utcIsoToWatLocal", () => {
  it("adds the one hour WAT offset", () => {
    expect(utcIsoToWatLocal("2026-09-01T07:00:00.000Z")).toBe("2026-09-01T08:00");
  });

  it("rolls forward across midnight", () => {
    expect(utcIsoToWatLocal("2026-08-31T23:30:00.000Z")).toBe("2026-09-01T00:30");
  });

  it("returns an empty string for null", () => {
    expect(utcIsoToWatLocal(null)).toBe("");
  });
});

describe("round trip", () => {
  it("survives both directions unchanged", () => {
    const local = "2026-12-25T17:45";
    expect(utcIsoToWatLocal(watLocalToUtcIso(local)!)).toBe(local);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/datetime.test.ts`
Expected: FAIL — cannot resolve `./datetime`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/promos/datetime.ts`:

```ts
/**
 * West Africa Time is a fixed UTC+1 with no daylight saving, so the conversion
 * is a constant offset and needs no timezone database.
 */
const WAT_OFFSET_MINUTES = 60;
const MINUTE_MS = 60_000;

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Convert a `datetime-local` input value (interpreted as WAT) to a UTC ISO string. */
export function watLocalToUtcIso(local: string): string | null {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  const utcMs = Date.UTC(+y, +m - 1, +d, +h, +min) - WAT_OFFSET_MINUTES * MINUTE_MS;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Convert a stored UTC ISO string to a `datetime-local` input value in WAT. */
export function utcIsoToWatLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + WAT_OFFSET_MINUTES * MINUTE_MS);
  return shifted.toISOString().slice(0, 16);
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/promos/datetime.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promos/datetime.ts src/lib/promos/datetime.test.ts
git commit -m "feat: WAT/UTC conversion for promo schedules"
```

---

## Task 5: Markdown to sanitized HTML

Conversion happens once at save time and the result is stored, so no markdown parser ever ships to the marketing site.

**Files:**
- Create: `src/lib/promos/markdown.ts`
- Test: `src/lib/promos/markdown.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the dependencies**

```bash
npm install marked sanitize-html
npm install -D @types/sanitize-html
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/promos/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders bold", () => {
    expect(renderMarkdown("**loud**")).toContain("<strong>loud</strong>");
  });

  it("renders italic", () => {
    expect(renderMarkdown("*soft*")).toContain("<em>soft</em>");
  });

  it("renders unordered lists", () => {
    const html = renderMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
  });

  it("renders links and hardens them", () => {
    const html = renderMarkdown("[contact](/contact)");
    expect(html).toContain('href="/contact"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("strips script tags", () => {
    const html = renderMarkdown("hello <script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("strips event handler attributes", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips javascript: URLs", () => {
    const html = renderMarkdown("[bad](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("strips heading tags, which would break the promo type scale", () => {
    const html = renderMarkdown("# Enormous");
    expect(html).not.toContain("<h1");
    expect(html).toContain("Enormous");
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/markdown.test.ts`
Expected: FAIL — cannot resolve `./markdown`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/promos/markdown.ts`:

```ts
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Convert promo markdown to HTML safe to inject into a page.
 *
 * The allowed tag list is deliberately narrow: headings, images, and tables
 * would let promo copy break the site's type scale and layout, so they are
 * stripped while their text content is kept.
 */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return "";

  const raw = marked.parse(source, { async: false }) as string;

  return sanitizeHtml(raw, {
    allowedTags: ["p", "strong", "em", "a", "ul", "ol", "li", "br"],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  }).trim();
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/promos/markdown.test.ts`
Expected: all 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/promos/markdown.ts src/lib/promos/markdown.test.ts package.json package-lock.json
git commit -m "feat: markdown rendering with strict sanitisation"
```

---

# Phase 2 — Storage

## Task 6: Blob-backed promo store

The store takes its Blob client and `fetch` as constructor arguments. That is not ceremony — it is what lets every test in this task run with no network and no mocking library.

**Files:**
- Create: `src/lib/promos/store.ts`
- Test: `src/lib/promos/store.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the Blob SDK**

```bash
npm install @vercel/blob
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/promos/store.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createPromoStore, type BlobClient } from "./store";
import { EMPTY_DOCUMENT, type Promo } from "./schema";

const promo = (over: Partial<Promo> = {}): Promo => ({
  id: "1", placement: "bar", enabled: true, eyebrow: null,
  headline: "H", body: "B", bodyHtml: "<p>B</p>",
  image: null, cta: null, startsAt: null, endsAt: null,
  updatedAt: "2026-08-01T00:00:00.000Z", updatedBy: "a@b.com",
  ...over,
});

/** In-memory stand-in for Vercel Blob. Records what was written. */
function fakeBlob(initial?: string) {
  const state = { content: initial, puts: 0 };
  const client: BlobClient = {
    async list() {
      return state.content === undefined
        ? { blobs: [] }
        : { blobs: [{ url: "https://blob.test/promos.json", pathname: "promos.json" }] };
    },
    async put(_pathname, body) {
      state.content = body;
      state.puts += 1;
      return { url: "https://blob.test/promos.json" };
    },
  };
  const fetchImpl = async () =>
    ({ ok: true, json: async () => JSON.parse(state.content!) }) as Response;
  return { client, fetchImpl, state };
}

describe("read", () => {
  it("returns an empty document when nothing has been stored", async () => {
    const { client, fetchImpl } = fakeBlob();
    const store = createPromoStore(client, fetchImpl);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("returns the stored document", async () => {
    const { client, fetchImpl } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ headline: "Stored" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    const doc = await store.read();
    expect(doc.promos[0].headline).toBe("Stored");
  });

  it("degrades to an empty document when the fetch fails", async () => {
    const { client } = fakeBlob(JSON.stringify({ version: 1, promos: [promo()] }));
    const failing = async () => { throw new Error("network down"); };
    const store = createPromoStore(client, failing as unknown as typeof fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("degrades to an empty document when the stored JSON is corrupt", async () => {
    const { client } = fakeBlob("{not json");
    const broken = async () =>
      ({ ok: true, json: async () => { throw new SyntaxError("bad"); } }) as unknown as Response;
    const store = createPromoStore(client, broken as unknown as typeof fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("degrades to an empty document when listing throws", async () => {
    const client: BlobClient = {
      async list() { throw new Error("blob unreachable"); },
      async put() { return { url: "" }; },
    };
    const store = createPromoStore(client, fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });
});

describe("save", () => {
  it("adds a promo to an empty document", async () => {
    const { client, fetchImpl, state } = fakeBlob(JSON.stringify(EMPTY_DOCUMENT));
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new" }));
    expect(JSON.parse(state.content!).promos).toHaveLength(1);
  });

  it("replaces a promo with the same id rather than duplicating it", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "1", headline: "Old" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "1", headline: "New" }));
    const saved = JSON.parse(state.content!).promos;
    expect(saved).toHaveLength(1);
    expect(saved[0].headline).toBe("New");
  });

  it("disables an existing enabled promo in the same placement", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "old", placement: "bar" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new", placement: "bar", enabled: true }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "old")!.enabled).toBe(false);
    expect(saved.find((p) => p.id === "new")!.enabled).toBe(true);
  });

  it("leaves other placements untouched", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "modal", placement: "modal" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "bar", placement: "bar" }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "modal")!.enabled).toBe(true);
  });

  it("does not disable anything when saving a disabled promo", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "old", placement: "bar" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new", placement: "bar", enabled: false }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "old")!.enabled).toBe(true);
  });
});

describe("clear", () => {
  it("removes every promo for a placement", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "a", placement: "bar" }), promo({ id: "b", placement: "modal" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.clear("bar");
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved).toHaveLength(1);
    expect(saved[0].placement).toBe("modal");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/store.test.ts`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/promos/store.ts`:

```ts
import { list, put } from "@vercel/blob";
import { EMPTY_DOCUMENT, parseDocument, type Placement, type Promo, type PromoDocument } from "./schema";

const PROMOS_PATH = "promos.json";

/**
 * The slice of the Vercel Blob API this module uses, narrowed so tests can
 * supply an in-memory stand-in without pulling in the SDK.
 */
export interface BlobClient {
  list(options: { prefix: string; limit?: number }): Promise<{ blobs: { url: string; pathname: string }[] }>;
  put(pathname: string, body: string, options?: Record<string, unknown>): Promise<{ url: string }>;
}

export function createPromoStore(client: BlobClient, fetchImpl: typeof fetch) {
  async function locate(): Promise<string | null> {
    const { blobs } = await client.list({ prefix: PROMOS_PATH, limit: 1 });
    return blobs[0]?.url ?? null;
  }

  /**
   * Read the promo document. Never throws — every failure mode (Blob down,
   * missing document, corrupt JSON) degrades to an empty document so a
   * visitor's page renders exactly as it would with no promos configured.
   *
   * `fresh` appends a cache-buster, needed in the admin where a read
   * immediately follows a write and the CDN copy would still be stale.
   */
  async function read(options: { fresh?: boolean } = {}): Promise<PromoDocument> {
    try {
      const url = await locate();
      if (!url) return EMPTY_DOCUMENT;
      const target = options.fresh ? `${url}?t=${Date.now()}` : url;
      const response = await fetchImpl(target, { cache: "no-store" });
      if (!response.ok) return EMPTY_DOCUMENT;
      return parseDocument(await response.json());
    } catch {
      return EMPTY_DOCUMENT;
    }
  }

  /** Overwrite the document. Unlike read, this throws — the admin must see failures. */
  async function write(document: PromoDocument): Promise<void> {
    await client.put(PROMOS_PATH, JSON.stringify(document, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  }

  /**
   * Save a promo, enforcing one enabled promo per placement. Enabling a promo
   * disables any other in the same placement, so the conflict is resolved at
   * the moment the client causes it rather than silently at render time.
   */
  async function save(promo: Promo): Promise<void> {
    const document = await read({ fresh: true });
    const others = document.promos.filter((p) => p.id !== promo.id);
    const adjusted = promo.enabled
      ? others.map((p) => (p.placement === promo.placement ? { ...p, enabled: false } : p))
      : others;
    await write({ version: 1, promos: [...adjusted, promo] });
  }

  async function clear(placement: Placement): Promise<void> {
    const document = await read({ fresh: true });
    await write({ version: 1, promos: document.promos.filter((p) => p.placement !== placement) });
  }

  return { read, write, save, clear };
}

export const promoStore = createPromoStore({ list, put } as unknown as BlobClient, fetch);
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/promos/store.test.ts`
Expected: all 11 tests PASS.

- [ ] **Step 6: Verify the real Blob option names before trusting them**

The options passed to `put` (`addRandomSuffix`, `allowOverwrite`, `cacheControlMaxAge`) are typed by the SDK, so a mismatch shows as a type error rather than a silent runtime failure.

Run: `npx tsc --noEmit`
Expected: no errors mentioning `src/lib/promos/store.ts`. If the SDK reports an unknown option, open `node_modules/@vercel/blob/dist/index.d.ts`, find the `PutCommandOptions` type, and correct the call to match — do not delete the option.

- [ ] **Step 7: Commit**

```bash
git add src/lib/promos/store.ts src/lib/promos/store.test.ts package.json package-lock.json
git commit -m "feat: blob-backed promo store with one-per-placement enforcement"
```

---

# Phase 3 — Authentication

## Task 7: Signed tokens

One module signs and verifies both magic links and session cookies — they differ only in payload and lifetime.

**Files:**
- Create: `src/lib/auth/token.ts`
- Test: `src/lib/auth/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/token.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/auth/token.test.ts`
Expected: FAIL — cannot resolve `./token`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth/token.ts`:

```ts
const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64url");

const fromBase64Url = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64url"));

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** Constant-time comparison, so signature checking cannot be timed. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Sign a payload with an expiry, `ttlMinutes` from `now`. A random nonce is
 * folded in so two links issued in the same second are not identical.
 */
export async function signToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlMinutes: number,
  now: Date = new Date(),
): Promise<string> {
  const body = {
    ...payload,
    exp: Math.floor(now.getTime() / 1000) + ttlMinutes * 60,
    nonce: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Verify signature then expiry. Returns null on any failure — never throws. */
export async function verifyToken<T>(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<(T & { exp: number }) | null> {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expected = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encoded));
    if (!equal(new Uint8Array(expected), fromBase64Url(signature))) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number") return null;
    if (Math.floor(now.getTime() / 1000) >= payload.exp) return null;

    return payload as T & { exp: number };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/auth/token.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/token.ts src/lib/auth/token.test.ts
git commit -m "feat: HMAC token signing for magic links and sessions"
```

---

## Task 8: Extract the shared mail transport

This is the only task that changes code already running in production. The enquiry form must behave identically afterwards.

**Files:**
- Create: `src/lib/mail.ts`
- Modify: `src/pages/api/enquiry.ts:110-125` (the `nodemailer.createTransport` call and its use)

- [ ] **Step 1: Read the current transport code**

Run: `sed -n '100,140p' src/pages/api/enquiry.ts`

Note exactly how `secure` is derived from the port and how the 550 retry-without-Reply-To fallback works. Both behaviours must survive this refactor.

- [ ] **Step 2: Create the shared module**

Create `src/lib/mail.ts`:

```ts
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
```

- [ ] **Step 3: Rewire enquiry.ts**

In `src/pages/api/enquiry.ts`, add the import at the top:

```ts
import { createTransport, fromAddress } from "../../lib/mail";
```

Replace the inline `nodemailer.createTransport({...})` call with:

```ts
const transporter = createTransport();
```

Replace the `from` value in the `mail` object with `fromAddress()`, and change the dry-run check from `if (!env.SMTP_HOST)` to `if (!transporter)`. Remove the now-unused `import nodemailer from "nodemailer";`.

Leave the 550 retry-without-Reply-To fallback exactly as it is.

- [ ] **Step 4: Verify the enquiry form still sends**

```bash
npx astro dev --background
```

Then:

```bash
node -e "fetch('http://localhost:4321/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'contact',name:'Refactor Check',email:'smtp-test@example.com',message:'mail.ts extraction'})}).then(r=>r.text()).then(console.log)"
```

Expected: `{"ok":true}` with **no** `dryRun` field, and `npx astro dev logs` showing a `POST /api/enquiry` line taking over 1000ms — proof it reached Zoho rather than the logging path.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mail.ts src/pages/api/enquiry.ts
git commit -m "refactor: extract shared SMTP transport into lib/mail"
```

---

## Task 9: Email allowlist and login endpoint

The allowlist is the real access control in this design — the rate limit is best-effort and tokens cannot be revoked. Treat it accordingly.

**Files:**
- Create: `src/lib/auth/allowlist.ts`
- Create: `src/lib/auth/allowlist.test.ts`
- Create: `src/pages/api/admin/login.ts`

- [ ] **Step 1: Write the failing allowlist test**

Create `src/lib/auth/allowlist.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAllowed } from "./allowlist";

describe("isAllowed", () => {
  it("accepts an address on the list", () => {
    expect(isAllowed("a@b.com", "a@b.com,c@d.com")).toBe(true);
  });

  it("rejects an address not on the list", () => {
    expect(isAllowed("x@y.com", "a@b.com,c@d.com")).toBe(false);
  });

  it("ignores case", () => {
    expect(isAllowed("A@B.CoM", "a@b.com")).toBe(true);
  });

  it("ignores surrounding whitespace in the list", () => {
    expect(isAllowed("c@d.com", "a@b.com , c@d.com ")).toBe(true);
  });

  it("ignores surrounding whitespace in the input", () => {
    expect(isAllowed("  a@b.com  ", "a@b.com")).toBe(true);
  });

  it("allows nobody when the list is empty", () => {
    expect(isAllowed("a@b.com", "")).toBe(false);
  });

  it("allows nobody when the list is undefined", () => {
    expect(isAllowed("a@b.com", undefined)).toBe(false);
  });

  it("rejects an empty address even against a populated list", () => {
    expect(isAllowed("", "a@b.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/auth/allowlist.test.ts`
Expected: FAIL — cannot resolve `./allowlist`.

- [ ] **Step 3: Write the allowlist**

Create `src/lib/auth/allowlist.ts`:

```ts
/**
 * Whether an address may access the admin. An unset or empty ADMIN_EMAILS
 * allows nobody — failing closed, so a misconfigured deployment locks the
 * admin rather than opening it.
 */
export function isAllowed(email: string, allowlist: string | undefined): boolean {
  const candidate = email.trim().toLowerCase();
  if (!candidate) return false;
  if (!allowlist) return false;

  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(candidate);
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/auth/allowlist.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Write the login endpoint**

Create `src/pages/api/admin/login.ts`:

```ts
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
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/allowlist.ts src/lib/auth/allowlist.test.ts src/pages/api/admin/login.ts
git commit -m "feat: admin email allowlist and magic-link issuing"
```

---

## Task 10: Session cookie and verify page

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/pages/admin/verify.astro`
- Create: `src/pages/admin/login.astro`

- [ ] **Step 1: Write the session helpers**

Create `src/lib/auth/session.ts`:

```ts
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
```

- [ ] **Step 2: Write the login page**

Create `src/pages/admin/login.astro`:

```astro
---
export const prerender = false;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Sign in — Skyrule admin</title>
  </head>
  <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
    <main class="w-full max-w-sm">
      <h1 class="text-xl font-semibold mb-1">Skyrule admin</h1>
      <p class="text-sm text-neutral-400 mb-6">We'll email you a sign-in link.</p>

      <form id="login-form" class="space-y-3">
        <label class="block text-sm" for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email"
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
        <button type="submit"
                class="w-full rounded-md bg-lime-400 text-neutral-900 font-medium px-3 py-2">
          Send sign-in link
        </button>
      </form>

      <p id="sent" class="hidden mt-4 text-sm text-lime-400">
        If that address has access, a sign-in link is on its way. It expires in 15 minutes.
      </p>
    </main>

    <script>
      const form = document.getElementById("login-form") as HTMLFormElement;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = (document.getElementById("email") as HTMLInputElement).value;
        await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        form.classList.add("hidden");
        document.getElementById("sent")!.classList.remove("hidden");
      });
    </script>
  </body>
</html>
```

- [ ] **Step 3: Write the verify page**

Create `src/pages/admin/verify.astro`:

```astro
---
export const prerender = false;

import { verifyToken } from "../../lib/auth/token";
import { createSession } from "../../lib/auth/session";

const secret = process.env.AUTH_SECRET;
const token = Astro.url.searchParams.get("token") ?? "";

if (secret && token) {
  const payload = await verifyToken<{ email: string }>(token, secret);
  if (payload?.email) {
    await createSession(Astro.cookies, payload.email, secret);
    return Astro.redirect("/admin");
  }
}
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Link expired — Skyrule admin</title>
  </head>
  <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
    <main class="max-w-sm text-center">
      <h1 class="text-xl font-semibold mb-2">This link has expired</h1>
      <p class="text-sm text-neutral-400 mb-6">Sign-in links are valid for 15 minutes.</p>
      <a href="/admin/login" class="text-lime-400 underline">Request a new one</a>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/session.ts src/pages/admin/login.astro src/pages/admin/verify.astro
git commit -m "feat: admin session cookie, login and verify pages"
```

---

## Task 11: Middleware guard

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write the middleware**

Create `src/middleware.ts`:

```ts
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
```

- [ ] **Step 2: Declare the locals type**

Create or edit `src/env.d.ts` to add:

```ts
declare namespace App {
  interface Locals {
    adminEmail?: string;
  }
}
```

- [ ] **Step 3: Verify the guard works**

```bash
npx astro dev --background
```

```bash
node -e "fetch('http://localhost:4321/admin',{redirect:'manual'}).then(r=>console.log('admin page:',r.status,r.headers.get('location')))"
```

Expected: `admin page: 302 /admin/login`.

```bash
node -e "fetch('http://localhost:4321/api/admin/promo',{method:'POST'}).then(async r=>console.log('admin api:',r.status,await r.text()))"
```

Expected: `admin api: 401 {"ok":false,"error":"Unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/env.d.ts
git commit -m "feat: middleware guarding admin pages and endpoints"
```

---

# Phase 4 — Admin

## Task 12: Image upload endpoint

**Files:**
- Create: `src/lib/promos/image.ts`
- Create: `src/lib/promos/image.test.ts`
- Create: `src/pages/api/admin/upload.ts`

- [ ] **Step 1: Write the failing validation test**

Create `src/lib/promos/image.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD_BYTES } from "./image";

describe("validateUpload", () => {
  it("accepts a JPEG within the size limit", () => {
    expect(validateUpload("image/jpeg", 1_000_000)).toBeNull();
  });

  it("accepts PNG", () => {
    expect(validateUpload("image/png", 1000)).toBeNull();
  });

  it("accepts WebP", () => {
    expect(validateUpload("image/webp", 1000)).toBeNull();
  });

  it("rejects SVG, which can carry script", () => {
    expect(validateUpload("image/svg+xml", 1000)).toBe("Only JPEG, PNG and WebP images are allowed");
  });

  it("rejects a PDF", () => {
    expect(validateUpload("application/pdf", 1000)).toBe("Only JPEG, PNG and WebP images are allowed");
  });

  it("rejects a file over the size limit", () => {
    expect(validateUpload("image/jpeg", MAX_UPLOAD_BYTES + 1)).toBe("Image must be 5MB or smaller");
  });

  it("accepts a file exactly at the limit", () => {
    expect(validateUpload("image/jpeg", MAX_UPLOAD_BYTES)).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload("image/jpeg", 0)).toBe("Image is empty");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/promos/image.test.ts`
Expected: FAIL — cannot resolve `./image`.

- [ ] **Step 3: Write the validator**

Create `src/lib/promos/image.ts`:

```ts
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// SVG is deliberately excluded: it can carry script, and sanitising it is a
// different problem from sanitising promo copy.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or null when the upload is acceptable. */
export function validateUpload(contentType: string, byteSize: number): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) return "Only JPEG, PNG and WebP images are allowed";
  if (byteSize === 0) return "Image is empty";
  if (byteSize > MAX_UPLOAD_BYTES) return "Image must be 5MB or smaller";
  return null;
}

/** Dimensions are measured in the browser, so clamp them to something sane. */
export function sanitizeDimension(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 20000) return null;
  return n;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/lib/promos/image.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Write the upload endpoint**

Create `src/pages/api/admin/upload.ts`:

```ts
import type { APIRoute } from "astro";
import { put } from "@vercel/blob";
import { validateUpload, sanitizeDimension } from "../../../lib/promos/image";

export const prerender = false;

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: "Expected a file upload" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json(400, { ok: false, error: "No file provided" });

  // Validated server-side rather than trusting the browser's accept attribute.
  const problem = validateUpload(file.type, file.size);
  if (problem) return json(400, { ok: false, error: problem });

  const width = sanitizeDimension(form.get("width"));
  const height = sanitizeDimension(form.get("height"));
  if (width === null || height === null) return json(400, { ok: false, error: "Missing image dimensions" });

  try {
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`promos/${crypto.randomUUID()}.${extension}`, file, {
      access: "public",
      contentType: file.type,
    });
    return json(200, { ok: true, url: blob.url, width, height });
  } catch (error) {
    console.error("[admin] image upload failed:", error);
    return json(500, { ok: false, error: "Upload failed. Try again." });
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/promos/image.ts src/lib/promos/image.test.ts src/pages/api/admin/upload.ts
git commit -m "feat: validated promo image upload to blob"
```

---

## Task 13: Save endpoint

**Files:**
- Create: `src/pages/api/admin/promo.ts`

- [ ] **Step 1: Write the endpoint**

Create `src/pages/api/admin/promo.ts`:

```ts
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
  // check stops a cross-site form post from reaching the store.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/admin/promo.ts
git commit -m "feat: promo save and clear endpoint"
```

---

## Task 14: Admin dashboard

**Files:**
- Create: `src/layouts/AdminLayout.astro`
- Create: `src/pages/admin/index.astro`

- [ ] **Step 1: Write the admin layout**

Create `src/layouts/AdminLayout.astro`:

```astro
---
interface Props { title: string }
const { title } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{title} — Skyrule admin</title>
  </head>
  <body class="min-h-screen bg-neutral-950 text-neutral-100">
    <header class="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
      <a href="/admin" class="font-semibold">Skyrule promos</a>
      <span class="text-sm text-neutral-400">{Astro.locals.adminEmail}</span>
    </header>
    <main class="max-w-3xl mx-auto p-6"><slot /></main>
  </body>
</html>
```

- [ ] **Step 2: Write the dashboard**

Create `src/pages/admin/index.astro`:

```astro
---
export const prerender = false;

import AdminLayout from "../../layouts/AdminLayout.astro";
import { promoStore } from "../../lib/promos/store";
import { isLive } from "../../lib/promos/resolve";
import { utcIsoToWatLocal } from "../../lib/promos/datetime";
import { PLACEMENTS, type Placement } from "../../lib/promos/schema";

const LABELS: Record<Placement, string> = {
  bar: "Announcement bar",
  modal: "Entry modal",
  section: "Homepage section",
};

const DESCRIPTIONS: Record<Placement, string> = {
  bar: "A slim strip across the top of every page.",
  modal: "A dialog shown once per visitor.",
  section: "A full-width band on the homepage.",
};

const now = new Date();
const { promos } = await promoStore.read({ fresh: true });

const slots = PLACEMENTS.map((placement) => {
  const promo = promos.find((p) => p.placement === placement) ?? null;
  let status = "Empty";
  if (promo) {
    if (!promo.enabled) status = "Draft";
    else if (isLive(promo, now)) status = "Live";
    else if (promo.startsAt && new Date(promo.startsAt) > now)
      status = `Scheduled for ${utcIsoToWatLocal(promo.startsAt).replace("T", " ")}`;
    else status = "Expired";
  }
  return { placement, promo, status };
});
---
<AdminLayout title="Promos">
  <h1 class="text-2xl font-semibold mb-1">Promos</h1>
  <p class="text-neutral-400 mb-8">One promo can be live in each placement at a time.</p>

  <ul class="space-y-3">
    {slots.map(({ placement, promo, status }) => (
      <li class="rounded-lg border border-neutral-800 p-4 flex items-center justify-between gap-4">
        <div>
          <p class="font-medium">{LABELS[placement]}</p>
          <p class="text-sm text-neutral-500">{DESCRIPTIONS[placement]}</p>
          {promo && <p class="text-sm text-neutral-300 mt-1">{promo.headline}</p>}
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class={`text-xs rounded-full px-2 py-1 ${status === "Live" ? "bg-lime-400 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}>
            {status}
          </span>
          <a href={`/admin/${placement}`} class="text-sm underline">Edit</a>
        </div>
      </li>
    ))}
  </ul>
</AdminLayout>
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts/AdminLayout.astro src/pages/admin/index.astro
git commit -m "feat: admin dashboard showing all three placement slots"
```

---

## Task 15: Promo editor

**Files:**
- Create: `src/pages/admin/[placement].astro`

- [ ] **Step 1: Write the editor**

Create `src/pages/admin/[placement].astro`:

```astro
---
export const prerender = false;

import AdminLayout from "../../layouts/AdminLayout.astro";
import { promoStore } from "../../lib/promos/store";
import { utcIsoToWatLocal } from "../../lib/promos/datetime";
import { PLACEMENTS, type Placement } from "../../lib/promos/schema";

const placement = Astro.params.placement as Placement;
if (!PLACEMENTS.includes(placement)) return Astro.redirect("/admin");

const { promos } = await promoStore.read({ fresh: true });
const promo = promos.find((p) => p.placement === placement) ?? null;
---
<AdminLayout title="Edit promo">
  <a href="/admin" class="text-sm text-neutral-400 underline">Back</a>
  <h1 class="text-2xl font-semibold mt-2 mb-6">Edit {placement} promo</h1>

  <form id="promo-form" class="space-y-5" data-placement={placement} data-id={promo?.id ?? ""}>
    <label class="flex items-center gap-2">
      <input type="checkbox" name="enabled" checked={promo?.enabled ?? false} />
      <span>Enabled — publishing this turns off any other {placement} promo</span>
    </label>

    <div>
      <label class="block text-sm mb-1" for="eyebrow">Eyebrow (optional)</label>
      <input id="eyebrow" name="eyebrow" value={promo?.eyebrow ?? ""}
             class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
    </div>

    <div>
      <label class="block text-sm mb-1" for="headline">Headline</label>
      <input id="headline" name="headline" required value={promo?.headline ?? ""}
             class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
    </div>

    <div class="grid md:grid-cols-2 gap-3">
      <div>
        <label class="block text-sm mb-1" for="body">Body (markdown)</label>
        <textarea id="body" name="body" rows="8"
                  class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 font-mono text-sm">{promo?.body ?? ""}</textarea>
        <p class="text-xs text-neutral-500 mt-1">Bold, italic, links and lists. Headings are stripped.</p>
      </div>
      <div>
        <span class="block text-sm mb-1">Preview</span>
        <div id="preview" class="prose prose-invert rounded-md border border-neutral-800 p-3 min-h-[8rem] text-sm"></div>
      </div>
    </div>

    <fieldset class="border border-neutral-800 rounded-md p-4 space-y-3">
      <legend class="text-sm px-1">Image</legend>
      <input type="file" id="file" accept="image/jpeg,image/png,image/webp" />
      <p id="upload-error" class="text-sm text-red-400 hidden"></p>
      <img id="image-preview" src={promo?.image?.url ?? ""} alt=""
           class={promo?.image ? "max-h-40 rounded" : "hidden max-h-40 rounded"} />
      <div>
        <label class="block text-sm mb-1" for="alt">Alt text (required with an image)</label>
        <input id="alt" name="alt" value={promo?.image?.alt ?? ""}
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
      </div>
      <input type="hidden" id="image-url" value={promo?.image?.url ?? ""} />
      <input type="hidden" id="image-width" value={promo?.image?.width ?? ""} />
      <input type="hidden" id="image-height" value={promo?.image?.height ?? ""} />
    </fieldset>

    <fieldset class="border border-neutral-800 rounded-md p-4 grid md:grid-cols-2 gap-3">
      <legend class="text-sm px-1">Call to action (optional)</legend>
      <div>
        <label class="block text-sm mb-1" for="cta-label">Button label</label>
        <input id="cta-label" value={promo?.cta?.label ?? ""}
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm mb-1" for="cta-href">Link</label>
        <input id="cta-href" value={promo?.cta?.href ?? ""} placeholder="/contact"
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
      </div>
    </fieldset>

    <fieldset class="border border-neutral-800 rounded-md p-4 grid md:grid-cols-2 gap-3">
      <legend class="text-sm px-1">Schedule — times are West Africa Time</legend>
      <div>
        <label class="block text-sm mb-1" for="startsAt">Starts (blank = immediately)</label>
        <input id="startsAt" type="datetime-local" value={utcIsoToWatLocal(promo?.startsAt ?? null)}
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
      </div>
      <div>
        <label class="block text-sm mb-1" for="endsAt">Ends (blank = never)</label>
        <input id="endsAt" type="datetime-local" value={utcIsoToWatLocal(promo?.endsAt ?? null)}
               class="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2" />
      </div>
    </fieldset>

    <p id="form-error" class="text-sm text-red-400 hidden"></p>
    <p id="form-saved" class="text-sm text-lime-400 hidden">Saved.</p>

    <div class="flex gap-3">
      <button type="submit" class="rounded-md bg-lime-400 text-neutral-900 font-medium px-4 py-2">Save</button>
      <button type="button" id="clear" class="rounded-md border border-neutral-700 px-4 py-2">Delete promo</button>
    </div>
  </form>
</AdminLayout>

<script>
  import { marked } from "marked";

  const form = document.getElementById("promo-form") as HTMLFormElement;
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
  const el = (id: string) => document.getElementById(id)!;

  // Live preview. This parser only ever runs inside the admin — the public
  // site is served pre-rendered HTML.
  const bodyField = el("body") as HTMLTextAreaElement;
  const paint = () => { el("preview").innerHTML = marked.parse(bodyField.value, { async: false }) as string; };
  bodyField.addEventListener("input", paint);
  paint();

  // Dimensions are measured here so the renderers can set width/height and
  // stop the image from shifting surrounding content as it loads.
  el("file").addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const error = el("upload-error");
    error.classList.add("hidden");

    const bitmap = await createImageBitmap(file);
    const data = new FormData();
    data.append("file", file);
    data.append("width", String(bitmap.width));
    data.append("height", String(bitmap.height));

    const response = await fetch("/api/admin/upload", { method: "POST", body: data });
    const result = await response.json();
    if (!result.ok) {
      error.textContent = result.error;
      error.classList.remove("hidden");
      return;
    }
    (el("image-url") as HTMLInputElement).value = result.url;
    (el("image-width") as HTMLInputElement).value = String(result.width);
    (el("image-height") as HTMLInputElement).value = String(result.height);
    const preview = el("image-preview") as HTMLImageElement;
    preview.src = result.url;
    preview.classList.remove("hidden");
  });

  async function send(payload: Record<string, unknown>) {
    const error = el("form-error");
    const saved = el("form-saved");
    error.classList.add("hidden");
    saved.classList.add("hidden");

    const response = await fetch("/api/admin/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) {
      // The form keeps its values — a failed save must never lose typed copy.
      error.textContent = result.error;
      error.classList.remove("hidden");
      return false;
    }
    saved.classList.remove("hidden");
    return true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await send({
      id: form.dataset.id,
      placement: form.dataset.placement,
      enabled: (form.elements.namedItem("enabled") as HTMLInputElement).checked,
      eyebrow: val("eyebrow"),
      headline: val("headline"),
      body: bodyField.value,
      image: val("image-url")
        ? { url: val("image-url"), alt: val("alt"), width: val("image-width"), height: val("image-height") }
        : null,
      cta: val("cta-label") || val("cta-href") ? { label: val("cta-label"), href: val("cta-href") } : null,
      startsAt: val("startsAt"),
      endsAt: val("endsAt"),
    });
  });

  el("clear").addEventListener("click", async () => {
    if (!confirm("Delete this promo? This cannot be undone.")) return;
    if (await send({ placement: form.dataset.placement, action: "clear" })) {
      window.location.href = "/admin";
    }
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add "src/pages/admin/[placement].astro"
git commit -m "feat: promo editor with markdown preview and image upload"
```

---

# Phase 5 — Public rendering

## Task 16: Renderer components

These take a promo as a prop and know nothing about Blob, auth, or fetching — which is what lets them be dropped into both the server-rendered homepage and the client-side injection path unchanged.

**Files:**
- Create: `src/components/promo/AnnouncementBar.astro`
- Create: `src/components/promo/PromoModal.astro`
- Create: `src/components/promo/PromoSection.astro`

- [ ] **Step 1: Write the announcement bar**

Create `src/components/promo/AnnouncementBar.astro`:

```astro
---
import type { Promo } from "../../lib/promos/schema";
interface Props { promo: Promo }
const { promo } = Astro.props;
---
<div class="bg-lime-400 text-neutral-900" data-promo-bar data-promo-id={promo.id}>
  <div class="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm text-center">
    {promo.eyebrow && <span class="font-semibold uppercase tracking-wide">{promo.eyebrow}</span>}
    <span class="font-medium">{promo.headline}</span>
    {promo.cta && <a href={promo.cta.href} class="underline underline-offset-2 font-semibold">{promo.cta.label}</a>}
  </div>
</div>
```

- [ ] **Step 2: Write the modal**

Create `src/components/promo/PromoModal.astro`:

```astro
---
import type { Promo } from "../../lib/promos/schema";
interface Props { promo: Promo }
const { promo } = Astro.props;
---
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
     data-promo-modal data-promo-id={promo.id} role="dialog" aria-modal="true"
     aria-label={promo.headline}>
  <div class="bg-neutral-900 text-neutral-100 rounded-2xl max-w-lg w-full overflow-hidden">
    {promo.image && (
      <img src={promo.image.url} alt={promo.image.alt}
           width={promo.image.width} height={promo.image.height}
           class="w-full h-auto object-cover" />
    )}
    <div class="p-6">
      {promo.eyebrow && <p class="text-xs uppercase tracking-wide text-lime-400 mb-2">{promo.eyebrow}</p>}
      <h2 class="text-xl font-semibold mb-2">{promo.headline}</h2>
      <div class="text-sm text-neutral-300" set:html={promo.bodyHtml} />
      <div class="mt-5 flex gap-3">
        {promo.cta && (
          <a href={promo.cta.href} class="rounded-md bg-lime-400 text-neutral-900 font-medium px-4 py-2">
            {promo.cta.label}
          </a>
        )}
        <button type="button" data-promo-dismiss class="rounded-md border border-neutral-700 px-4 py-2">
          No thanks
        </button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write the homepage section**

Create `src/components/promo/PromoSection.astro`:

```astro
---
import type { Promo } from "../../lib/promos/schema";
interface Props { promo: Promo }
const { promo } = Astro.props;
---
<section class="bg-neutral-900 text-neutral-100" data-promo-section data-promo-id={promo.id}>
  <div class="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
    {promo.image && (
      <img src={promo.image.url} alt={promo.image.alt}
           width={promo.image.width} height={promo.image.height}
           class="w-full h-auto rounded-2xl object-cover" />
    )}
    <div>
      {promo.eyebrow && <p class="text-xs uppercase tracking-wide text-lime-400 mb-3">{promo.eyebrow}</p>}
      <h2 class="text-3xl font-semibold mb-4">{promo.headline}</h2>
      <div class="text-neutral-300" set:html={promo.bodyHtml} />
      {promo.cta && (
        <a href={promo.cta.href}
           class="inline-block mt-6 rounded-md bg-lime-400 text-neutral-900 font-medium px-5 py-3">
          {promo.cta.label}
        </a>
      )}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/promo/
git commit -m "feat: promo renderers for bar, modal and homepage section"
```

---

## Task 17: Public status endpoint and client injection

**Files:**
- Create: `src/pages/api/promo/active.ts`
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Write the public endpoint**

Create `src/pages/api/promo/active.ts`:

```ts
import type { APIRoute } from "astro";
import { promoStore } from "../../../lib/promos/store";
import { activeFor } from "../../../lib/promos/resolve";
import { PLACEMENTS } from "../../../lib/promos/schema";

export const prerender = false;

export const GET: APIRoute = async () => {
  const now = new Date();
  const { promos } = await promoStore.read();

  const active = Object.fromEntries(
    PLACEMENTS.map((placement) => [placement, activeFor(promos, placement, now)]),
  );

  return new Response(JSON.stringify(active), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Matches the homepage cache window, so a scheduled promo appears at the
      // same time on every page rather than at two different moments.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
};
```

- [ ] **Step 2: Add the injection script to BaseLayout**

`BaseLayout` already declares a `Props` interface with `navbarStartScrolled` — leave it alone. This script needs no new prop.

**Why there is no double-render guard:** `src/pages/index.astro` does not use `BaseLayout`. It carries its own inlined document and renders `Navbar`/`Footer` directly, so this script only ever runs on the seven pages that do use the layout — `about`, `contact`, `destinations`, `plan-your-trip`, `privacy`, `services`, and `terms`. The homepage renders its promos server-side instead.

Immediately before the closing `</body>` tag in `src/layouts/BaseLayout.astro`:

```astro
{(
  <script>
    (async () => {
      try {
        const active = await fetch("/api/promo/active").then((r) => r.json());

        if (active.bar) {
          const bar = document.createElement("div");
          bar.className = "bg-lime-400 text-neutral-900 overflow-hidden transition-[height] duration-300";
          bar.innerHTML = `<div class="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm text-center">
            ${active.bar.eyebrow ? `<span class="font-semibold uppercase tracking-wide">${active.bar.eyebrow}</span>` : ""}
            <span class="font-medium">${active.bar.headline}</span>
            ${active.bar.cta ? `<a href="${active.bar.cta.href}" class="underline underline-offset-2 font-semibold">${active.bar.cta.label}</a>` : ""}
          </div>`;
          document.body.prepend(bar);
        }

        // Dismissal is remembered per promo id, so closing it once suppresses
        // it across pages while a new promo still appears.
        if (active.modal && localStorage.getItem(`promo-dismissed-${active.modal.id}`) !== "1") {
          const modal = document.createElement("div");
          modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4";
          modal.setAttribute("role", "dialog");
          modal.setAttribute("aria-modal", "true");
          modal.innerHTML = `<div class="bg-neutral-900 text-neutral-100 rounded-2xl max-w-lg w-full overflow-hidden">
            ${active.modal.image ? `<img src="${active.modal.image.url}" alt="${active.modal.image.alt}" width="${active.modal.image.width}" height="${active.modal.image.height}" class="w-full h-auto object-cover">` : ""}
            <div class="p-6">
              ${active.modal.eyebrow ? `<p class="text-xs uppercase tracking-wide text-lime-400 mb-2">${active.modal.eyebrow}</p>` : ""}
              <h2 class="text-xl font-semibold mb-2">${active.modal.headline}</h2>
              <div class="text-sm text-neutral-300">${active.modal.bodyHtml}</div>
              <div class="mt-5 flex gap-3">
                ${active.modal.cta ? `<a href="${active.modal.cta.href}" class="rounded-md bg-lime-400 text-neutral-900 font-medium px-4 py-2">${active.modal.cta.label}</a>` : ""}
                <button type="button" data-promo-dismiss class="rounded-md border border-neutral-700 px-4 py-2">No thanks</button>
              </div>
            </div>
          </div>`;
          modal.querySelector("[data-promo-dismiss]")?.addEventListener("click", () => {
            localStorage.setItem(`promo-dismissed-${active.modal.id}`, "1");
            modal.remove();
          });
          document.body.appendChild(modal);
        }
      } catch {
        // A promo failure must never break the page it sits on.
      }
    })();
  </script>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/promo/active.ts src/layouts/BaseLayout.astro
git commit -m "feat: public promo status endpoint and client-side injection"
```

---

## Task 18: Server-render promos on the homepage

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add server rendering and the promo lookup**

At the top of `src/pages/index.astro`'s frontmatter:

```ts
export const prerender = false;

import AnnouncementBar from "../components/promo/AnnouncementBar.astro";
import PromoModal from "../components/promo/PromoModal.astro";
import PromoSection from "../components/promo/PromoSection.astro";
import { promoStore } from "../lib/promos/store";
import { activeFor } from "../lib/promos/resolve";

const now = new Date();
const { promos } = await promoStore.read();
const bar = activeFor(promos, "bar", now);
const modal = activeFor(promos, "modal", now);
const section = activeFor(promos, "section", now);

// Cached at the edge so the homepage stays fast. A promo scheduled for a
// given minute can therefore appear up to 60 seconds late, which is deliberate.
Astro.response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
```

- [ ] **Step 2: Render the placements**

`index.astro` has no layout wrapper — it is a self-contained document whose body is marked `<!-- ⬆ EXACT BENCHMARK BODY ⬆ -->`. Respect that: add only the three conditional blocks below and change nothing else. Each renders nothing when no promo is live, so with an empty promo document the output is byte-for-byte identical to today.

Immediately **before** the existing `<Navbar />` (around line 97):

```astro
{bar && <AnnouncementBar promo={bar} />}
```

Inside the main wrapper, immediately **before** the existing `<ContactCta />` near the end:

```astro
{section && <PromoSection promo={section} />}
```

Immediately **before** the existing `<Footer />` on the final line:

```astro
{modal && <PromoModal promo={modal} />}
```

- [ ] **Step 3: Add modal dismissal for the server-rendered case**

Also before the closing layout tag:

```astro
{modal && (
  <script>
    const modalEl = document.querySelector("[data-promo-modal]");
    const id = modalEl?.getAttribute("data-promo-id");
    if (modalEl && id) {
      if (localStorage.getItem(`promo-dismissed-${id}`) === "1") {
        modalEl.remove();
      } else {
        modalEl.querySelector("[data-promo-dismiss]")?.addEventListener("click", () => {
          localStorage.setItem(`promo-dismissed-${id}`, "1");
          modalEl.remove();
        });
      }
    }
  </script>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: server-render promos on the homepage"
```

---

## Task 19: Environment configuration

**Files:**
- Modify: `.env.example`
- Modify: `.env` (local only, never committed)

- [ ] **Step 1: Document the new variables**

Append to `.env.example`:

```
# --- Promo admin ---
# Signing key for magic links and admin sessions. Generate with:
#   node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"
AUTH_SECRET=

# Comma-separated addresses allowed to sign in. THIS IS THE ACCESS CONTROL —
# anyone listed here can publish to the live site. Empty allows nobody.
ADMIN_EMAILS=

# Supplied by the Vercel Blob integration; run `vercel env pull` after enabling it.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 2: Set them locally**

```bash
node -e "console.log('AUTH_SECRET='+crypto.randomUUID()+crypto.randomUUID())" >> .env
```

Add `ADMIN_EMAILS=` with your own address, then enable Blob in the Vercel dashboard (Storage → Create → Blob, connect it to `skyrule-travels`) and pull the token:

```bash
npx vercel env pull .env.local
```

Copy the `BLOB_READ_WRITE_TOKEN` value from `.env.local` into `.env`.

- [ ] **Step 3: Set them in Vercel**

`AUTH_SECRET` and `ADMIN_EMAILS` must be added for Production and Preview. **Ask the user to do this** — `AUTH_SECRET` is a credential, and the agent should not be entering it into hosting configuration.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: document promo admin environment variables"
```

---

## Task 20: Full verification

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: every test passes, across schema, resolve, datetime, markdown, store, token, allowlist, and image.

- [ ] **Step 2: Typecheck and build**

Run: `npx astro build`
Expected: build completes with no errors.

- [ ] **Step 3: Confirm no secret is inlined**

```bash
node -e "const p=require('fs').readFileSync('.env','utf8').match(/AUTH_SECRET=(.*)/)[1].trim();const {execSync}=require('child_process');const n=execSync(`grep -rlF '${p}' .vercel/output dist 2>/dev/null | wc -l`).toString().trim();console.log('AUTH_SECRET literal in build output:',n,'file(s)')"
```

Expected: `0 file(s)`. Anything above zero means a module read `import.meta.env` instead of `process.env` — find it and fix it before deploying.

- [ ] **Step 4: End-to-end in the browser**

```bash
npx astro dev --background
```

Walk through each of these against `http://localhost:4321`:

1. Visit `/admin` while signed out — redirects to `/admin/login`.
2. Enter an address **not** in `ADMIN_EMAILS` — the same "link on its way" message appears, and `astro dev logs` shows no mail sent.
3. Enter an allowed address — the log shows the magic link (or it arrives by email).
4. Open the link — lands on `/admin` with the three placement slots.
5. Open the link a second time after 15 minutes — the expired page appears.
6. Create a homepage section promo with an image, markdown body, and CTA. Save. Confirm the dashboard shows **Live**.
7. Load `/` — the section renders with formatting intact and the image does not shift the layout as it loads.
8. Create a bar promo. Load `/about` — the bar appears. Load `/` — exactly **one** bar appears, not two.
9. Create a modal promo, load a page, dismiss it, navigate elsewhere — it stays dismissed.
10. Set a promo's start time two minutes in the future, save, reload — it is absent; wait past the start and reload — it appears.
11. Upload a PDF renamed to `.jpg` — rejected with the type error.
12. Submit the enquiry form — still sends, confirming the `mail.ts` refactor held.

- [ ] **Step 5: Commit any fixes and stop the server**

```bash
npx astro dev stop
```
