# Skyrule Logo — Design

## Goal

Replace the Drivelodge logo with the official Skyrule logo in the three places it appears as an asset — navbar, footer, favicon — and bring the full logo kit into the repo. No structural/markup changes beyond the logo elements themselves; `drivelodge.css` stays byte-untouched.

## Source assets (user-provided, `~/Downloads/skyrule-logo/`)

All four are 1708×890 PNGs (~1.92:1 — much squarer than the old 136:41 ≈ 3.3:1 Drivelodge SVG). Copied into `public/images/` with names describing what they are:

| Source | Destination | What it is |
|---|---|---|
| `dark.png` | `skyrule-logo-dark.png` | Full-color bird (orange/green) + WHITE wordmark — for dark backgrounds. **The variant this task uses.** |
| `light.png` | `skyrule-logo-light.png` | Full-color bird + BLACK wordmark — for light backgrounds (future light pages) |
| `dark-1.png` | `skyrule-logo-white.png` | All-white monochrome |
| `light-1.png` | `skyrule-logo-black.png` | All-black monochrome |

All four ship (~150KB total) so the brand kit lives in-repo; only the dark variant is referenced today. `.DS_Store` is not copied.

## Swaps

**Navbar (`src/components/nav/Navbar.astro`):** the inline Drivelodge `<svg class="logo" viewBox="0 0 136 41">…</svg>` inside `a.navbar_logo-link` becomes
`<img src="/images/skyrule-logo-dark.png" alt="Skyrule Travels" class="logo"/>`.
Sizing: `drivelodge.css` already drives the logo by height (`.logo { height: 100% }` filling the anchor), so an `<img class="logo">` keeps the bar height stable and simply renders narrower (squarer aspect). The implementation pins the anchor's effective height live; if the rendered logo needs a nudge (too small/large within the bar), the adjustment goes in Navbar.astro's existing `<style>` block — never in `drivelodge.css`.

**Footer (`src/components/footer/Footer.astro`):** the identical inline SVG inside `.footer_logo-wrap` gets the same `<img>` replacement (same file, same `class="logo"`, same height-driven sizing via the wrap).

**Favicon (`public/favicon.png`):** replaced by a 256×256 transparent-padded square render of the full-color bird mark (the top portion of the logo, above the wordmark — exact crop box measured programmatically from the image at plan time). Every favicon reference in both shells points at `/favicon.png` (`rel="icon"` in both; `index.astro` additionally has a `rel="apple-touch-icon"` link to the same file), so this is a file replacement with zero markup edits. The current file is 32×32; 256×256 also covers the apple-touch-icon use decently.

## Notes / trade-offs

- PNG not SVG: no vector source available. At display sizes (~2.5rem navbar height from an 890px-tall source) it renders sharp on retina. If a vector arrives later, each swap is a one-line change.
- `alt="Skyrule Travels"` on both imgs (the old inline SVGs had no accessible name at all — small a11y improvement).
- Both `<img>`s load eagerly (no `loading="lazy"`): the navbar logo is above the fold, and the footer logo is a 41KB file not worth the complexity — decided, not deferred.

## Out of scope

- Vehicle photography and video content with Drivelodge watermarks/branding.
- Using `skyrule-logo-light.png`/monochromes anywhere (future light-background pages).
- Deleting the old Smartgrade webclip/favicon files in `public/images/` (unreferenced benchmark assets, harmless).
- Any edit to `drivelodge.css`.

## Verification

1. Live screenshots: navbar at scroll-0 on `/` (logo over hero photo), scrolled (dark blur bar), `/about` (pinned dark bar); footer at page bottom.
2. Navbar bar height identical before/after the swap (measure `.navbar_container` bounding box pre/post — the aspect-ratio change must not stretch the bar).
3. No Drivelodge SVG remains: `grep -c 'clip0_6407_254' src/` → 0 (that clip-path id is unique to the old logo SVG, present in both navbar and footer copies today).
4. Favicon: new `public/favicon.png` is 256×256 with transparent corners; served with 200 on `/favicon.png`.
5. No console errors / no 404s on `/` and `/about`.
