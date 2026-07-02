# Navbar Componentization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/components/nav/Navbar.astro` fully self-contained (markup + styling + behavior) by relocating its mobile-nav-toggle script and scroll-blur-effect script/CSS out of `src/pages/index.astro` and into the component itself, with zero behavior change on the homepage.

**Architecture:** Straight code relocation, not a rewrite. Two blocks move from `index.astro` into `Navbar.astro`: a `<style>` block (scroll-effect CSS) goes right after `Navbar.astro`'s frontmatter, and a `<script>` block (mobile toggle + scroll effect JS, both plain vanilla JS) goes at the end of the file. `index.astro` loses the now-duplicated blocks entirely — no replacement needed there, since `<Navbar />` is already imported and rendered.

**Tech Stack:** Astro 7 component-scoped `<style>`/`<script>` tags. No test framework in this repo — verification is grep-based structural assertions plus a live regression check (the same method used throughout this project's other fixes).

---

## Task 1: Relocate scroll-effect CSS and JS, and mobile-nav JS, into Navbar.astro

**Files:**
- Modify: `src/components/nav/Navbar.astro` (add `<style>` after frontmatter, add `<script>` at end of file)
- Modify: `src/pages/index.astro:54-68` (remove style block), `src/pages/index.astro:227-251` (remove script blocks)

**Context:** `index.astro` currently has a `<style is:global>` block (lines 56-67) controlling `.navbar_background`'s scroll-triggered background/blur, and two `<script is:inline>` blocks (lines 228-238 and 240-251) handling the scroll-triggered class toggle and the mobile hamburger click handler, respectively. All three belong conceptually to `Navbar.astro`, not the page.

- [ ] **Step 1: Confirm current state (baseline check)**

Run:
```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -c 'is-scrolled\|navbar_menu-button' src/components/nav/Navbar.astro
```
Expected: `0` (Navbar.astro doesn't have this logic yet)

```bash
grep -c 'is-scrolled\|navbar_menu-button' src/pages/index.astro
```
Expected: a nonzero count (currently lives here)

- [ ] **Step 2: Remove the scroll-effect `<style>` block from `index.astro`**

Find and delete this exact block from `src/pages/index.astro` (it sits right before the closing `</head>` tag):
```astro
<!-- Navbar scroll effect: 80% black + blur backdrop once scrolled past the top -->
<style is:global>
.navbar_background {
  background-color: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  transition: background-color 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease;
}
.navbar_component.is-scrolled .navbar_background {
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>

```
(Leave the fluid-font-size `<style>` block immediately above it untouched — only remove the navbar-scroll-effect block shown above.)

- [ ] **Step 3: Remove the scroll-effect and mobile-nav `<script>` blocks from `index.astro`**

Find and delete this exact block from `src/pages/index.astro`'s bottom `<script is:inline>` tag (it sits between the Swiper init block above it and the video-lightbox block below it):
```javascript
// Navbar scroll effect (matches benchmark's scroll trigger threshold: 100px)
(() => {
  const navbarComponent = document.querySelector(".navbar_component");
  if (!navbarComponent) return;
  const SCROLL_THRESHOLD = 100;
  const updateScrolledState = () => {
    navbarComponent.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
  };
  updateScrolledState();
  window.addEventListener("scroll", updateScrolledState, { passive: true });
})();

// Mobile nav
document.querySelector(".navbar_menu-button")?.addEventListener("click", function() {
  const menu = document.querySelector(".navbar_menu");
  if (menu) {
    if (menu.hasAttribute("data-nav-menu-open")) {
      menu.removeAttribute("data-nav-menu-open");
    } else {
      menu.setAttribute("data-nav-menu-open", "");
    }
  }
  this.classList.toggle("w--open");
});

```
Do not remove the blank line structure around the surrounding blocks (the Swiper init block above and the video-lightbox block below) — only delete the two blocks shown above, in one contiguous cut.

- [ ] **Step 4: Verify removal from `index.astro`**

Run:
```bash
grep -c 'is-scrolled\|navbar_menu-button' src/pages/index.astro
```
Expected: `0`

- [ ] **Step 5: Add the `<style>` block to `Navbar.astro`**

In `src/components/nav/Navbar.astro`, change the frontmatter from:
```astro
---
// Navbar — exact benchmark markup from drivelodge.co.uk
// Depends on: /styles/drivelodge.css or style.css
---

<div data-animation="default" class="navbar_component w-nav" ...>
```
to:
```astro
---
// Navbar — exact benchmark markup from drivelodge.co.uk
// Depends on: /styles/drivelodge.css or style.css
---

<style>
.navbar_background {
  background-color: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  transition: background-color 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease;
}
.navbar_component.is-scrolled .navbar_background {
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>

<div data-animation="default" class="navbar_component w-nav" ...>
```
(Only the frontmatter comment and the new `<style>` block are added — leave the rest of the file, including the exact `<div data-animation=...>` markup, untouched. Note: no `is:global` here, unlike the page-level style blocks in `index.astro` — this one is fully local to the elements `Navbar.astro` itself renders, so Astro's default component-scoping is correct and preferred.)

- [ ] **Step 6: Add the `<script>` block to the end of `Navbar.astro`**

Append this to the very end of `src/components/nav/Navbar.astro` (after the last closing `</div>`):
```astro

<script>
// Navbar scroll effect (matches benchmark's scroll trigger threshold: 100px)
(() => {
  const navbarComponent = document.querySelector(".navbar_component");
  if (!navbarComponent) return;
  const SCROLL_THRESHOLD = 100;
  const updateScrolledState = () => {
    navbarComponent.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
  };
  updateScrolledState();
  window.addEventListener("scroll", updateScrolledState, { passive: true });
})();

// Mobile nav
document.querySelector(".navbar_menu-button")?.addEventListener("click", function() {
  const menu = document.querySelector(".navbar_menu");
  if (menu) {
    if (menu.hasAttribute("data-nav-menu-open")) {
      menu.removeAttribute("data-nav-menu-open");
    } else {
      menu.setAttribute("data-nav-menu-open", "");
    }
  }
  this.classList.toggle("w--open");
});
</script>
```
(No `is:inline` needed — Astro processes same-file `<script>` tags as ES modules by default, which is fine here since this script is self-contained and doesn't depend on any global variable from another script, unlike the CDN-loaded UMD libraries in `index.astro` that needed `is:inline`.)

- [ ] **Step 7: Verify the move**

Run:
```bash
grep -c 'is-scrolled\|navbar_menu-button' src/components/nav/Navbar.astro
```
Expected: `3` (1 in the style block's `.navbar_component.is-scrolled` selector, 1 in the script's `classList.toggle("is-scrolled", ...)` line, 1 in the script's `querySelector(".navbar_menu-button")` line)

```bash
grep -c 'is-scrolled\|navbar_menu-button' src/pages/index.astro
```
Expected: `0`

- [ ] **Step 8: Confirm the dev server compiles**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321
```
Expected: `200`. If a dev server isn't running, start one first with `npm run dev` (background) from the repo root.

- [ ] **Step 9: Commit**

```bash
git add src/components/nav/Navbar.astro src/pages/index.astro
git commit -m "refactor: componentize Navbar's scroll effect and mobile-nav behavior

Moves the scroll-blur-effect CSS/JS and the mobile-nav-toggle JS out of
index.astro and into Navbar.astro itself, so the component is fully
self-contained (markup + styling + behavior) and ready to reuse on
other pages without missing pieces. Pure relocation — no logic changes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Regression verification on the homepage

**Files:** none (verification only)

**Context:** The whole point of a pure relocation is that the homepage behaves identically afterward. This task proves that, live, rather than assuming it from the code diff alone.

- [ ] **Step 1: Verify the mobile nav toggle still works**

Using whatever browser automation tooling is available (Playwright via sandbox execution, or an equivalent), load `http://localhost:4321` at a narrow viewport (e.g. 390px wide), click `.navbar_menu-button`, and confirm `.navbar_menu` gains the `data-nav-menu-open` attribute and the button gains the `w--open` class. Click again and confirm both revert.

- [ ] **Step 2: Verify the scroll-blur effect still works**

On the same page at a desktop viewport (e.g. 1440px), read `getComputedStyle(document.querySelector('.navbar_background'))` at scroll position 0 (expect `background-color: rgba(0, 0, 0, 0)` and `backdrop-filter: blur(0px)`), then scroll to `window.scrollY = 300` and re-read (expect `background-color: rgba(0, 0, 0, 0.8)` and `backdrop-filter: blur(12px)`). Scroll back to 0 and confirm it reverts.

- [ ] **Step 3: Confirm no console/page errors**

While performing steps 1-2, capture browser console output and page errors. Expected: empty (no errors).

- [ ] **Step 4: Visual screenshot comparison**

Screenshot the homepage at the top of the page and again after scrolling past 300px. Confirm both look identical to the navbar behavior already verified in this project's prior session (transparent at top, dark blurred bar once scrolled) — this is a regression check, not a new feature, so there should be zero visible difference from before this refactor.

- [ ] **Step 5: Report result**

If all four checks pass, the task is complete — no commit needed for this task (verification only). If anything fails, do not patch blindly: return to Task 1 and check which step introduced the discrepancy before making any further changes.

---

## Self-Review Notes

- **Spec coverage:** The spec's only requirement — relocate the two behaviors into `Navbar.astro`, verify zero homepage regression — is covered by Task 1 (the move) and Task 2 (the verification). Out-of-scope items from the spec (Footer extraction, BaseLayout wiring, applying Navbar to other pages) have no tasks here, correctly, since they're explicitly deferred.
- **No placeholders:** every step has literal file paths, literal code blocks, and literal expected command output.
- **Type/name consistency:** `is-scrolled` class name, `SCROLL_THRESHOLD` constant, and `navbar_menu-button`/`navbar_menu`/`data-nav-menu-open` selectors are used identically between the removal step (Task 1, Steps 2-3) and the addition step (Task 1, Steps 5-6) — verified by copying the exact same code blocks rather than retyping them.
