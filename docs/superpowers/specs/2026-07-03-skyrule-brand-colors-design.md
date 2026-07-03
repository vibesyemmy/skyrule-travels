# Skyrule Brand Colors — Design

## Goal

Rebrand the site's color system from Drivelodge blue to the official Skyrule colors — green `#A3D346` leading (buttons, links, interactive), orange `#E26E00` as the scarce accent — without modifying `public/styles/drivelodge.css` (stays byte-untouched) and without breaking the benchmark's structure/behavior parity. Color parity with Drivelodge intentionally ends here; structural fidelity does not.

## Color roles (user-approved: "A — green leads")

| Token (new) | Value | Role | Contrast basis |
|---|---|---|---|
| `--skyrule--green` | `#A3D346` | Fills: brand buttons, brand surfaces | vs `--skyrule--ink` ≈ 12:1 ✓ |
| `--skyrule--green-hover` | `#8CB93A` | Hover fills | darker cut of green |
| `--skyrule--green-text` | `#55701F` | Green used AS TEXT on light backgrounds (link-style button, `.text-color-blue-2`) | vs white ≈ 5.6:1 ✓ AA (raw green is ~1.7:1 — never use as text on light) |
| `--skyrule--ink` | `#1C2A05` | Text on green fills — replaces today's white button text | on green ≈ 12:1 ✓ |
| `--skyrule--orange` | `#E26E00` | Accents ONLY: focus rings, future eyebrow labels/highlights; takes over the `--gold` token | decorative/large-element use; not body text on white (~3.2:1) |

White text on either brand color fails AA for normal text — that is why button text flips to ink and the orange stays out of text roles.

## Mechanism

**New file `public/styles/skyrule.css`** — a token overlay loaded immediately AFTER `drivelodge.css` via `<link>` in both `src/pages/index.astro` and `src/layouts/BaseLayout.astro` (the only two HTML shells). Contents, in order:

1. **Skyrule primitives** (`:root`): the five `--skyrule--*` tokens above.
2. **Brand-token re-pointing** (`:root`): the four existing Webflow tokens keep their names (they are wired into ~40 rules; renaming them means editing the 214KB benchmark file for zero visual gain — a header comment in the overlay explains the aliasing):
   - `--base-color-brand--blue: var(--skyrule--green)`
   - `--base-color-brand--blue-dark: var(--skyrule--green-hover)`
   - `--base-color-brand--blue-darkest: var(--skyrule--green-text)`
   - `--base-color-brand--gold: var(--skyrule--orange)` (single use: `.values_card.is-gold`)
3. **Button text flip** — scoped, NOT blanket: `.button-content:not([class*="w-variant"]) { color: var(--skyrule--ink); }`. The variant rules in `drivelodge.css` use `:where()` (zero specificity), so a blanket `.button-content{color:...}` loading after them would also override the primary button's white-on-black and break it. The `:not()` scoping targets exactly the base/brand-style buttons (which carry no variant class). The link-style variant additionally gets `.button-content:where(.w-variant-16fb8767-26f4-a35f-edd9-ba91eadcd66c) { color: var(--skyrule--green-text); }` so green-as-text is the AA-passing cut — and its hover gets `.button-content:hover:where(.w-variant-16fb8767-…) { color: var(--skyrule--ink); }`, because the re-pointed `-darkest` token would otherwise make resting and hover the identical `#55701F` (no visible hover feedback).
4. **Literal-blue rule overrides** (the hardcoded `#437ef7` rules in `drivelodge.css`, verified complete by grep):
   - `.button-2 { background-color/border-color: var(--skyrule--green); color: var(--skyrule--ink); }`
   - `.button-2.is-blue { background-color/border-color: var(--skyrule--green); }`
   - `.text-color-blue-2 { color: var(--skyrule--green-text); }`
   - `.config_sidebar_button { background-color: var(--skyrule--green); color: var(--skyrule--ink); }`
   - (`.pagination1_page-button`'s `#437ef700` is fully transparent — hue is invisible, no override needed.)

**Small color-only edits to the two shells** (structure untouched):
- Focus ring: `outline:.125rem solid #4d65ff` → `#E26E00` in `index.astro`'s inline utility block AND `BaseLayout.astro`'s copy (both must change together — they are documented duplicates).
- `index.astro`: 4 inline checkmark SVGs (`<circle ... fill="#437ef7"/>`) → `fill="#A3D346"` (literal, since CSS `var()` doesn't work in SVG presentation attributes; the white check glyph on green is a decorative 15px icon, not text — acceptable).

## Out of scope

- The logo (still the Drivelodge SVG in `Navbar.astro`/`Footer.astro`) — its own future task.
- Imagery, copy, typography.
- Any structural/markup change; any edit to `drivelodge.css` itself.
- The status-dot colors in `index.astro` (`#00cc41` green online dot, `#fd1d0c` red) — functional status colors, not brand.

## Verification

1. `git diff -- public/styles/drivelodge.css` empty (file untouched).
2. Live computed-style checks on `/`: brand button (`.button-content` without variant) has `background-color: rgb(163, 211, 70)` and `color: rgb(28, 42, 5)`; primary-variant button STILL has its original colors (white-on-black default, white bg under `data-theme="dark"` footer — the `:where()` trap proven dodged); link-style navbar button text is `rgb(85, 112, 31)`; hover on a brand button transitions to `rgb(140, 185, 58)`.
3. Focus ring: tab to a focusable element on `/about`, outline computes `rgb(226, 110, 0)`.
4. Screenshots of `/` (hero buttons, product cards, footer CTAs) and `/about` for the user to judge the rebrand visually.
5. No console/page errors on `/` and `/about`.
