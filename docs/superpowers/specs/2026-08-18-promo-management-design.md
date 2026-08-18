# Promo Management Module — Design

## Goal

Give Skyrule staff a password-free, authenticated admin area where they can publish a promotion — an uploaded image, formatted copy, and an optional call-to-action — and choose for themselves how it appears on the site: a thin announcement bar, an entry modal, or a homepage promo section. Promos can go live immediately or on a schedule, and expire on their own.

The client should never need a developer to run a campaign.

## Background

The site today has no persistence, no authentication, and no file storage. Every page under `src/pages/` is prerendered static; the single exception is `src/pages/api/enquiry.ts` (`prerender = false`), which sends enquiry mail through Zoho SMTP via nodemailer.

That means this module introduces three capabilities the codebase has never had — stored content, uploaded files, and login — plus the first server-rendered page. Each is a deliberate addition rather than an extension of something existing, which is why the decisions below are recorded with their rationale.

## Decisions

Settled during brainstorming, with the reasoning that drove each:

| Decision | Choice | Why |
|---|---|---|
| Placement | A field on the promo, not a fixed design | The client wants to experiment with bar / modal / homepage section without a developer. |
| Concurrency | One active promo per placement | Prevents two modals fighting; still allows a layered campaign. Enforced on write. |
| Scheduling | Optional start and end datetime | Campaigns are planned ahead. Null start = live now; null end = no expiry. |
| Authentication | Magic link by email | No passwords to store or leak, and it reuses the Zoho SMTP already working in production. |
| Copy format | Markdown with live preview | More expressive than plain text, far less destructive than a full WYSIWYG. |
| Rendering | Homepage server-rendered; other pages client-side | Keeps the rest of the site fully static, at the cost of a late-arriving announcement bar. |
| Storage | Vercel Blob only, no database | Matches the actual scale — three promo slots, one or two editors. |

### Rejected alternatives

- **ISR site-wide** was recommended and declined. It would have put the bar and modal in the server-rendered HTML on every page, eliminating layout shift, but converts the whole site from static to cached-server-rendered.
- **Blob + Postgres** would give an audit trail and true single-use magic links. Rejected as disproportionate for a promo banner; the storage layer is isolated so this migration stays contained if it is ever needed.
- **Hosted CMS (Sanity, Payload, Contentful)** would supply auth, media, and editing pre-built, but adds a vendor and a second admin UI for the client to learn, and discards the magic-link decision.

## Architecture

Four units, each with a single responsibility and a defined interface:

| Unit | Responsibility | Depends on |
|---|---|---|
| `src/lib/promos/store.ts` | Read and write `promos.json`; resolve the active promo for a placement at a given time | Vercel Blob |
| `src/lib/auth/token.ts` | Sign and verify magic-link tokens and session cookies | `AUTH_SECRET` |
| `src/lib/mail.ts` | Configured nodemailer transport, shared | `SMTP_*` env vars |
| `src/components/promo/*` | Render a promo in each placement | nothing — pure props |

The renderers receive a plain promo object and know nothing about Blob or authentication, so they can be tested standalone and the storage layer can be replaced without touching them.

`src/lib/mail.ts` is a refactor of existing code: `enquiry.ts` currently builds its nodemailer transport inline, and the magic-link mailer needs the same transport with the same environment variables. Extracting it prevents two copies of the SMTP configuration drifting apart. `enquiry.ts` is updated to import it; its behaviour does not change.

### New files

```
src/lib/promos/store.ts          Blob-backed repository + active resolution
src/lib/promos/schema.ts         Promo document validation
src/lib/promos/markdown.ts       Markdown -> sanitized HTML
src/lib/auth/token.ts            HMAC sign/verify for links and sessions
src/lib/mail.ts                  Shared nodemailer transport (extracted)
src/middleware.ts                Guards /admin/* and /api/admin/*
src/pages/admin/index.astro      Dashboard — three placement slots
src/pages/admin/[placement].astro Editor
src/pages/admin/login.astro      Email entry
src/pages/admin/verify.astro     Consumes the magic link
src/pages/api/admin/login.ts     Issues the magic link
src/pages/api/admin/promo.ts     Save / clear a promo
src/pages/api/admin/upload.ts    Image upload to Blob
src/pages/api/promo/active.ts    Public status for client-side placements
src/components/promo/AnnouncementBar.astro
src/components/promo/PromoModal.astro
src/components/promo/PromoSection.astro
```

### New dependencies

`@vercel/blob`, a markdown parser (`marked`), an HTML sanitizer (`sanitize-html`), and `vitest` as a dev dependency. The project has no test framework today; adding one is part of this work.

### New environment variables

`AUTH_SECRET` (HMAC key), `ADMIN_EMAILS` (comma-separated allowlist), `BLOB_READ_WRITE_TOKEN` (provided by the Vercel Blob integration). All three are set in Vercel for Production and Preview, and mirrored into `.env` for local development. `.env.example` is updated to document them.

## Data model

A single JSON document in Vercel Blob:

```jsonc
{
  "version": 1,
  "promos": [{
    "id": "uuid",
    "placement": "bar" | "modal" | "section",
    "enabled": true,
    "eyebrow": "Limited offer",
    "headline": "Dubai from N850,000",
    "body": "**Return fares** from Lagos...",
    "bodyHtml": "<p><strong>Return fares</strong> from Lagos...</p>",
    "image": { "url": "https://...", "width": 1600, "height": 900, "alt": "..." },
    "cta": { "label": "Get a quote", "href": "/contact" },
    "startsAt": "2026-09-01T07:00:00Z",
    "endsAt": "2026-09-30T22:59:00Z",
    "updatedAt": "2026-08-18T10:00:00Z",
    "updatedBy": "someone@skyruletravels.com"
  }]
}
```

`eyebrow`, `image`, `cta`, `startsAt`, and `endsAt` are nullable. `version` exists so a future migration can detect and upgrade old documents.

### Active resolution

A promo is live when `enabled` is true and `now` falls within its window — a null `startsAt` means "already live", a null `endsAt` means "no expiry". Boundaries are inclusive of the start and exclusive of the end.

The one-per-placement rule is enforced **on write, not on read**: publishing a bar promo disables any other bar promo in the same save. This keeps the read path a simple find, and surfaces the conflict in the admin UI at the moment the client causes it rather than silently at render time.

### Timezone

All datetimes are stored as UTC and displayed as `Africa/Lagos` (WAT, UTC+1). The client will enter "1 September, 8am" meaning WAT; storing that value naively as UTC would fire the promo an hour late. Conversion happens at the admin form boundary, in both directions.

### Markdown

Markdown is converted to sanitized HTML **when the client saves**, and both the source and the rendered HTML are stored. Public pages output the stored HTML, so no markdown parser ever ships to the marketing site. The editor's live preview parses client-side, inside the authenticated admin only, where page weight does not matter.

Sanitization allows paragraphs, bold, italic, links, and lists. It strips scripts, event handler attributes, styles, and any other tag.

### Images

Uploads go directly to Blob. Width and height are recorded at upload time — not for bookkeeping, but so the bar can reserve space and the renderers can set explicit `width`/`height` attributes, which is what stops the image loading from shifting surrounding content. Accepted types are JPEG, PNG, and WebP, capped at 5MB, validated server-side rather than trusting the browser.

## Authentication

1. `/admin/login` takes an email address and POSTs it to `/api/admin/login`.
2. The address is checked against `ADMIN_EMAILS`. **The response is identical either way** — an allowed address and a stranger's produce the same "check your inbox" message, so the endpoint cannot be used to discover who has access.
3. For allowed addresses only, the server signs `{email, exp, nonce}` with `AUTH_SECRET` (HMAC-SHA256, 15-minute expiry) and mails the link via `src/lib/mail.ts`.
4. `/admin/verify` validates signature and expiry, then sets a signed session cookie — httpOnly, Secure, SameSite=Lax, 7-day life — and redirects to `/admin`.
5. `src/middleware.ts` guards `/admin/*` and `/api/admin/*`. Unauthenticated page requests redirect to login; API requests receive 401.

Admin pages send `X-Robots-Tag: noindex` and carry a `noindex` meta tag.

Mutating admin endpoints require a same-site cookie, a JSON content type, and a matching `Origin` header.

## Rendering

**Homepage** (`src/pages/index.astro`) becomes `prerender = false` with `Cache-Control: s-maxage=60, stale-while-revalidate=300`. All three placements render server-side there, present in the HTML on first paint and visible to search engines.

**All other pages** stay static. `BaseLayout.astro` includes a small script that fetches `/api/promo/active` and injects the bar and modal. `/api/promo/active` returns every currently-live promo and carries the same 60-second cache header; the client script uses only the `bar` and `modal` entries, since the homepage section is never client-rendered.

**The homepage must not double-render.** Because the homepage renders all three placements server-side and also inherits `BaseLayout`, the injection script has to stand down there. `BaseLayout` receives a `promosRenderedServerSide` prop, defaulting to `false`, which the homepage sets to `true`; when set, the script is not emitted at all. Without this the homepage would show two announcement bars.

**Modal dismissal** is recorded in `localStorage` keyed by promo id, so closing it once suppresses it across pages — but a new promo still appears.

## Known limitations

Recorded deliberately, since each follows from an accepted trade-off rather than an oversight:

1. **Announcement bar shifts layout on non-homepage pages.** It expands from zero height after the fetch resolves. A CSS transition makes this read as intentional. This is the direct cost of keeping those pages static; ISR site-wide would remove it.
2. **Scheduled promos can appear up to 60 seconds late**, because of the edge cache. Adjustable via one cache header if a campaign ever needs second accuracy.
3. **Magic links cannot be invalidated before they expire.** With no database there is no server-side record of issued tokens, so a forwarded or intercepted link works for up to 15 minutes.
4. **Login rate limiting is best-effort.** Serverless instances do not share memory. The email allowlist, not the rate limit, is the real access control.
5. **No audit history.** The document records who last changed a promo and when, but not what it was before.

Limitations 3, 4, and 5 are the price of choosing Blob-only storage. All three are resolved by migrating to approach B (Blob + Postgres), which is contained to `store.ts` and `token.ts`.

## Out of Scope

- Multiple concurrent promos per placement, and priority ordering between them
- A/B testing, click tracking, or promo analytics
- Per-page or per-audience targeting rules
- Image cropping, resizing, or art direction in the admin
- Managing any content other than promos
- Roles or permissions — every allowlisted address has identical access

## Verification

The tricky logic is pure and gets unit tests; the rest is verified in a browser.

**Unit tests (Vitest):**

1. Active resolution with `now` injected as a parameter: null start, null end, disabled, exactly at the start boundary, exactly at the end boundary, window fully in the past, window fully in the future.
2. WAT/UTC conversion round-trips without drift across the form boundary.
3. One-per-placement enforcement: saving a second bar promo disables the first.
4. Token signing and verification: valid, expired, tampered payload, wrong secret.
5. Markdown sanitization: `<script>` and `on*` attributes stripped; bold, italic, links, and lists preserved.
6. Schema validation: a corrupt document is rejected and reported as "no promos".
7. API routes against a fake Blob adapter — no network in tests.

**Browser verification:**

8. Each of the three placements renders correctly with image, copy, and CTA.
9. Modal dismissal persists across navigation; a different promo id shows again.
10. A promo scheduled for a near-future time appears once its start passes.
11. Blob made unreachable: pages render exactly as they do today, with no visible error.
12. Existing enquiry form still sends after the `mail.ts` refactor — the regression risk of this change.
