# Wire BaseLayout to the Real Design System — Design

## Goal

Bring the 5 pages that currently route through `BaseLayout.astro` (`about`, `products`, `contact`, `configurator`, `find-a-fitter`) in line with the homepage's real, benchmark-matched design system — navbar, footer, fonts, and colors — instead of the disconnected, hand-rolled Tailwind scaffold `BaseLayout.astro` currently has. `index.astro` is not restructured; it stays exactly as it is today, and the shared components it already has (`Navbar.astro`, now self-contained per the prior navbar-componentization work) get reused, plus one new one (`Footer.astro`) extracted the same way.

## Background

Confirmed via direct inspection: `index.astro` renders the real design system (`drivelodge.css`, `Navbar.astro`, inline footer markup using real benchmark classes). Every other page uses `BaseLayout.astro`, which has its own generic Tailwind navbar (plain "SKYRULE" text, white background), its own Tailwind footer, and loads `src/styles/global.css` — a separate, unrelated design-token system. All 5 pages using `BaseLayout` are currently placeholder stubs ("Coming soon") sharing an identical Tailwind-based content pattern.

`Navbar.astro` was made fully self-contained (markup + `drivelodge.css`-driven styling + its own mobile-toggle and scroll-blur-effect behavior) in a prior task specifically to prepare it for this reuse. `Footer.astro` does not exist yet — the real footer markup currently lives inline in `index.astro`, added during an earlier benchmark-parity pass (real 5-column link grid, real business info, real button variants).

## Approach

**1. Extract `src/components/footer/Footer.astro`**
Verbatim extraction of `index.astro`'s `<section class="section_footer">...</section>` block. Pure presentational component — no props, no JS, matching `Footer`'s actual nature (no interactive behavior of its own, unlike `Navbar`).

**2. De-duplicate `index.astro`**
Replace the inline footer markup with `<Footer />`. Zero visual or behavioral change — this is a relocation, not a redesign, same discipline as the navbar-componentization task.

**3. Rewire `BaseLayout.astro`**
- Remove `import "../styles/global.css"`.
- Add `<link rel="stylesheet" href="/styles/drivelodge.css"/>`.
- Add the fluid-font-size `<style>` block (copied from `index.astro`'s `<head>`) so type scales consistently with the homepage.
- Add the small Webflow utility CSS block (`.hide`, `.hide-tablet`, etc. — copied from `index.astro`'s inline reset) since `Navbar.astro` depends on it for responsive show/hide behavior, and it isn't part of `drivelodge.css` itself.
- Replace the hand-rolled `<nav>` with `<Navbar />`.
- Wrap `<Navbar />` + `<slot />` in `<main class="main-wrapper"><div class="scroll-wrapper">...</div></main>` — required for the footer's `position: fixed` "reveal" effect (defined in `drivelodge.css`) to size and reveal correctly, matching `index.astro`'s exact structure.
- Replace the hand-rolled `<footer>` with `<Footer />`, rendered outside `</main>` (matching `index.astro`).
- Remove the now-dead mobile-menu-toggle `<script>` block (BaseLayout's own hand-rolled one) — superseded by the behavior already built into `Navbar.astro`.
- Leave the `<title>`/meta tags as-is (a separate, pre-existing per-page-SEO gap, out of scope here).

**4. Re-class all 5 pages' placeholder content**
`about.astro`, `products.astro`, `contact.astro`, `configurator.astro`, `find-a-fitter.astro` currently share an identical Tailwind-based template. Swap each to the `drivelodge.css` equivalent:
```astro
<section class="padding-global"><div class="container-large"><div class="padding-section-large">
  <h1 class="heading-style-h1">About</h1>
  <p class="body-text">Coming soon.</p>
</div></div></section>
```
(same structure per page, only the heading text differs; `products.astro`'s dynamic `Astro.url.pathname`-derived title logic is preserved, just re-classed.)

**5. Delete `src/styles/global.css`**
Nothing references it once `BaseLayout.astro` is rewired and all 5 pages are re-classed.

## Out of Scope

- Building real content/sections for the 5 placeholder pages (they stay "Coming soon" — this is infrastructure only)
- Per-page `<title>`/meta description configurability on `BaseLayout`
- Any change to `index.astro`'s structure beyond the footer de-duplication (it does not adopt `BaseLayout`)
- Redesigning the footer itself beyond the verbatim extraction (its content/markup doesn't change, only its file location)

## Verification

1. Live check on `about.astro` (and spot-check one more, e.g. `contact.astro`): real navbar renders, styled correctly, mobile toggle works, scroll-blur effect works.
2. Live check: real footer renders on the same pages, reveal effect works (fixed position, revealed at the bottom of the page).
3. Regression check on `index.astro`: screenshot + interaction diff before/after the `Footer` extraction, confirming zero visual/behavioral change on the homepage.
4. Confirm `global.css` has zero remaining references anywhere in `src/` before deleting it.
5. No console/page errors on any of the 5 re-wired pages.
