# Button Componentization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `src/components/button/Button.astro` (semantic props → exact benchmark markup) and migrate all 18 inline button anchors (`index.astro` 9, `Navbar.astro` 5, `Hero.astro` 2, `Footer.astro` 2) to it, with rendered-DOM equivalence proven by snapshot diff.

**Architecture:** Pure presentational Astro component, no JS, no `<style>` — all styling stays in `drivelodge.css`. Props mirror Webflow's own property vocabulary (`variant`/`size`/`layout`/`icon`); the component emits the exact hash classes and `data-wf--*` attributes the benchmark uses. Migrations are scripted (regex-replace with per-button assertions), not hand-retyped, and each file's migration is verified against a pre-captured DOM baseline of the homepage (all 18 buttons render on `/`).

**Tech Stack:** Astro 7. No test framework in this repo — verification is a fetch-based DOM-normalization diff script plus live Playwright checks (the established method in this project).

**Known intentional DOM change (the only one):** `Hero.astro`'s 2 buttons currently wrap their icon SVG in a single `icon-slot`; the benchmark (verified: all 22 of its icon buttons) uses a doubled `icon-slot`. The component uses the doubled benchmark form, so Hero's migration corrects this deviation. Visually inert (`.icon-slot` is `width:100%;height:100%;padding:0`).

**Scratch location:** scripts and the baseline snapshot live in the session scratchpad: `/private/tmp/claude-501/-Users-opeyemiajagbe-Documents-Projects/a68b9f9b-b937-4408-90fb-4cad5283782f/scratchpad/` (referred to as `$SCRATCH` below — write files there with your file tools; if unavailable, any temp dir outside the repo works, but keep script and baseline together).

---

## Task 1: Create `Button.astro`, the diff script, and the baseline snapshot

**Files:**
- Create: `src/components/button/Button.astro`
- Create: `$SCRATCH/button-dom-diff.mjs` (not committed — temp verification tool)

**Context:** The dev server should already be running at `http://localhost:4321` (check `astro dev status`; if not, start with `astro dev --background` per repo CLAUDE.md). The baseline MUST be captured in this task, before any call site migrates — creating the component alone changes no rendered page. Note: this repo's environment blocks `curl`/inline-HTTP in Bash; the diff script below is a file run via `node`, which is the accepted method.

- [ ] **Step 1: Confirm current state**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
ls src/components/button/Button.astro 2>&1
```
Expected: `No such file or directory`

```bash
grep -o 'class="button-wrap[^"]*"' src/pages/index.astro src/components/nav/Navbar.astro src/components/hero/Hero.astro src/components/footer/Footer.astro | wc -l
```
Expected: `18`

- [ ] **Step 2: Write `src/components/button/Button.astro`**

Exact contents:

```astro
---
// Button — the site's shared benchmark button composite (drivelodge.co.uk).
// All styling lives in /styles/drivelodge.css; the w-variant hash classes and
// data-wf--* attributes reproduce the benchmark's Webflow variant system
// verbatim (the attributes are Designer metadata with no CSS/JS effect, kept
// so rendered DOM stays identical to the benchmark export). Each optional
// prop means "this Webflow property was explicitly set": its data-wf--*
// attribute is emitted iff the prop is provided; hash classes are added only
// where one exists (size="large", variant="brand", layout="normal" are
// attribute-only and render identically to the unset state).
// Dark/light theming comes from ancestor data-theme wrappers, not from props.
interface Props {
  href: string;
  label: string;
  variant?: 'brand' | 'primary' | 'secondary' | 'tertiary' | 'link';
  size?: 'small' | 'large';
  layout?: 'normal' | 'reversed';
  icon?: boolean;
}
const { href, label, variant, size, layout, icon = true } = Astro.props;

const VARIANT_HASH = {
  brand: '',
  primary: 'w-variant-2322bba7-d743-d5ae-17b2-3a616235fc2a',
  secondary: 'w-variant-a1ef9764-3803-38f9-aea9-55b770b8a820',
  tertiary: 'w-variant-ae85fb8f-012c-37ad-3f72-31aeb5a8a9de',
  link: 'w-variant-16fb8767-26f4-a35f-edd9-ba91eadcd66c',
} as const;
const SIZE_HASH = {
  small: 'w-variant-0fa6310e-3b03-4614-cc31-5599b3d7993a',
  large: '',
} as const;
const LAYOUT_HASH = {
  normal: '',
  reversed: 'w-variant-b2abb149-0ec9-15b2-b963-49640b0e39dc',
} as const;

const wrapClass = ['button-wrap', size && SIZE_HASH[size], 'w-inline-block'].filter(Boolean).join(' ');
const contentClass = ['button-content', variant && VARIANT_HASH[variant]].filter(Boolean).join(' ');
const layoutClass = ['button-layout', layout && LAYOUT_HASH[layout]].filter(Boolean).join(' ');
---

<a href={href} class={wrapClass} data-wf--button--size={size}><div class={contentClass} data-wf--button-style--style={variant}><div class={layoutClass} data-wf--button-layout--layout={layout}><div class="button-text">{label}</div>{icon && <div class="button-icon"><div class="icon-slot"><div class="icon-slot"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 17" fill="none"><g clip-path="url(#clip0_6401_1558)"><path d="M10.9541 3.45557L6.00455 3.49545L5.99226 5.02155L10.5927 4.98503L3.05492 12.5549L4.12551 13.6255L11.6959 6.02298L11.6583 10.6887L13.1844 10.6764L13.2249 5.72629C13.2282 5.11964 12.9913 4.5402 12.5657 4.11468C12.1402 3.68916 11.5608 3.45218 10.9541 3.45557Z" fill="currentColor"></path></g><defs><clippath id="clip0_6401_1558"><rect width="16" height="16" fill="currentColor" transform="translate(0 0.5)"></rect></clippath></defs></svg></div></div></div>}</div></div></a>
```

Notes for the implementer: Astro omits attributes whose value is `undefined`, which is exactly how the "attribute present iff prop provided" behavior works. The class arrays put the hash between the base class and `w-inline-block`, matching current markup token order exactly (the DOM diff compares class strings verbatim). Do not reformat the template onto multiple lines — that introduces whitespace text nodes.

- [ ] **Step 3: Write the diff script `$SCRATCH/button-dom-diff.mjs`**

Exact contents:

```js
// button-dom-diff.mjs — snapshot/compare all rendered button anchors on http://localhost:4321/
// usage: node button-dom-diff.mjs baseline   (capture pre-migration snapshot)
//        node button-dom-diff.mjs compare    (diff current render against snapshot)
import fs from 'node:fs';
import path from 'node:path';

const MODE = process.argv[2];
if (!['baseline', 'compare'].includes(MODE)) {
  console.error('usage: node button-dom-diff.mjs baseline|compare');
  process.exit(2);
}
const FILE = path.join(path.dirname(new URL(import.meta.url).pathname), 'button-baseline.json');

const html = await (await fetch('http://localhost:4321/')).text();
const anchors = html.match(/<a [^>]*class="[^"]*button-wrap[^"]*"[^>]*>[\s\S]*?<\/a>/g) ?? [];

// DOM-equivalence normalization:
// - strip data-astro-cid-* (Astro scoped-style artifacts; Navbar/Hero have <style>
//   blocks so their buttons carry one today, Button.astro has none)
// - per-tag: lowercase tag name, sort attributes
// - trim/collapse text nodes (two current labels have trailing whitespace)
// - collapse inter-tag whitespace
const normalize = (blob) => blob
  .replace(/\s+data-astro-cid-[a-z0-9]+(="[^"]*")?/g, '')
  .replace(/<([a-zA-Z][^\s/>]*)([^>]*?)(\/?)>/g, (_, name, attrs, selfClose) => {
    const pairs = [...attrs.matchAll(/([^\s=]+)="([^"]*)"|([^\s=/]+)/g)]
      .map((a) => (a[1] !== undefined ? `${a[1]}="${a[2]}"` : a[3]))
      .filter(Boolean)
      .sort();
    return `<${name.toLowerCase()}${pairs.length ? ' ' + pairs.join(' ') : ''}${selfClose}>`;
  })
  .replace(/>([^<]*)</g, (_, t) => `>${t.replace(/\s+/g, ' ').trim()}<`)
  .trim();

const norm = anchors.map(normalize);

if (MODE === 'baseline') {
  fs.writeFileSync(FILE, JSON.stringify(norm, null, 1));
  console.log(`baseline saved: ${norm.length} buttons -> ${FILE}`);
} else {
  const base = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`baseline ${base.length} buttons vs current ${norm.length}`);
  let diffs = 0;
  for (let i = 0; i < Math.max(base.length, norm.length); i++) {
    if (base[i] !== norm[i]) {
      diffs++;
      console.log(`\nDIFF button #${i + 1}:`);
      console.log(`  OLD: ${(base[i] ?? '(missing)').slice(0, 600)}`);
      console.log(`  NEW: ${(norm[i] ?? '(missing)').slice(0, 600)}`);
    }
  }
  console.log(diffs === 0 ? '\nALL BUTTONS IDENTICAL' : `\n${diffs} differing button(s)`);
}
```

- [ ] **Step 4: Capture the baseline (BEFORE any migration)**

```bash
node "$SCRATCH/button-dom-diff.mjs" baseline
```
Expected output: `baseline saved: 18 buttons -> .../button-baseline.json`

If the count is not 18, STOP — the page didn't render all buttons (dev server down or mid-compile). Do not proceed with a bad baseline.

- [ ] **Step 5: Confirm the component compiles**

The component isn't used by any page yet, so `/` still returning the full page proves nothing about `Button.astro` itself — instead run a type/diagnostic check:

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && npx astro check 2>&1 | tail -5
```
Expected: 0 errors (warnings/hints are acceptable; this repo has pre-existing hints). If `astro check` is not installed and prompts for a missing package, skip it — Task 2's migration + compare will exercise the component fully.

- [ ] **Step 6: Commit (component only — scratch files are not committed)**

```bash
git add src/components/button/Button.astro
git commit -m "feat: add Button.astro — shared benchmark button composite

Semantic props (variant/size/layout/icon) mapped to the exact benchmark
hash classes and data-wf--* attributes. Pure presentational, no JS, no
styles of its own — drivelodge.css keeps all styling. Call-site
migrations follow in subsequent commits.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Migrate `index.astro` (9 buttons)

**Files:**
- Modify: `src/pages/index.astro` (9 anchor replacements + 1 import)
- Create: `$SCRATCH/migrate-index-buttons.mjs` (not committed)

**Context:** The buttons are embedded inside very long single-line sections — hand-editing risks transcription errors, so the replacement is scripted with per-button text/href assertions that abort on any mismatch. Run from the repo root.

- [ ] **Step 1: Write `$SCRATCH/migrate-index-buttons.mjs`**

Exact contents:

```js
import fs from 'node:fs';

const FILE = 'src/pages/index.astro';
const EXPECTED = [
  { text: 'Find a fitter', href: '/find-a-fitter', repl: '<Button href="/find-a-fitter" label="Find a fitter" icon={false} />' },
  { text: 'View all products', href: '/products', repl: '<Button href="/products" label="View all products" variant="brand" size="small" icon={false} />' },
  { text: 'View Product', href: '/products/volkswagen-t5-t6-swb', repl: '<Button href="/products/volkswagen-t5-t6-swb" label="View Product" variant="primary" size="small" layout="normal" />' },
  { text: 'View Product', href: '/products/volkswagen-t5-t6-lwb', repl: '<Button href="/products/volkswagen-t5-t6-lwb" label="View Product" variant="primary" size="small" layout="normal" />' },
  { text: 'View Product', href: '/products/ford-transit-custom-swb', repl: '<Button href="/products/ford-transit-custom-swb" label="View Product" variant="primary" size="small" layout="normal" />' },
  { text: 'View Product', href: '/products/renault-trafic-swb', repl: '<Button href="/products/renault-trafic-swb" label="View Product" variant="primary" size="small" layout="normal" />' },
  { text: 'Our Process', href: '/about', repl: '<Button href="/about" label="Our Process" variant="brand" />' },
  { text: 'Configure', href: '/configurator', repl: '<Button href="/configurator" label="Configure" icon={false} />' },
  { text: 'Build your dream camper', href: '/configurator', repl: '<Button href="/configurator" label="Build your dream camper" icon={false} />' },
];
const IMPORT_ANCHOR = "import Footer from '../components/footer/Footer.astro';";
const IMPORT_LINE = "import Button from '../components/button/Button.astro';";

let c = fs.readFileSync(FILE, 'utf8');
let i = 0;
c = c.replace(/<a [^>]*class="button-wrap[^"]*"[^>]*>[\s\S]*?<\/a>/g, (m) => {
  const e = EXPECTED[i];
  const text = ((m.match(/button-text[^>]*>([^<]*)</) ?? [])[1] ?? '').trim();
  const href = (m.match(/href="([^"]*)"/) ?? [])[1];
  if (!e) throw new Error(`unexpected extra button #${i + 1}: "${text}" ${href}`);
  if (text !== e.text || href !== e.href) throw new Error(`mismatch at button #${i + 1}: expected "${e.text}" ${e.href}, found "${text}" ${href}`);
  i++;
  return e.repl;
});
if (i !== EXPECTED.length) throw new Error(`expected ${EXPECTED.length} buttons, replaced ${i}`);
if (!c.includes(IMPORT_ANCHOR)) throw new Error('import anchor not found');
if (c.includes(IMPORT_LINE)) throw new Error('Button import already present — script already ran?');
c = c.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + '\n' + IMPORT_LINE);
fs.writeFileSync(FILE, c);
console.log(`migrated ${i} buttons in ${FILE}`);
```

- [ ] **Step 2: Run it**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/migrate-index-buttons.mjs"
```
Expected: `migrated 9 buttons in src/pages/index.astro`

- [ ] **Step 3: Verify no inline button markup remains in this file**

```bash
grep -c 'class="button-wrap' src/pages/index.astro
```
Expected: `0`

```bash
grep -c '<Button ' src/pages/index.astro
```
Expected: `9`

- [ ] **Step 4: DOM-equivalence check**

```bash
node "$SCRATCH/button-dom-diff.mjs" compare
```
Expected: `baseline 18 buttons vs current 18` and `ALL BUTTONS IDENTICAL`. Any diff = a real regression; do not adjust the normalizer to make it pass — fix the call-site props or the component.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "refactor: migrate index.astro buttons to <Button />

All 9 inline button anchors replaced with semantic Button calls via an
assertion-guarded script. Rendered DOM verified identical against the
pre-migration baseline (18/18 buttons on the homepage).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Migrate `Navbar.astro` (5 buttons)

**Files:**
- Modify: `src/components/nav/Navbar.astro` (5 anchor replacements + 1 import)
- Create: `$SCRATCH/migrate-navbar-buttons.mjs` (not committed)

- [ ] **Step 1: Write `$SCRATCH/migrate-navbar-buttons.mjs`**

Exact contents (same machinery as Task 2, different file/expectations/anchor):

```js
import fs from 'node:fs';

const FILE = 'src/components/nav/Navbar.astro';
const EXPECTED = [
  { text: 'All products', href: '/products', repl: '<Button href="/products" label="All products" variant="link" size="small" layout="reversed" />' },
  { text: 'Contact', href: '/contact', repl: '<Button href="/contact" label="Contact" variant="secondary" size="large" layout="normal" />' },
  { text: 'Configure', href: '/configurator', repl: '<Button href="/configurator" label="Configure" variant="brand" size="large" layout="normal" />' },
  { text: 'Contact', href: '/contact', repl: '<Button href="/contact" label="Contact" variant="tertiary" size="small" layout="normal" icon={false} />' },
  { text: 'Configure', href: '/configurator', repl: '<Button href="/configurator" label="Configure" variant="brand" size="small" layout="normal" />' },
];
const IMPORT_ANCHOR = '// Depends on: /styles/drivelodge.css or style.css';
const IMPORT_LINE = "import Button from '../button/Button.astro';";

let c = fs.readFileSync(FILE, 'utf8');
let i = 0;
c = c.replace(/<a [^>]*class="button-wrap[^"]*"[^>]*>[\s\S]*?<\/a>/g, (m) => {
  const e = EXPECTED[i];
  const text = ((m.match(/button-text[^>]*>([^<]*)</) ?? [])[1] ?? '').trim();
  const href = (m.match(/href="([^"]*)"/) ?? [])[1];
  if (!e) throw new Error(`unexpected extra button #${i + 1}: "${text}" ${href}`);
  if (text !== e.text || href !== e.href) throw new Error(`mismatch at button #${i + 1}: expected "${e.text}" ${e.href}, found "${text}" ${href}`);
  i++;
  return e.repl;
});
if (i !== EXPECTED.length) throw new Error(`expected ${EXPECTED.length} buttons, replaced ${i}`);
if (!c.includes(IMPORT_ANCHOR)) throw new Error('import anchor not found');
if (c.includes(IMPORT_LINE)) throw new Error('Button import already present — script already ran?');
c = c.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + '\n' + IMPORT_LINE);
fs.writeFileSync(FILE, c);
console.log(`migrated ${i} buttons in ${FILE}`);
```

- [ ] **Step 2: Run it**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/migrate-navbar-buttons.mjs"
```
Expected: `migrated 5 buttons in src/components/nav/Navbar.astro`

- [ ] **Step 3: Verify**

```bash
grep -c 'class="button-wrap' src/components/nav/Navbar.astro
```
Expected: `0`

```bash
grep -c '<Button ' src/components/nav/Navbar.astro
```
Expected: `5`

- [ ] **Step 4: DOM-equivalence check**

```bash
node "$SCRATCH/button-dom-diff.mjs" compare
```
Expected: `ALL BUTTONS IDENTICAL` (18/18). Note the normalizer strips `data-astro-cid-*` — Navbar's buttons legitimately lose that build artifact when their markup moves into `Button.astro` (which has no `<style>`); that is why the strip exists and it is NOT a regression. Any other diff is.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/Navbar.astro
git commit -m "refactor: migrate Navbar buttons to <Button />

All 5 inline button anchors replaced with semantic Button calls.
Rendered DOM verified identical against the baseline (modulo the
data-astro-cid scoped-style artifact, stripped by the normalizer).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: Migrate `Hero.astro` (2) and `Footer.astro` (2)

**Files:**
- Modify: `src/components/hero/Hero.astro`, `src/components/footer/Footer.astro`
- Create: `$SCRATCH/migrate-hero-footer-buttons.mjs` (not committed)

**Context:** This task includes the plan's ONLY intentional DOM change: Hero's 2 buttons currently use a single `icon-slot`; the component (matching all 22 benchmark icon buttons) uses the doubled form. The compare step must show exactly 2 diffs, both on Hero's buttons, both consisting solely of that doubling.

- [ ] **Step 1: Write `$SCRATCH/migrate-hero-footer-buttons.mjs`**

Exact contents:

```js
import fs from 'node:fs';

const JOBS = [
  {
    file: 'src/components/hero/Hero.astro',
    importAnchor: '// [data-parallax-layer]), so no per-page script is duplicated here.',
    expected: [
      { text: 'Get in touch', href: '/contact', repl: '<Button href="/contact" label="Get in touch" />' },
      { text: 'Search by model', href: '/products', repl: '<Button href="/products" label="Search by model" variant="primary" size="large" />' },
    ],
  },
  {
    file: 'src/components/footer/Footer.astro',
    importAnchor: '// Depends on: /styles/drivelodge.css or style.css',
    expected: [
      { text: 'Get in touch', href: '/contact', repl: '<Button href="/contact" label="Get in touch" variant="primary" />' },
      { text: 'Configurator', href: '/configurator', repl: '<Button href="/configurator" label="Configurator" variant="secondary" />' },
    ],
  },
];
const IMPORT_LINE = "import Button from '../button/Button.astro';";

for (const job of JOBS) {
  let c = fs.readFileSync(job.file, 'utf8');
  let i = 0;
  c = c.replace(/<a [^>]*class="button-wrap[^"]*"[^>]*>[\s\S]*?<\/a>/g, (m) => {
    const e = job.expected[i];
    const text = ((m.match(/button-text[^>]*>([^<]*)</) ?? [])[1] ?? '').trim();
    const href = (m.match(/href="([^"]*)"/) ?? [])[1];
    if (!e) throw new Error(`${job.file}: unexpected extra button #${i + 1}: "${text}" ${href}`);
    if (text !== e.text || href !== e.href) throw new Error(`${job.file}: mismatch at button #${i + 1}: expected "${e.text}" ${e.href}, found "${text}" ${href}`);
    i++;
    return e.repl;
  });
  if (i !== job.expected.length) throw new Error(`${job.file}: expected ${job.expected.length} buttons, replaced ${i}`);
  if (!c.includes(job.importAnchor)) throw new Error(`${job.file}: import anchor not found`);
  if (c.includes(IMPORT_LINE)) throw new Error(`${job.file}: Button import already present — script already ran?`);
  c = c.replace(job.importAnchor, job.importAnchor + '\n' + IMPORT_LINE);
  fs.writeFileSync(job.file, c);
  console.log(`migrated ${i} buttons in ${job.file}`);
}
```

- [ ] **Step 2: Run it**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels && node "$SCRATCH/migrate-hero-footer-buttons.mjs"
```
Expected:
```
migrated 2 buttons in src/components/hero/Hero.astro
migrated 2 buttons in src/components/footer/Footer.astro
```

- [ ] **Step 3: Verify**

```bash
grep -rc 'class="button-wrap' src/ | grep -v ':0'
```
Expected: no output — zero inline button anchors remain anywhere in `src/` (the only `button-wrap` in source is now inside `Button.astro` itself, which writes it via a class array, not a `class="button-wrap` literal).

```bash
grep -c '<Button ' src/components/hero/Hero.astro src/components/footer/Footer.astro
```
Expected: `2` for each file

- [ ] **Step 4: DOM-equivalence check — expect EXACTLY 2 diffs, both the icon-slot doubling**

```bash
node "$SCRATCH/button-dom-diff.mjs" compare
```
Expected: `2 differing button(s)`, and both DIFF entries must be Hero's buttons ("Get in touch" → /contact and "Search by model" → /products), where OLD has `<div class="icon-slot"><svg` and NEW has `<div class="icon-slot"><div class="icon-slot"><svg` (plus the matching extra `</div>`), with NO other difference in either entry. Footer's 2 buttons must NOT appear as diffs. If anything else differs, that's a regression — fix it, don't rationalize it.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/Hero.astro src/components/footer/Footer.astro
git commit -m "refactor: migrate Hero and Footer buttons to <Button />

Last 4 inline button anchors replaced with semantic Button calls; no
inline button markup remains anywhere in src/. Hero's 2 buttons pick up
the benchmark's doubled icon-slot wrapper in the process — a deliberate
correction of a prior single-slot deviation (verified against all 22
benchmark icon buttons; visually inert, .icon-slot is 100%/100%/pad-0).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 5: Live verification pass

**Files:** none (verification only)

**Context:** DOM equivalence is already proven per-file; this pass confirms the real page still behaves. Use Playwright via a sandboxed Node script (the working install is the npx cache at `/Users/opeyemiajagbe/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` — the `5c6d8c4f...` cache entry lacks a browser build; don't use it).

- [ ] **Step 1: Structural + computed-style assertions on `/` (1440×900)**

Load `http://localhost:4321/` and assert:
- `document.querySelectorAll('a.button-wrap').length === 18`
- Navbar "All products" (the `link`-variant button): its `.button-layout` computes `flexDirection === 'row-reverse'` (the `reversed` layout hash working through the component)
- Footer "Get in touch" (primary under the footer's `data-theme="dark"`): its `.button-content` computes `backgroundColor === 'rgb(255, 255, 255)'` (the dark-theme primary = white finding from the earlier button investigation)
- Hero "Get in touch" icon: the `svg` inside its `.button-icon` has a bounding box of roughly 16×16px (sanity check that the doubled `icon-slot` didn't change icon geometry)

- [ ] **Step 2: Mobile check (390px)**

Resize to 390×844, click `.navbar_menu-button`, confirm the nav menu opens (`data-nav-menu-open` present) and the menu's Contact/Configure buttons (`a.button-wrap` inside `.navbar_menu`) are visible (non-zero bounding boxes).

- [ ] **Step 3: Hover check (back at 1440px)**

Hover Hero's "Search by model" (primary) and confirm its `.button-content` `backgroundColor` changes from its resting value (the `--primary-button--button-bg-hover` transition firing — exact color values don't need pinning, just "changes on hover and reverts").

- [ ] **Step 4: No console/page errors**

Collect `console` type-`error` events and `pageerror` events across Steps 1–3. Expected: none.

- [ ] **Step 5: Report**

All pass → plan complete (no commit; verification only). Any failure → triage against Tasks 1–4 before changing anything; do not patch blindly.

---

## Self-Review Notes

- **Spec coverage:** Component + API (Task 1) → spec "Component API". Migration of all 18 call sites (Tasks 2–4) → spec "Migration", with per-button props pinned from the actual `data-wf--*`/hash census rather than the spec's approximate inventory. DOM-equivalence bar incl. `data-astro-cid` stripping, trailing-whitespace label normalization, and the Hero icon-slot exception (Tasks 2–4 Step 4s) → spec "Verification" §1. Live pass (Task 5) → spec "Verification" §2–3. Out-of-scope items (form `<input>`, `button-group` wrappers, CSS changes) have no tasks, correctly.
- **No placeholders:** every script and the component are complete literal code; every command has expected output.
- **Name consistency:** `Button` import path is `../components/button/Button.astro` from `src/pages/` (Task 2) and `../button/Button.astro` from `src/components/*/` (Tasks 3–4) — both resolve to the same file created in Task 1. Prop names (`variant`/`size`/`layout`/`icon`) and their unions match between the component (Task 1) and every call site (Tasks 2–4). Hash constants in Task 1 match the census table in the spec character-for-character.
- **Grep-count reasoning double-checked** (a recurring past error source): Task 1 Step 1 counts `class="button-wrap` occurrences with `grep -o | wc -l` (occurrences, not lines) = 18 across 4 files (9/5/2/2). Task 4 Step 3 uses `grep -rc ... | grep -v ':0'` expecting empty because `Button.astro` builds its class list programmatically (`['button-wrap', ...]`) and never contains the literal `class="button-wrap` string.
