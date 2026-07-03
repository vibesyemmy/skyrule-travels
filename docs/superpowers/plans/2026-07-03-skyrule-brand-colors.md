# Skyrule Brand Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the site from Drivelodge blue to Skyrule green `#A3D346` (leading) + orange `#E26E00` (accent) via a token overlay stylesheet, leaving `public/styles/drivelodge.css` byte-untouched.

**Architecture:** New `public/styles/skyrule.css` loaded immediately after `drivelodge.css` in both HTML shells (`index.astro`, `BaseLayout.astro`). It defines five `--skyrule--*` primitives, re-points the four wired Webflow brand tokens, flips button text from white to ink with careful `:not()` scoping (the variant rules use zero-specificity `:where()`, so a blanket rule would break the primary button), and overrides the four rules in `drivelodge.css` that hardcode `#437ef7`. Two color-only string swaps in the shells handle the hardcoded focus ring and inline SVG checkmark fills.

**Tech Stack:** Plain CSS custom properties. No test framework — verification is live Playwright computed-style checks + screenshots (established method).

**Spec:** `docs/superpowers/specs/2026-07-03-skyrule-brand-colors-design.md` (user-approved).

**Scratch location:** `/private/tmp/claude-501/-Users-opeyemiajagbe-Documents-Projects/a68b9f9b-b937-4408-90fb-4cad5283782f/scratchpad` (referred to as `$SCRATCH`; use the literal path).

---

## Task 1: Create `skyrule.css` and wire it into both shells

**Files:**
- Create: `public/styles/skyrule.css`
- Modify: `src/pages/index.astro` (1 `<link>` insertion), `src/layouts/BaseLayout.astro` (1 `<link>` insertion)

**Context:** Dev server should already run at `http://localhost:4321` (`astro dev status`; start with `astro dev --background` if not). This environment blocks `curl`/inline-HTTP in Bash — verify via file-based `node` scripts.

- [ ] **Step 1: Confirm current state**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
ls public/styles/skyrule.css 2>&1
```
Expected: `No such file or directory`

```bash
grep -c 'drivelodge.css' src/pages/index.astro src/layouts/BaseLayout.astro
```
Expected: `1` for each file (the anchor for the link insertion)

- [ ] **Step 2: Write `public/styles/skyrule.css`**

Exact contents:

```css
/* Skyrule brand overlay — loaded AFTER drivelodge.css.
   drivelodge.css stays byte-untouched (benchmark parity); this file re-points
   its brand tokens at the official Skyrule palette. The Webflow token names
   still say "blue" — they are wired into ~40 rules in drivelodge.css, so we
   alias rather than rename. Color parity with the Drivelodge benchmark
   intentionally ends here; structural parity does not. */

:root {
  /* Skyrule primitives */
  --skyrule--green: #a3d346;        /* fills: brand buttons, brand surfaces */
  --skyrule--green-hover: #8cb93a;  /* hover fills */
  --skyrule--green-text: #55701f;   /* green AS TEXT on light bg (AA ~5.6:1; raw green is ~1.7:1 on white) */
  --skyrule--ink: #1c2a05;          /* text on green fills (~12:1) */
  --skyrule--orange: #e26e00;       /* accent only: focus rings, eyebrows, highlights */

  /* Re-point the wired Webflow brand tokens */
  --base-color-brand--blue: var(--skyrule--green);
  --base-color-brand--blue-dark: var(--skyrule--green-hover);
  --base-color-brand--blue-darkest: var(--skyrule--green-text);
  --base-color-brand--gold: var(--skyrule--orange);
}

/* Button text flip — SCOPED, not blanket. drivelodge.css's variant rules use
   :where() (zero specificity); a blanket .button-content{color:...} loading
   after them would also override the primary button's white-on-black and
   break it. :not() targets exactly the base/brand-style buttons, which carry
   no variant class. */
.button-content:not([class*="w-variant"]) {
  color: var(--skyrule--ink);
}

/* Link-style button: green-as-text must be the AA-passing cut, and hover must
   go a step darker than resting (the re-pointed -darkest token would
   otherwise make resting and hover the identical #55701f). */
.button-content:where(.w-variant-16fb8767-26f4-a35f-edd9-ba91eadcd66c) {
  color: var(--skyrule--green-text);
}
.button-content:hover:where(.w-variant-16fb8767-26f4-a35f-edd9-ba91eadcd66c) {
  color: var(--skyrule--ink);
}

/* The complete inventory of rules in drivelodge.css that hardcode #437ef7
   instead of using the token (verified by grep). Overridden here so the
   benchmark file stays untouched. (.pagination1_page-button's #437ef700 is
   fully transparent — hue is invisible, no override needed.) */
.button-2 {
  background-color: var(--skyrule--green);
  border-color: var(--skyrule--green);
  color: var(--skyrule--ink);
}
.button-2.is-blue {
  background-color: var(--skyrule--green);
  border-color: var(--skyrule--green);
}
.text-color-blue-2 {
  color: var(--skyrule--green-text);
}
.config_sidebar_button {
  background-color: var(--skyrule--green);
  color: var(--skyrule--ink);
}
```

- [ ] **Step 3: Wire the `<link>` into both shells**

In `src/pages/index.astro`, using the Edit tool, replace:
```
<link rel="stylesheet" href="/styles/drivelodge.css"/>
```
with:
```
<link rel="stylesheet" href="/styles/drivelodge.css"/>
<link rel="stylesheet" href="/styles/skyrule.css"/>
```

In `src/layouts/BaseLayout.astro`, replace:
```
  <link rel="stylesheet" href="/styles/drivelodge.css"/>
```
with:
```
  <link rel="stylesheet" href="/styles/drivelodge.css"/>
  <link rel="stylesheet" href="/styles/skyrule.css"/>
```
(Note BaseLayout's two-space indentation — match it.)

- [ ] **Step 4: Verify the wiring**

```bash
grep -c 'skyrule.css' src/pages/index.astro src/layouts/BaseLayout.astro
```
Expected: `1` for each file

- [ ] **Step 5: Live token smoke test**

Write `$SCRATCH/verify-brand-task1.mjs`:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require('/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const r = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const heroBtn = [...document.querySelectorAll('a.button-wrap')].find(a => a.textContent.includes('Get in touch') && !a.closest('.section_footer'));
  const footerPrimary = [...document.querySelectorAll('.section_footer a.button-wrap')].find(a => a.textContent.includes('Get in touch'));
  const hb = heroBtn.querySelector('.button-content');
  const fp = footerPrimary.querySelector('.button-content');
  return {
    tokenGreen: root.getPropertyValue('--skyrule--green').trim(),
    brandBtnBg: getComputedStyle(hb).backgroundColor,
    brandBtnText: getComputedStyle(hb).color,
    primaryBtnBg: getComputedStyle(fp).backgroundColor,
    primaryBtnText: getComputedStyle(fp).color,
  };
});
console.log(JSON.stringify(r, null, 1));
const ok = r.tokenGreen === '#a3d346'
  && r.brandBtnBg === 'rgb(163, 211, 70)'
  && r.brandBtnText === 'rgb(28, 42, 5)'
  && r.primaryBtnBg === 'rgb(255, 255, 255)'
  && r.primaryBtnText !== 'rgb(28, 42, 5)';
console.log(ok ? 'TASK1 SMOKE: PASS' : 'TASK1 SMOKE: FAIL');
process.exit(ok ? 0 : 1);
```

Run: `node "$SCRATCH/verify-brand-task1.mjs"` (from anywhere; give the dev server a few seconds after the edits).
Expected: `TASK1 SMOKE: PASS`. The `primaryBtnBg === white` + `primaryBtnText !== ink` pair is the proof that the `:not()` scoping dodged the `:where()` trap — if the primary button's text turned ink, STOP and report BLOCKED; do not widen or narrow selectors ad hoc.

- [ ] **Step 6: Commit**

```bash
git add public/styles/skyrule.css src/pages/index.astro src/layouts/BaseLayout.astro
git commit -m "feat: add Skyrule brand color overlay

New skyrule.css token overlay loaded after drivelodge.css: green
#A3D346 leads (buttons, links — re-pointed through the existing
Webflow brand tokens), orange #E26E00 reserved for accents, button
text flipped from white to ink with :not() scoping so the primary
variant's :where()-based colors stay intact. drivelodge.css is
byte-untouched.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Color-only swaps in the shells (focus ring + checkmark SVGs)

**Files:**
- Modify: `src/pages/index.astro` (1 focus-ring hex + 4 SVG circle fills)
- Modify: `src/layouts/BaseLayout.astro` (1 focus-ring hex)
- Create: `$SCRATCH/swap-brand-hexes.mjs` (not committed)

**Context:** These literals can't come from the overlay: the focus ring is hardcoded in each shell's inline utility CSS block, and SVG presentation attributes can't use `var()`. Color-only edits — zero structural change. The swaps are scripted with count assertions because `index.astro`'s occurrences sit inside very long benchmark-verbatim lines.

- [ ] **Step 1: Write `$SCRATCH/swap-brand-hexes.mjs`**

Exact contents:

```js
import fs from 'node:fs';

const JOBS = [
  { file: 'src/pages/index.astro', swaps: [
    { from: 'outline:.125rem solid #4d65ff', to: 'outline:.125rem solid #E26E00', count: 1 },
    { from: 'fill="#437ef7"', to: 'fill="#A3D346"', count: 4 },
  ]},
  { file: 'src/layouts/BaseLayout.astro', swaps: [
    { from: 'outline:.125rem solid #4d65ff', to: 'outline:.125rem solid #E26E00', count: 1 },
  ]},
];
for (const job of JOBS) {
  let c = fs.readFileSync(job.file, 'utf8');
  for (const s of job.swaps) {
    const n = c.split(s.from).length - 1;
    if (n !== s.count) throw new Error(`${job.file}: expected ${s.count}x "${s.from}", found ${n}`);
    c = c.split(s.from).join(s.to);
  }
  fs.writeFileSync(job.file, c);
  console.log(`${job.file}: swapped OK`);
}
```

- [ ] **Step 2: Run it (from the repo root)**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/swap-brand-hexes.mjs"
```
Expected:
```
src/pages/index.astro: swapped OK
src/layouts/BaseLayout.astro: swapped OK
```
If it throws a count mismatch, STOP and report BLOCKED with the exact error.

- [ ] **Step 3: Verify no blue literals remain in src/**

```bash
grep -rn '#4d65ff\|#437ef7' src/ | wc -l
```
Expected: `0`

```bash
grep -o 'fill="#A3D346"' src/pages/index.astro | wc -l
```
Expected: `4`

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/layouts/BaseLayout.astro
git commit -m "feat: swap hardcoded blue literals for Skyrule colors

Focus ring #4d65ff -> orange #E26E00 in both shells' inline utility
blocks (documented duplicates, changed together); the 4 inline
checkmark SVG circle fills #437ef7 -> green #A3D346 (SVG presentation
attributes can't consume CSS vars). Color-only — no structural change.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Full verification pass

**Files:** none (verification only; screenshots land in `$SCRATCH`)

**Context:** Use Playwright from the npx cache at `/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` (the `5c6d8c4f...` entry lacks a browser build; the preview MCP tools are broken in this sandbox).

- [ ] **Step 1: `drivelodge.css` untouched**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
git diff HEAD~2 -- public/styles/drivelodge.css | wc -l
```
Expected: `0` (no diff across both commits of this plan)

- [ ] **Step 2: Computed-style assertions on `/` (1440×900)**

- Brand button (hero "Get in touch", the no-variant `a.button-wrap` outside the footer): `.button-content` → `backgroundColor === 'rgb(163, 211, 70)'`, `color === 'rgb(28, 42, 5)'`
- Brand hover: hover that same button, wait ~500ms (0.3s transition) → `backgroundColor === 'rgb(140, 185, 58)'`; unhover, wait, reverts to green
- Primary unaffected (the `:where()` trap): footer "Get in touch" `.button-content` → `backgroundColor === 'rgb(255, 255, 255)'` AND `color !== 'rgb(28, 42, 5)'`
- Link-style: navbar "All products" `.button-content` → `color === 'rgb(85, 112, 31)'` (computed style resolves even inside the closed dropdown)
- Checkmark SVGs: `document.querySelectorAll('circle[fill="#A3D346"]').length === 4`

- [ ] **Step 3: Focus-ring check on `/about`**

Textual: fetch the served `/about` HTML and assert it contains `outline:.125rem solid #E26E00` and zero occurrences of `#4d65ff`. Behavioral (best-effort): if `document.querySelector('[tabindex]')` exists, drive a real keyboard `Tab` until `document.activeElement` has a `tabindex` attribute, then assert its `outline-color` computes `rgb(226, 110, 0)`; if no `[tabindex]` element exists on the page, report that honestly and rely on the textual check (the rule only targets `*[tabindex]:focus-visible`).

- [ ] **Step 4: Screenshots for the user**

Full-page-width screenshots into `$SCRATCH`: `/` at the hero (buttons visible), `/` at the product cards, `/` at the footer CTAs, and `/about` (block + button). These go to the coordinator to show the user the rebrand.

- [ ] **Step 5: No console/page errors**

Collect `console` type-`error` and `pageerror` events across all pages/interactions above. Expected: none.

- [ ] **Step 6: Report**

All pass → plan complete (no commit; verification only). Any failure → triage against Tasks 1–2 before changing anything.

---

## Self-Review Notes

- **Spec coverage:** overlay primitives + token re-pointing + scoped text flip + link hover fix + literal-rule overrides (Task 1) → spec "Mechanism" §1–4. Focus ring + SVG fills (Task 2) → spec "shell edits". Verification steps 1–5 (Task 3) → spec "Verification" 1–5, including the drivelodge.css-untouched check and the `:where()`-trap proof. Out-of-scope items (logo, imagery, status dots, `#437ef700`) have no tasks, correctly.
- **No placeholders:** the full overlay CSS, the swap script, and every command with expected output are literal.
- **Name/value consistency:** hex values (`#a3d346`/`#8cb93a`/`#55701f`/`#1c2a05`/`#e26e00`) and their rgb() computed equivalents (163,211,70 / 140,185,58 / 85,112,31 / 28,42,5 / 226,110,0) cross-checked between Task 1's CSS, Task 3's assertions, and the spec table. The variant hash in the link-style overrides matches `Button.astro`'s `VARIANT_HASH.link` character-for-character.
- **Grep-count semantics double-checked:** Task 2 Step 3 uses `grep -rn | wc -l` (line count — 0 lines means 0 occurrences, safe) and `grep -o | wc -l` (occurrence count) for the 4 fills, which sit on fewer than 4 lines.
