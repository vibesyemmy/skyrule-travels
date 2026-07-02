# BaseLayout Real Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the 5 pages routed through `BaseLayout.astro` (`about`, `products`, `contact`, `configurator`, `find-a-fitter`) onto the homepage's real design system — real `Navbar`, a newly-extracted real `Footer`, `drivelodge.css` fonts/colors — replacing `BaseLayout.astro`'s disconnected Tailwind scaffold and deleting the now-unused `global.css`.

**Architecture:** Extract `Footer.astro` from `index.astro`'s inline footer markup (mirroring how `Navbar.astro` already works — pure presentational component, no props, no JS). De-duplicate `index.astro` to use it. Rewire `BaseLayout.astro` to load `drivelodge.css` + the fluid-font-size and Webflow-utility CSS blocks (both copied from `index.astro`), render `<Navbar />`/`<Footer />` inside the same `main-wrapper`/`scroll-wrapper` structure `index.astro` uses (required for the footer's fixed-position reveal effect), and drop `global.css` entirely. Re-class all 5 placeholder pages from Tailwind to `drivelodge.css` equivalents so nothing references `global.css` anymore, then delete it.

**Tech Stack:** Astro 7 components, `drivelodge.css` (external stylesheet). No test framework in this repo — verification is grep-based structural assertions plus live regression/interaction checks, the same method used throughout this project.

---

## Task 1: Extract `Footer.astro` and de-duplicate `index.astro`

**Files:**
- Create: `src/components/footer/Footer.astro`
- Modify: `src/pages/index.astro` (add import, replace inline footer markup with `<Footer />`)

**Context:** The real footer markup (5-column link grid, business info, real button variants — all benchmark-matched, built in an earlier session) currently lives inline in `index.astro` as a `<section data-theme="dark" class="section_footer">...</section>` block starting at line 115. It has no props and no JS behavior of its own — purely presentational, styled entirely by `drivelodge.css` classes. This task extracts it into its own component, the same way `Navbar.astro` already works, without changing a single character of the markup.

Because this block is very large (it contains a full inline logo SVG), do the extraction with a script rather than manually retyping it — this guarantees a byte-for-byte-exact move with no transcription risk.

- [ ] **Step 1: Confirm the current state**

Run:
```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
ls src/components/footer/Footer.astro 2>&1
```
Expected: `ls: src/components/footer/Footer.astro: No such file or directory` (doesn't exist yet)

```bash
grep -c '<section data-theme="dark" class="section_footer">' src/pages/index.astro
```
Expected: `1`

- [ ] **Step 2: Extract the footer markup into `Footer.astro`**

Run this Node script (via any available JS execution — a sandboxed `ctx_execute`-style tool, or plain `node -e`, or a one-off `.mjs` file):
```javascript
const fs = require('fs');
const indexPath = 'src/pages/index.astro';
const content = fs.readFileSync(indexPath, 'utf8');

const startMarker = '<section data-theme="dark" class="section_footer">';
const endMarker = '</section></div>\n<!-- ⬆ EXACT BENCHMARK BODY ⬆ -->';

const startIdx = content.indexOf(startMarker);
const endMarkerIdx = content.indexOf(endMarker, startIdx);
if (startIdx === -1) throw new Error('start marker not found');
if (endMarkerIdx === -1) throw new Error('end marker not found');

const footerSection = content.slice(startIdx, endMarkerIdx + '</section>'.length);

const footerAstro = `---
// Footer — exact benchmark markup from drivelodge.co.uk
// Depends on: /styles/drivelodge.css or style.css
---

${footerSection}
`;

fs.mkdirSync('src/components/footer', { recursive: true });
fs.writeFileSync('src/components/footer/Footer.astro', footerAstro, 'utf8');

// Now remove the footer section from index.astro and replace with <Footer />,
// and add the import.
const withoutFooter = content.slice(0, startIdx) + '<Footer />' + content.slice(endMarkerIdx + '</section>'.length);
const withImport = withoutFooter.replace(
  "import Hero from '../components/hero/Hero.astro';",
  "import Hero from '../components/hero/Hero.astro';\nimport Footer from '../components/footer/Footer.astro';"
);
fs.writeFileSync(indexPath, withImport, 'utf8');

console.log('Footer.astro written, length:', footerAstro.length);
console.log('index.astro updated, new length:', withImport.length);
```
Run this from the repo root (`/Users/opeyemiajagbe/Documents/Projects/skyrule-travels`).

- [ ] **Step 3: Verify the extraction**

```bash
grep -c 'section_footer' src/components/footer/Footer.astro
```
Expected: `1`

```bash
grep -c 'section_footer\|<Footer />' src/pages/index.astro
```
Expected: `1` (only `<Footer />` remains — the literal `section_footer` class string is gone from this file since it now lives in `Footer.astro`)

```bash
grep -c "import Footer from '../components/footer/Footer.astro'" src/pages/index.astro
```
Expected: `1`

- [ ] **Step 4: Confirm the dev server compiles and the homepage still renders the footer**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321
```
Expected: `200`. If no dev server is running, start one first with `npm run dev` (in the background).

```bash
curl -s http://localhost:4321 | grep -c 'section_footer'
```
Expected: `1` (confirms `<Footer />` actually renders the section into the page, not just that the import exists). If `curl` is unavailable in your environment, use an equivalent sandboxed HTTP fetch.

- [ ] **Step 5: Commit**

```bash
git add src/components/footer/Footer.astro src/pages/index.astro
git commit -m "refactor: extract Footer.astro, de-duplicate index.astro

Moves the real footer markup out of index.astro into its own component,
mirroring how Navbar.astro already works — pure presentational, no
props, no JS. Byte-for-byte extraction via script, zero markup changes.
Prepares Footer for reuse on other pages, same as Navbar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Rewire `BaseLayout.astro` to the real design system

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (full rewrite of `<head>`, `<body>`, and script)

**Context:** `BaseLayout.astro` currently loads `src/styles/global.css` and hand-rolls its own Tailwind-based `<nav>` and `<footer>`. This task replaces both with the real `Navbar`/`Footer` components and `drivelodge.css`, matching `index.astro`'s actual structure (`<main class="main-wrapper"><div class="scroll-wrapper">` around the navbar and page content, with the footer rendered outside that wrapper — required for the footer's `position: fixed` reveal effect, defined in `drivelodge.css`, to size and reveal correctly).

- [ ] **Step 1: Confirm the current state**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -c 'global.css' src/layouts/BaseLayout.astro
```
Expected: `1`

```bash
grep -c 'Navbar\|Footer' src/layouts/BaseLayout.astro
```
Expected: `0` (neither component is imported yet)

- [ ] **Step 2: Replace the full file content**

Replace the entire contents of `src/layouts/BaseLayout.astro` with:

```astro
---
// Skyrule — Base Layout
import Navbar from "../components/nav/Navbar.astro";
import Footer from "../components/footer/Footer.astro";
---

<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <title>Skyrule — Premium Camper Van Roof Conversions</title>
  <meta name="description" content="Skyrule designs, manufactures, and installs premium elevating roofs for camper van conversions. Built in the UK." />
  <meta property="og:title" content="Skyrule — Premium Camper Van Roof Conversions" />
  <meta property="og:description" content="Skyrule designs, manufactures, and installs premium elevating roofs for camper van conversions." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="stylesheet" href="/styles/drivelodge.css"/>

  <!-- Fluid root font-size scaling (from benchmark, missing from drivelodge.css) -->
  <style is:global>
  html { font-size: 1.125rem; }
  @media screen and (max-width:1920px) { html { font-size: calc(0.625rem + 0.41666666666666674vw); } }
  @media screen and (max-width:1440px) { html { font-size: calc(0.5991091314031181rem + 0.4454342984409799vw); } }
  @media screen and (max-width:991px) { html { font-size: calc(0.758056640625rem + 0.390625vw); } }
  @media screen and (max-width:479px) { html { font-size: calc(0.7494769874476988rem + 0.8368200836820083vw); } }
  </style>

  <!-- Webflow utility classes (from benchmark) — Navbar depends on .hide/.hide-tablet for responsive show/hide -->
  <style is:global>
  body *{color:inherit}a,.w-input,.w-select,.w-tab-link,.w-nav-link,.w-slider-arrow-left,.w-slider-arrow-right,.w-dropdown-btn,.w-dropdown-toggle,.w-dropdown-link{color:inherit;text-decoration:inherit;font-size:inherit}
  *[tabindex]:focus-visible,input[type="file"]:focus-visible{outline:.125rem solid #4d65ff;outline-offset:.125rem}
  .w-richtext>:not(div):first-child,.w-richtext>div:first-child>:first-child{margin-top:0!important}
  .w-richtext>:last-child,.w-richtext ol li:last-child,.w-richtext ul li:last-child{margin-bottom:0!important}
  .pointer-events-off{pointer-events:none}.pointer-events-on{pointer-events:auto}
  .div-square::after{content:"";display:block;padding-bottom:100%}
  .container-medium,.container-small,.container-large{margin-right:auto!important;margin-left:auto!important}
  .text-style-3lines{display:-webkit-box;overflow:hidden;-webkit-line-clamp:3;-webkit-box-orient:vertical}
  .text-style-2lines{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .display-inlineflex{display:inline-flex}
  .hide{display:none!important}
  @media screen and (max-width:991px){.hide,.hide-tablet{display:none!important}}
  @media screen and (max-width:767px){.hide-mobile-landscape{display:none!important}}
  @media screen and (max-width:479px){.hide-mobile{display:none!important}}
  .margin-0{margin:0!important}.padding-0{padding:0!important}.spacing-clean{padding:0!important;margin:0!important}
  .margin-top{margin-right:0!important;margin-bottom:0!important;margin-left:0!important}
  .padding-top{padding-right:0!important;padding-bottom:0!important;padding-left:0!important}
  .margin-right{margin-top:0!important;margin-bottom:0!important;margin-left:0!important}
  .padding-right{padding-top:0!important;padding-bottom:0!important;padding-left:0!important}
  .margin-bottom{margin-top:0!important;margin-right:0!important;margin-left:0!important}
  .padding-bottom{padding-top:0!important;padding-right:0!important;padding-left:0!important}
  .margin-left{margin-top:0!important;margin-right:0!important;margin-bottom:0!important}
  .padding-left{padding-top:0!important;padding-right:0!important;padding-bottom:0!important}
  .margin-horizontal{margin-top:0!important;margin-bottom:0!important}
  .padding-horizontal{padding-top:0!important;padding-bottom:0!important}
  .margin-vertical{margin-right:0!important;margin-left:0!important}
  .padding-vertical{padding-right:0!important;padding-left:0!important}
  .spacing-clean{padding:0!important;margin:0!important}
  </style>
</head>
<body>

<main class="main-wrapper"><div class="scroll-wrapper">

<Navbar />

<slot />

</div></main>
<Footer />

</body>
</html>
```

(This removes `global.css`, the hand-rolled `<nav>`/`<footer>`, and the old mobile-menu-toggle `<script>` block — that behavior now lives inside `Navbar.astro` itself.)

- [ ] **Step 3: Verify the rewire**

```bash
grep -c 'global.css' src/layouts/BaseLayout.astro
```
Expected: `0`

```bash
grep -c '<Navbar />\|<Footer />' src/layouts/BaseLayout.astro
```
Expected: `2`

```bash
grep -c 'main-wrapper\|scroll-wrapper' src/layouts/BaseLayout.astro
```
Expected: `2`

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "refactor: wire BaseLayout to the real design system

Replaces BaseLayout's disconnected Tailwind navbar/footer with the real
Navbar/Footer components, drivelodge.css, and the fluid-font-size +
Webflow-utility CSS blocks (copied from index.astro, matching the
pattern already established for that duplication). Adds the same
main-wrapper/scroll-wrapper structure index.astro uses, required for
Footer's fixed-position reveal effect. global.css is no longer
referenced by this file.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Re-class the 5 placeholder pages

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `src/pages/products.astro`
- Modify: `src/pages/contact.astro`
- Modify: `src/pages/configurator.astro`
- Modify: `src/pages/find-a-fitter.astro`

**Context:** All 5 pages currently share an identical Tailwind/`global.css`-based placeholder template. Since `BaseLayout.astro` no longer loads `global.css` (Task 2), these classes (`.section`, `.container`, `.h1`, `.text-neutral-300`, and Tailwind utilities like `capitalize`/`mb-4`/`text-lg`/`pt-40`) would resolve to nothing. Re-class each to the `drivelodge.css` equivalent.

- [ ] **Step 1: Confirm current state**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -l 'class="section section-px pt-40"' src/pages/about.astro src/pages/products.astro src/pages/contact.astro src/pages/configurator.astro src/pages/find-a-fitter.astro
```
Expected: all 5 file paths listed

- [ ] **Step 2: Update `src/pages/about.astro`**

Replace its entire contents with:
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <section class="padding-global"><div class="container-large"><div class="padding-section-large">
    <h1 class="heading-style-h1">About</h1>
    <p class="body-text">Coming soon.</p>
  </div></div></section>
</BaseLayout>
```

- [ ] **Step 3: Update `src/pages/products.astro`**

Replace its entire contents with:
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
const title = Astro.url.pathname.replace("/", "").replace(/-/g, " ") || "page";
---
<BaseLayout>
  <section class="padding-global"><div class="container-large"><div class="padding-section-large">
    <h1 class="heading-style-h1">{title || "Page"}</h1>
    <p class="body-text">Coming soon.</p>
  </div></div></section>
</BaseLayout>
```

- [ ] **Step 4: Update `src/pages/contact.astro`**

Replace its entire contents with:
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <section class="padding-global"><div class="container-large"><div class="padding-section-large">
    <h1 class="heading-style-h1">Contact</h1>
    <p class="body-text">Coming soon.</p>
  </div></div></section>
</BaseLayout>
```

- [ ] **Step 5: Update `src/pages/configurator.astro`**

Replace its entire contents with:
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <section class="padding-global"><div class="container-large"><div class="padding-section-large">
    <h1 class="heading-style-h1">Configurator</h1>
    <p class="body-text">Coming soon.</p>
  </div></div></section>
</BaseLayout>
```

- [ ] **Step 6: Update `src/pages/find-a-fitter.astro`**

Replace its entire contents with:
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <section class="padding-global"><div class="container-large"><div class="padding-section-large">
    <h1 class="heading-style-h1">Find A Fitter</h1>
    <p class="body-text">Coming soon.</p>
  </div></div></section>
</BaseLayout>
```

- [ ] **Step 7: Verify**

```bash
grep -L 'class="section section-px pt-40"' src/pages/about.astro src/pages/products.astro src/pages/contact.astro src/pages/configurator.astro src/pages/find-a-fitter.astro
```
Expected: all 5 file paths listed (i.e., the OLD class string is now absent from every one of them — `grep -L` lists files that do NOT match)

```bash
grep -c 'heading-style-h1' src/pages/about.astro src/pages/products.astro src/pages/contact.astro src/pages/configurator.astro src/pages/find-a-fitter.astro
```
Expected: `1` for each of the 5 files

- [ ] **Step 8: Commit**

```bash
git add src/pages/about.astro src/pages/products.astro src/pages/contact.astro src/pages/configurator.astro src/pages/find-a-fitter.astro
git commit -m "refactor: re-class placeholder pages to drivelodge.css

Swaps the Tailwind/global.css-based placeholder template on all 5
BaseLayout pages for the drivelodge.css equivalent, since BaseLayout
no longer loads global.css. Content and behavior (products.astro's
dynamic title) unchanged, only the classes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Delete `global.css`

**Files:**
- Delete: `src/styles/global.css`

**Context:** Nothing references it anymore after Tasks 2 and 3.

- [ ] **Step 1: Confirm nothing references it**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -rn 'global.css' src/
```
Expected: no output (zero matches anywhere in `src/`)

- [ ] **Step 2: Delete the file**

```bash
rm src/styles/global.css
```

- [ ] **Step 3: Confirm the dev server still compiles**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321
```
Expected: `200`

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/about
```
Expected: `200`

- [ ] **Step 4: Commit**

```bash
git add -A src/styles/global.css
git commit -m "chore: remove unused global.css

No longer referenced anywhere after BaseLayout and its 5 pages moved
to drivelodge.css.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Full verification pass

**Files:** none (verification only)

**Context:** Confirm the whole change set works end-to-end: the 5 re-wired pages get a real, working navbar and footer, and the homepage (which went through a footer de-duplication in Task 1) shows zero regression.

- [ ] **Step 1: Homepage regression check**

Using whatever browser automation is available, load `http://localhost:4321`, scroll to the bottom, and confirm the footer renders exactly as before (5-column link grid with icons, real logo, "Waring Industries, T/A Skyrule" legal line) — this is the same footer markup, just relocated to `Footer.astro`, so it must look identical to before Task 1.

- [ ] **Step 2: `about.astro` live check**

Load `http://localhost:4321/about`. Confirm:
- The real navbar renders (same logo, nav links, and styling as the homepage — not the old plain "SKYRULE" text navbar).
- At a narrow viewport (390px), clicking the hamburger button toggles `data-nav-menu-open` on `.navbar_menu` (same check as the navbar-componentization task's regression test).
- At a desktop viewport (1440px), scrolling past 300px triggers the scroll-blur effect (`.navbar_background`'s `background-color` becomes `rgba(0, 0, 0, 0.8)` with `backdrop-filter: blur(12px)`).
- Scrolling to the bottom of the page reveals the real footer.
- The "About" heading and "Coming soon" text render with real typography (not default browser styling).

- [ ] **Step 3: Spot-check one more page**

Repeat the navbar/footer checks from Step 2 (not the full interaction suite, just visual + presence) on `http://localhost:4321/contact`.

- [ ] **Step 4: No console/page errors**

While performing Steps 1-3, capture browser console output and page errors across all three pages visited. Expected: no errors (pre-existing, unrelated `srcset` parsing warnings on Webflow image assets are fine and expected — same warnings already present on the homepage before this work).

- [ ] **Step 5: Report result**

If all checks pass, the task is complete — no commit needed for this task (verification only). If anything fails, do not patch blindly: identify which of Tasks 1-4 introduced the discrepancy before making further changes.

---

## Self-Review Notes

- **Spec coverage:** Footer extraction (Task 1) → spec section 1. `index.astro` de-duplication (Task 1) → spec section 2. BaseLayout rewiring including the main-wrapper/scroll-wrapper structure (Task 2) → spec section 3. 5-page re-classing (Task 3) → spec section 4. global.css deletion (Task 4) → spec section 5. All 5 verification points from the spec are covered across Task 5's steps.
- **No placeholders:** every step has literal file paths, literal code (or, for the large footer extraction, a literal runnable script with exact boundary markers — chosen over manually retyping ~30KB of markup, which would be an actual transcription risk rather than a shortcut).
- **Type/name consistency:** `Footer` import path (`../components/footer/Footer.astro`) is identical between Task 1 (creation) and Task 2 (BaseLayout's import) and already-established Task 1 usage in `index.astro`. Class names (`heading-style-h1`, `body-text`, `padding-global`, `container-large`, `padding-section-large`) are used identically across all 5 pages in Task 3.
