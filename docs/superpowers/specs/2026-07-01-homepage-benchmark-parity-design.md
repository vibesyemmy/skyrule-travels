# Homepage 1:1 Parity with html-benchmark — Design

## Goal

Make `src/pages/index.astro` (Astro homepage) a 1:1 UI match — visual layout
and interactive behavior — with the `html-benchmark` branch's `index.html`
(the original Webflow-extracted landing page). Scope is the homepage only;
other Astro pages (about, products, contact, configurator, find-a-fitter)
have no benchmark equivalent and are out of scope.

Brand text (e.g. "Drivelodge" → "Skyrule") is intentionally substituted
where the rest of the homepage already does this — parity means structural/
visual/behavioral fidelity, not literal byte-for-byte copy text.

## Current State (as of exploration)

- Benchmark page order: Navbar → `section_hero-home` → `section_fitter-cta`
  → `section_featured` → `section_home-about` → `section_config-cta` →
  `section_home-video` → `section_build-cta` → `section_contact-cta` →
  `section_footer`.
- `index.astro` already inlines exact-copy markup for every section **except
  the hero** — that section is missing from the rendered page entirely.
- A `Hero.astro` component exists but is unused, and its markup diverges
  from the benchmark hero: different class names, missing body paragraph,
  missing "Story of Skyrule" video-CTA block, missing one parallax layer,
  and references image files that don't exist in `public/images`
  (`/images/hero-mountains.webp` etc.) instead of the real benchmark asset
  filenames (`67864fe46913e952168c7743_Mountains Back v2.webp`, etc.),
  which are already present in `public/images`.
- `public/styles/drivelodge.css` (214,151 bytes) is smaller than benchmark's
  `style.css` (240,956 bytes) — an ~11% gap, cause not yet diagnosed.
- The homepage's script tags load jQuery, GSAP+ScrollTrigger, Swiper, and a
  themes script, but no Webflow lightbox runtime — so the benchmark's video
  lightboxes (hero "Story of Skyrule" and `section_home-video`'s "Watch
  Video") have no working modal today.

## Approach

Section-by-section audit and targeted fix, prioritized by confirmed risk
rather than a full rebuild (most sections are already correct copies).

### P0 — Hero section
Rewrite `Hero.astro` to mirror the benchmark's literal DOM structure and
classes (`parallax__header`, `parallax__visuals`, `parallax__black-line-overflow`,
4 parallax layers, `hero-home_content` → `header-wrapper` → `header-text-wrap`
with eyebrow/H1/body paragraph, button-group, video-CTA block, and the
`home-products_component` product-type cards). Swap only brand-name copy
(Drivelodge → Skyrule, matching the substitution pattern used elsewhere on
the page) and use the real benchmark asset filenames already in
`public/images`. Wire `<Hero />` into `index.astro` between `<Navbar />` and
`section_fitter-cta`.

### P1 — CSS parity
Diff benchmark `style.css` against `public/styles/drivelodge.css` to find
what rules are missing or altered, and patch the gap.

### P1 — Interactive behavior audit
Confirm in the running dev server (not just by reading markup) that:
- parallax scroll effect fires on the hero,
- Swiper carousel in `section_featured` drags/arrows correctly,
- mobile nav toggle opens/closes,
- video lightboxes actually open a modal.

The lightbox is the known gap — benchmark relies on Webflow's native
lightbox runtime (`w-lightbox` + embedded JSON), which isn't loaded. Add a
lightweight lightbox implementation (or the minimal subset of Webflow's
lightbox script) so clicking "Watch Video" opens a modal playing the
referenced video/YouTube embed, matching benchmark behavior.

### P2 — Full section-by-section visual diff
Serve `html-benchmark` statically alongside the Astro dev server, screenshot
each section at desktop/tablet/mobile widths side by side, and fix any
remaining drift found.

## Verification

Visual + code diff, per the priority order above:
1. Code/markup diff for Hero rewrite (compare against benchmark source
   directly, section by section).
2. Screenshot comparison (desktop/tablet/mobile) for the full homepage,
   benchmark vs Astro dev server.
3. Manual interaction check for parallax, carousel, mobile nav, lightboxes.

## Out of Scope

- Non-homepage pages (about, products, contact, configurator,
  find-a-fitter) — no benchmark exists for these.
- Literal preservation of pre-rebrand copy text (e.g. "Drivelodge") where
  the rest of the page has already substituted "Skyrule".
