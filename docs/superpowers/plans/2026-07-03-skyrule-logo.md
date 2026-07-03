# Skyrule Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the four Skyrule logo PNGs into the repo, swap the Drivelodge SVG for the Skyrule logo in the navbar and footer, and replace the favicon with a generated square bird-mark render.

**Architecture:** Assets copied into `public/images/` with descriptive names. Both inline logo SVGs (identical, identifiable by the unique clip-path id `clip0_6407_254`) are replaced by a single-line `<img>` via an assertion-guarded script. Because both logo containers are width-constrained in `drivelodge.css` (the squarer 1.92:1 logo would render ~1.7× taller and stretch the bars), two height-constrained sizing rules go into `public/styles/skyrule.css`. The favicon is generated programmatically: the bird's bounding box is detected by pixel scan (non-transparent, non-white — the white wordmark is excluded by color), padded square, and rendered at 256×256.

**Tech Stack:** Plain assets + CSS; Playwright (npx cache at `/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` — the `5c6d8c4f...` entry lacks browsers) for the favicon canvas render and live layout checks. No test framework — verification is scripted live checks + screenshots. This environment blocks `curl`/inline-HTTP in Bash; run scripts as files via `node <file>`.

**Spec:** `docs/superpowers/specs/2026-07-03-skyrule-logo-design.md` (user-approved).

**Scratch location:** `/private/tmp/claude-501/-Users-opeyemiajagbe-Documents-Projects/a68b9f9b-b937-4408-90fb-4cad5283782f/scratchpad` (referred to as `$SCRATCH`; use the literal path).

**Pinned ground truth (from spec-time investigation):**
- Source PNGs: `~/Downloads/skyrule-logo/` — all 1708×890. `dark.png` = full-color bird + white wordmark (for dark bg; THE variant used), `light.png` = + black wordmark, `dark-1.png` = all-white mono, `light-1.png` = all-black mono.
- `.navbar_logo-link { width: 6.5rem; height: auto }` (width-constrained) — old logo renders 119×36 at 1440px; `.navbar_container` renders 66px tall.
- `.footer_logo-wrap { width: 11.25rem }` — old logo renders 180×54.
- Both logo SVGs open with `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 136 41" fill="none" class="logo">` and contain the unique id `clip0_6407_254`.
- Favicon references: `rel="icon"` in both shells + `rel="apple-touch-icon"` in `index.astro`, all → `/favicon.png` (currently 32×32).

---

## Task 1: Import the logo kit and generate the favicon

**Files:**
- Create: `public/images/skyrule-logo-dark.png`, `public/images/skyrule-logo-light.png`, `public/images/skyrule-logo-white.png`, `public/images/skyrule-logo-black.png`
- Replace: `public/favicon.png`
- Create: `$SCRATCH/gen-favicon.mjs` (not committed)

- [ ] **Step 1: Copy the assets with descriptive names**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
cp "/Users/opeyemiajagbe/Downloads/skyrule-logo/dark.png"    public/images/skyrule-logo-dark.png
cp "/Users/opeyemiajagbe/Downloads/skyrule-logo/light.png"   public/images/skyrule-logo-light.png
cp "/Users/opeyemiajagbe/Downloads/skyrule-logo/dark-1.png"  public/images/skyrule-logo-white.png
cp "/Users/opeyemiajagbe/Downloads/skyrule-logo/light-1.png" public/images/skyrule-logo-black.png
```
(Note the renames: `dark-1` is the all-WHITE monochrome, `light-1` the all-BLACK — named by what they are, not by the kit's background-oriented naming. `.DS_Store` is not copied.)

- [ ] **Step 2: Verify the copies**

```bash
for f in dark light white black; do sips -g pixelWidth -g pixelHeight "public/images/skyrule-logo-$f.png" | tail -2 | tr '\n' ' '; echo "$f"; done
```
Expected: `pixelWidth: 1708 pixelHeight: 890` for all four.

- [ ] **Step 3: Write `$SCRATCH/gen-favicon.mjs`**

Exact contents:

```js
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require('/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const SRC = 'public/images/skyrule-logo-dark.png';
const OUT = 'public/favicon.png';
const dataUrl = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');

const browser = await pw.chromium.launch();
const page = await browser.newPage();
const result = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 32) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 200 && g > 200 && b > 200) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('no bird pixels found');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const margin = Math.round(Math.max(bw, bh) * 0.04);
  const side = Math.max(bw, bh) + margin * 2;
  const sq = document.createElement('canvas'); sq.width = side; sq.height = side;
  const sctx = sq.getContext('2d');
  sctx.drawImage(c, minX, minY, bw, bh, Math.round((side - bw) / 2), Math.round((side - bh) / 2), bw, bh);
  const out = document.createElement('canvas'); out.width = 256; out.height = 256;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(sq, 0, 0, 256, 256);
  return { bbox: { minX, minY, maxX, maxY }, png: out.toDataURL('image/png') };
}, dataUrl);
await browser.close();
fs.writeFileSync(OUT, Buffer.from(result.png.split(',')[1], 'base64'));
console.log('favicon written; bird bbox:', JSON.stringify(result.bbox));
```

How it works: the white wordmark in `skyrule-logo-dark.png` is excluded from the bounding box by color (all-channels > 200); the orange (r=226) and green (r=163) bird pixels survive the filter, anti-aliased near-white edges are dropped harmlessly. The bird bbox is padded 4%, squared, centered, and downsampled to 256.

- [ ] **Step 4: Run it and sanity-check**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/gen-favicon.mjs"
```
Expected: `favicon written; bird bbox: {...}` where the bbox spans most of the image width (minX < 100, maxX > 1600) and its maxY sits ABOVE the wordmark (maxY < 700). If maxY ≥ 700 the color filter leaked wordmark pixels — STOP and report BLOCKED with the bbox.

```bash
sips -g pixelWidth -g pixelHeight public/favicon.png | tail -2
```
Expected: `pixelWidth: 256`, `pixelHeight: 256`.

- [ ] **Step 5: Visual check of the favicon**

Read/view `public/favicon.png` (it renders as an image) — expect the full-color bird centered on transparency, no wordmark fragments, no clipping of wing tips.

- [ ] **Step 6: Commit**

```bash
git add public/images/skyrule-logo-dark.png public/images/skyrule-logo-light.png public/images/skyrule-logo-white.png public/images/skyrule-logo-black.png public/favicon.png
git commit -m "feat: add Skyrule logo kit, generate bird-mark favicon

Four logo variants (full-color for dark/light backgrounds + white/black
monochromes) imported under descriptive names. favicon.png replaced by
a 256x256 transparent square render of the full-color bird mark,
generated by pixel-scan crop (white wordmark excluded by color). All
favicon references already point at /favicon.png — no markup changes.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Swap the navbar and footer logos

**Files:**
- Modify: `src/components/nav/Navbar.astro` (1 SVG → img), `src/components/footer/Footer.astro` (1 SVG → img)
- Modify: `public/styles/skyrule.css` (2 sizing rules appended)
- Create: `$SCRATCH/swap-logos.mjs`, `$SCRATCH/logo-layout-check.mjs` (not committed)

**Context:** Both containers are width-constrained (see pinned ground truth), so without intervention the squarer logo renders ~62px tall in the navbar (stretching the 66px bar) and ~94px in the footer. The sizing rules constrain by height instead. Dev server at `http://localhost:4321` (`astro dev status` / `astro dev --background`).

- [ ] **Step 1: Capture the pre-swap layout baseline**

Write `$SCRATCH/logo-layout-check.mjs` (exact contents):

```js
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require('/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const MODE = process.argv[2];
if (!['baseline', 'compare'].includes(MODE)) { console.error('usage: baseline|compare'); process.exit(2); }
const FILE = path.join(path.dirname(new URL(import.meta.url).pathname), 'logo-baseline.json');

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const m = await page.evaluate(() => {
  const box = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    navContainer: box('.navbar_container'),
    navLogo: box('.navbar_logo-link .logo'),
    footerLogo: box('.footer_logo-wrap .logo'),
    logoIsImg: !!document.querySelector('.navbar_logo-link img.logo'),
    imgLoaded: (() => { const i = document.querySelector('.navbar_logo-link img.logo'); return i ? i.complete && i.naturalWidth > 0 : null; })(),
  };
});
await browser.close();
console.log(JSON.stringify(m, null, 1));
if (MODE === 'baseline') {
  fs.writeFileSync(FILE, JSON.stringify(m));
  console.log('baseline saved');
} else {
  const base = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const ok = Math.abs(m.navContainer.h - base.navContainer.h) <= 1
    && m.logoIsImg === true
    && m.imgLoaded === true
    && m.navLogo.h >= 40 && m.navLogo.h <= 52
    && m.footerLogo.h >= 52 && m.footerLogo.h <= 66;
  console.log(`navContainer height: ${base.navContainer.h} -> ${m.navContainer.h}`);
  console.log(ok ? 'LOGO LAYOUT: PASS' : 'LOGO LAYOUT: FAIL');
  process.exit(ok ? 0 : 1);
}
```

Run: `cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/logo-layout-check.mjs" baseline`
Expected: JSON with `navContainer` ≈ 66px tall, `navLogo` ≈ 119×36, `footerLogo` ≈ 180×54, `logoIsImg: false`; then `baseline saved`.

- [ ] **Step 2: Write `$SCRATCH/swap-logos.mjs`**

Exact contents:

```js
import fs from 'node:fs';

const IMG = '<img src="/images/skyrule-logo-dark.png" alt="Skyrule Travels" class="logo"/>';
const FILES = ['src/components/nav/Navbar.astro', 'src/components/footer/Footer.astro'];
for (const file of FILES) {
  let c = fs.readFileSync(file, 'utf8');
  const re = /<svg [^>]*class="logo"[^>]*>[\s\S]*?<\/svg>/g;
  const matches = c.match(re) ?? [];
  if (matches.length !== 1) throw new Error(`${file}: expected exactly 1 logo <svg>, found ${matches.length}`);
  if (!matches[0].includes('clip0_6407_254')) throw new Error(`${file}: matched svg is not the Drivelodge logo (missing clip0_6407_254)`);
  if (!matches[0].includes('viewBox="0 0 136 41"')) throw new Error(`${file}: unexpected viewBox`);
  c = c.replace(re, IMG);
  fs.writeFileSync(file, c);
  console.log(`${file}: logo swapped`);
}
```

- [ ] **Step 3: Run it**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/swap-logos.mjs"
```
Expected:
```
src/components/nav/Navbar.astro: logo swapped
src/components/footer/Footer.astro: logo swapped
```
On any assertion error, STOP and report BLOCKED — do not loosen the assertions.

- [ ] **Step 4: Append the sizing rules to `public/styles/skyrule.css`**

Append exactly (at the end of the file, after the PORT CHECKLIST comment):

```css

/* Skyrule logo sizing — the kit's 1.92:1 logo is much squarer than the old
   3.3:1 Drivelodge SVG, and drivelodge.css sizes both logo containers by
   WIDTH (.navbar_logo-link 6.5rem, .footer_logo-wrap 11.25rem), which would
   stretch the navbar/footer vertically. Constrain by height instead; width
   follows the aspect ratio. */
.navbar_logo-link img.logo {
  height: 2.75rem;
  width: auto;
}
.footer_logo-wrap img.logo {
  height: 3.5rem;
  width: auto;
}
```

- [ ] **Step 5: Verify the swap textually**

```bash
grep -c 'clip0_6407_254' src/components/nav/Navbar.astro src/components/footer/Footer.astro
```
Expected: `0` for both files.

```bash
grep -c 'skyrule-logo-dark.png' src/components/nav/Navbar.astro src/components/footer/Footer.astro
```
Expected: `1` for both files.

- [ ] **Step 6: Verify the layout held**

```bash
node "$SCRATCH/logo-layout-check.mjs" compare
```
(Give the dev server a few seconds to recompile; re-run once if mid-compile.)
Expected: `navContainer height: 66 -> 66` (±1) and `LOGO LAYOUT: PASS`. If the height moved more than 1px, the sizing rules aren't winning — report BLOCKED with the JSON; do not tweak values blindly.

- [ ] **Step 7: Commit**

```bash
git add src/components/nav/Navbar.astro src/components/footer/Footer.astro public/styles/skyrule.css
git commit -m "feat: swap Drivelodge logo for Skyrule in navbar and footer

Both inline logo SVGs replaced by the Skyrule dark-background variant
(full-color bird + white wordmark) with an accessible name. Because
drivelodge.css sizes both logo containers by width and the new logo is
much squarer, two height-constrained rules in skyrule.css keep the
navbar height and footer footprint unchanged (verified live pre/post).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Full verification pass

**Files:** none (verification only; screenshots to `$SCRATCH`)

- [ ] **Step 1: No Drivelodge logo remains in src/**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -rc 'clip0_6407_254' src/ | grep -v ':0'
```
Expected: no output.

- [ ] **Step 2: Favicon serves correctly**

File-based node fetch of `http://localhost:4321/favicon.png` → expect HTTP 200 and a body ≥ 5KB. Then verify the file: 256×256 (`sips`), and via a small canvas script (same Playwright technique as Task 1) that all four corner pixels have alpha 0 (transparent padding) and the center row contains pixels where r>150 (the orange wing crosses the middle).

- [ ] **Step 3: Live logo checks + screenshots (1440×900)**

On `/`: logo `<img>` loaded (`naturalWidth > 0`), no 404s in network events, screenshot the navbar area at scroll 0 (`$SCRATCH/logo-nav-top.png` — logo over the hero photo). Scroll to 300, screenshot (`logo-nav-scrolled.png` — logo on the dark blur bar). Scroll to page bottom, screenshot the footer (`logo-footer.png` — logo in the link grid). On `/about`: screenshot the pinned navbar (`logo-nav-pinned.png`).

- [ ] **Step 4: No console/page errors**

Zero `console` type-`error` and `pageerror` events across all pages/interactions above; zero failed requests (HTTP ≥ 400) for image assets.

- [ ] **Step 5: Report**

PASS/FAIL per step with evidence + the four screenshot paths. All pass → plan complete (no commit). Any failure → triage against Tasks 1–2; do not patch blindly.

---

## Self-Review Notes

- **Spec coverage:** asset import incl. renames (Task 1 Steps 1–2) → spec "Source assets" table. Favicon generation + zero-markup replacement (Task 1 Steps 3–5) → spec "Favicon". Navbar + footer swaps with `alt="Skyrule Travels"`, eager loading (no `loading` attribute), and the two skyrule.css sizing rules (Task 2) → spec "Swaps" including the amended sizing paragraph. Verification steps map 1:1 to the spec's 5 verification points (Drivelodge-free grep, favicon dims/transparency/200, screenshots of all navbar states + footer, bar-height stability, no errors/404s). Out-of-scope items (photography, light variants, old Smartgrade files, drivelodge.css) have no tasks, correctly.
- **No placeholders:** all three scripts and the CSS block are complete and literal; commands carry expected output.
- **Name consistency:** `skyrule-logo-dark.png` is spelled identically in the copy command (Task 1), the `IMG` constant (Task 2 Step 2), the grep (Task 2 Step 5), and the favicon script's `SRC`. The `clip0_6407_254` sentinel matches the pinned ground truth. The layout-check expectations (nav logo height 40–52px band around the 2.75rem ≈ 46px target; footer 52–66px around 3.5rem ≈ 59px) are consistent with the sizing rules, tolerant of the fluid root font-size.
- **Grep-count semantics:** Task 2 Step 5 expects per-file counts (`grep -c` on two named files prints `file:count` lines — `0`/`1` per file, one occurrence per file so line-vs-occurrence is not a hazard). Task 3 Step 1 uses the `| grep -v ':0'` empty-output idiom established in prior plans.
