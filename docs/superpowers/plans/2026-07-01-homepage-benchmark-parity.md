# Homepage Benchmark Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/pages/index.astro` a 1:1 visual and behavioral match for the `html-benchmark` branch's `index.html` homepage.

**Architecture:** No new files or abstractions — this repo already established the pattern of inlining benchmark markup verbatim into `index.astro` with brand-name text substituted (Drivelodge → Skyrule). This plan follows that pattern: rewrite the one component that diverges (`Hero.astro`), wire it in, add the two behavior/CSS gaps found during investigation, then verify visually.

**Tech Stack:** Astro 7, static HTML/CSS ported from a Webflow export, vanilla JS (no test framework exists in this repo — verification uses grep-based structural assertions plus a visual/interaction pass via the dev server, described in Task 5).

**Note on "tests":** This is a static-content parity fix, not application logic — there is no unit test framework in this repo (`package.json` has no test script/deps) and adding one would be scope creep. Each task's "test" is a `grep` assertion that is objectively true/false before and after the change, giving the same red→green discipline without inventing infrastructure the codebase doesn't use.

---

## Task 1: Rewrite `Hero.astro` to match benchmark markup

**Files:**
- Modify: `src/components/hero/Hero.astro` (full replacement)

**Context:** The current file uses different class names than benchmark (`hero-home_header-wrap` vs benchmark's `header-wrapper`/`header-text-wrap`/`max-width-hero`), is missing the body paragraph under the H1, is missing the "Story of Skyrule" video-CTA block, is missing the `home-products_icon-wrap` arrow icon on product cards, and references image files that don't exist (`/images/hero-mountains.webp` etc.) instead of the real files already present in `public/images` (confirmed via `ls public/images/`).

- [x] **Step 1: Confirm the gap (failing check)**

Run:
```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
grep -c 'hero_text-wrap\|video-cta_lightbox\|home-products_icon-wrap\|Mountains Back v2' src/components/hero/Hero.astro
```
Expected: `0` (none of these benchmark markers exist in the current file yet)

- [x] **Step 2: Replace `src/components/hero/Hero.astro` entirely**

```astro
---
// Skyrule Hero — literal benchmark structure/classes, Skyrule brand copy,
// real asset filenames from public/images. Parallax layers are animated by
// the global GSAP script at the bottom of index.astro (targets
// [data-parallax-layer]), so no per-page script is duplicated here.
---
<header data-theme="dark" class="section_hero-home">
  <div class="parallax">
    <section class="parallax__header">
      <div class="parallax__visuals">
        <div class="parallax__black-line-overflow"></div>
        <div data-parallax-layers class="parallax__layers">
          <img width="800" data-parallax-layer="1" alt="" src="images/67864fe46913e952168c7743_Mountains Back v2.webp" loading="eager" class="parallax__layer-img hide-tablet"/>
          <img width="800" data-parallax-layer="2" alt="" src="images/67864feadafc51a78c7d9ba8_Van v2.webp" loading="eager" class="parallax__layer-img hide-tablet"/>
          <div data-parallax-layer="3" class="parallax__layer-title">
            <div class="padding-global">
              <div class="container-large">
                <div class="hero-home_content">
                  <div class="padding-section-large is-hero-home">
                    <div class="hero-home_component">
                      <div class="max-width-hero">
                        <div class="header-wrapper">
                          <div class="header-text-wrap">
                            <div class="header-top">
                              <div class="header-eyebrow-text">Skyrule - Raising the roof on standards.</div>
                              <h1 class="heading-style">High Top &amp; Elevating Roof Conversions</h1>
                            </div>
                            <div class="hero_text-wrap"><p class="body-text">We design, manufacture and install high-top and elevating roofs for camper van conversions — custom-built in the UK to fit the most popular van makes and models.</p></div>
                          </div>
                          <div class="button-group">
                            <a href="/contact" class="button-wrap w-inline-block">
                              <div class="button-content"><div class="button-layout"><div class="button-text">Get in touch</div>
                                <div class="button-icon"><div class="icon-slot"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 17" fill="none"><g clip-path="url(#clip0_6401_1558)"><path d="M10.9541 3.45557L6.00455 3.49545L5.99226 5.02155L10.5927 4.98503L3.05492 12.5549L4.12551 13.6255L11.6959 6.02298L11.6583 10.6887L13.1844 10.6764L13.2249 5.72629C13.2282 5.11964 12.9913 4.5402 12.5657 4.11468C12.1402 3.68916 11.5608 3.45218 10.9541 3.45557Z" fill="currentColor"></path></g><defs><clippath id="clip0_6401_1558"><rect width="16" height="16" fill="currentColor" transform="translate(0 0.5)"></rect></clippath></defs></svg></div></div>
                              </div></div>
                            </a>
                            <a href="/products" class="button-wrap w-inline-block">
                              <div class="button-content"><div class="button-layout"><div class="button-text">Search by model</div>
                                <div class="button-icon"><div class="icon-slot"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 17" fill="none"><g clip-path="url(#clip0_6401_1558)"><path d="M10.9541 3.45557L6.00455 3.49545L5.99226 5.02155L10.5927 4.98503L3.05492 12.5549L4.12551 13.6255L11.6959 6.02298L11.6583 10.6887L13.1844 10.6764L13.2249 5.72629C13.2282 5.11964 12.9913 4.5402 12.5657 4.11468C12.1402 3.68916 11.5608 3.45218 10.9541 3.45557Z" fill="currentColor"></path></g><defs><clippath id="clip0_6401_1558"><rect width="16" height="16" fill="currentColor" transform="translate(0 0.5)"></rect></clippath></defs></svg></div></div>
                              </div></div>
                            </a>
                          </div>
                        </div>
                      </div>
                      <div class="hero-home_video-wrapper">
                        <a href="#" class="video-cta_lightbox w-inline-block w-lightbox" data-video-url="https://www.youtube.com/watch?v=XXfufgp_Y9Q">
                          <div class="w-layout-grid video-cta_content">
                            <div class="video-cta_text-wrap">
                              <div class="text-size-regular">The Story of Skyrule</div>
                              <div class="text-size-small opacity-70">Watch Video</div>
                            </div>
                            <div class="video-cta_icon-wrap"><div class="video-cta_icon-bg"><div class="video-cta_icon w-embed"><svg width="100%" height="100%" viewBox="0 0 9 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.1577 7.15773L0.0409546 13.4849V0.830566L8.1577 7.15773Z" fill="currentcolor"/></svg></div></div></div>
                          </div>
                          <div class="video-cta_image-wrap">
                            <img sizes="100vw" srcset="images/677bc0530d77e0e618f27231_Process Hero-p-500.webp 500w, images/677bc0530d77e0e618f27231_Process Hero-p-800.webp 800w, images/677bc0530d77e0e618f27231_Process Hero-p-1080.webp 1080w, images/677bc0530d77e0e618f27231_Process Hero-p-1600.webp 1600w, images/677bc0530d77e0e618f27231_Process Hero-p-2000.webp 2000w, images/677bc0530d77e0e618f27231_Process Hero-p-2600.webp 2600w, images/677bc0530d77e0e618f27231_Process Hero.webp 2752w" alt="" loading="lazy" src="images/677bc0530d77e0e618f27231_Process Hero.webp" class="video-cta_image"/>
                            <div class="video-cta_image-overlay"></div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <img width="800" data-parallax-layer="4" alt="" src="images/67864fe9da10c464db0c1771_Rocks:Ground v2.webp" loading="eager" class="parallax__layer-img hide-tablet"/>
        </div>
        <div class="parallax__fade hide-tablet"></div>
      </div>
    </section>
    <section class="parallax__content">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-large">
            <div class="home-products_component">
              <a data-theme="dark" href="/products?roof=Elevated+Roof" class="home-products_card w-inline-block">
                <div class="home-products_content-top">
                  <div class="home-products_text-wrap">
                    <div class="home-products_header-wrap">
                      <h2 class="home-product_header">Elevated Roof</h2>
                      <div class="home-products_icon"><div>32</div></div>
                    </div>
                    <div class="home-products_body-wrap"><div class="text-size-regular">Browse our front and rear elevating roofs by make and model.</div></div>
                  </div>
                  <div class="home-products_icon-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 17" fill="none"><g clip-path="url(#clip0_6401_1558)"><path d="M10.9541 3.45557L6.00455 3.49545L5.99226 5.02155L10.5927 4.98503L3.05492 12.5549L4.12551 13.6255L11.6959 6.02298L11.6583 10.6887L13.1844 10.6764L13.2249 5.72629C13.2282 5.11964 12.9913 4.5402 12.5657 4.11468C12.1402 3.68916 11.5608 3.45218 10.9541 3.45557Z" fill="currentColor"></path></g><defs><clippath id="clip0_6401_1558"><rect width="16" height="16" fill="currentColor" transform="translate(0 0.5)"></rect></clippath></defs></svg></div>
                </div>
                <div class="home-products_image-wrap">
                  <img src="images/677ba002665a743fe16806ae_Elevated Roof.webp" loading="lazy" alt="" sizes="(max-width: 1352px) 100vw, 1352px" srcset="images/677ba002665a743fe16806ae_Elevated Roof-p-500.webp 500w, images/677ba002665a743fe16806ae_Elevated Roof-p-800.webp 800w, images/677ba002665a743fe16806ae_Elevated Roof-p-1080.webp 1080w, images/677ba002665a743fe16806ae_Elevated Roof.webp 1352w" class="home-products_image"/>
                  <div class="home-products_image-overlay"></div>
                </div>
              </a>
              <a data-theme="dark" href="/products?roof=High+Top+Roof" class="home-products_card w-inline-block">
                <div class="home-products_content-top">
                  <div class="home-products_text-wrap">
                    <div class="home-products_header-wrap">
                      <h2 class="home-product_header">High-top Roof</h2>
                      <div class="home-products_icon"><div>12</div></div>
                    </div>
                    <div class="home-products_body-wrap"><div class="text-size-regular">Browse high top roof conversions by make and model.</div></div>
                  </div>
                  <div class="home-products_icon-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 17" fill="none"><g clip-path="url(#clip0_6401_1558)"><path d="M10.9541 3.45557L6.00455 3.49545L5.99226 5.02155L10.5927 4.98503L3.05492 12.5549L4.12551 13.6255L11.6959 6.02298L11.6583 10.6887L13.1844 10.6764L13.2249 5.72629C13.2282 5.11964 12.9913 4.5402 12.5657 4.11468C12.1402 3.68916 11.5608 3.45218 10.9541 3.45557Z" fill="currentColor"></path></g><defs><clippath id="clip0_6401_1558"><rect width="16" height="16" fill="currentColor" transform="translate(0 0.5)"></rect></clippath></defs></svg></div>
                </div>
                <div class="home-products_image-wrap">
                  <img src="images/678a3c3f728be60c99b89609_High-top Roof.webp" loading="lazy" alt="" sizes="(max-width: 1352px) 100vw, 1352px" srcset="images/678a3c3f728be60c99b89609_High-top Roof-p-500.webp 500w, images/678a3c3f728be60c99b89609_High-top Roof-p-800.webp 800w, images/678a3c3f728be60c99b89609_High-top Roof-p-1080.webp 1080w, images/678a3c3f728be60c99b89609_High-top Roof.webp 1352w" class="home-products_image"/>
                  <div class="home-products_image-overlay"></div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</header>
```

- [x] **Step 3: Verify the fix**

Run:
```bash
grep -c 'hero_text-wrap\|video-cta_lightbox\|home-products_icon-wrap\|Mountains Back v2' src/components/hero/Hero.astro
```
Expected: `5` (`home-products_icon-wrap` appears twice — once per product card — the other three markers appear once each, confirming all four gaps are closed)

- [x] **Step 4: Commit**

```bash
git add src/components/hero/Hero.astro
git commit -m "fix: rewrite Hero.astro to match html-benchmark markup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Wire `Hero` into `index.astro`

**Files:**
- Modify: `src/pages/index.astro:1-5` (add import), `src/pages/index.astro:78-80` (render component)

**Context:** `index.astro` currently jumps from `<Navbar />` straight to `section_fitter-cta` — the hero component is never rendered.

- [x] **Step 1: Confirm the gap (failing check)**

Run:
```bash
grep -c "components/hero/Hero.astro'\|<Hero />" src/pages/index.astro
```
Expected: `0` (note: a plain `grep -n 'Hero'` would false-positive on existing `Process%20Hero` image filenames already in the file — use the precise pattern above)

- [x] **Step 2: Add the import**

In `src/pages/index.astro`, change:
```astro
---
// Skyrule Landing — EXACT benchmark body, zero DOM changes
// CSS loaded externally from /styles/drivelodge.css
import Navbar from '../components/nav/Navbar.astro';
---
```
to:
```astro
---
// Skyrule Landing — EXACT benchmark body, zero DOM changes
// CSS loaded externally from /styles/drivelodge.css
import Navbar from '../components/nav/Navbar.astro';
import Hero from '../components/hero/Hero.astro';
---
```

- [x] **Step 3: Render the component**

Change:
```astro
<Navbar />

<section data-theme="light" class="section_fitter-cta">
```
to:
```astro
<Navbar />

<Hero />

<section data-theme="light" class="section_fitter-cta">
```

- [x] **Step 4: Verify the fix**

Run:
```bash
grep -n 'Navbar\|<Hero\|section_fitter-cta\|section_hero-home' src/pages/index.astro
```
Expected: `import Hero` line, then `<Navbar />`, then `<Hero />`, then `section_fitter-cta` — in that line-number order (Hero's own `section_hero-home` class lives inside `Hero.astro`, not `index.astro`, so it won't show here — that's expected).

- [x] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "fix: render Hero component on homepage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Wire up video lightboxes (hero + home-video)

**Files:**
- Modify: `src/pages/index.astro` (home-video section anchor + bottom `<script>` block)

**Context:** Benchmark's two video CTAs (hero's "Story of Skyrule" and the home-video section's "Watch Video") open a modal via Webflow's lightbox runtime, which isn't loaded in this project. `Hero.astro` (Task 1) already has `data-video-url` on its anchor. This task adds the matching attribute to the home-video section's anchor (currently `href="#"` with no target) and adds a small vanilla-JS modal to actually open a YouTube embed on click, matching the two real video URLs found in the benchmark source (`XXfufgp_Y9Q` for the hero video, `mQuQNDKXfR0` for home-video).

- [x] **Step 1: Confirm the gap (failing check)**

Run:
```bash
grep -c 'data-video-url' src/pages/index.astro
```
Expected: `0`

- [x] **Step 2: Add `data-video-url` to the home-video anchor**

In `src/pages/index.astro`, find this line (in the `section_home-video` block):
```astro
<header data-theme="dark" class="section_home-video"><div class="home-video_component"><div class="home-video_lightbox-wrapper"><a href="#" class="home-video_lightbox w-inline-block w-lightbox"><div class="home-video_content">
```
Change the anchor's `href="#"` to include the video URL:
```astro
<header data-theme="dark" class="section_home-video"><div class="home-video_component"><div class="home-video_lightbox-wrapper"><a href="#" class="home-video_lightbox w-inline-block w-lightbox" data-video-url="https://www.youtube.com/watch?v=mQuQNDKXfR0"><div class="home-video_content">
```

- [x] **Step 3: Add the lightbox modal script**

In `src/pages/index.astro`, inside the existing bottom `<script>` block, after the "Mobile nav" block and before the closing `</script>` tag, add:

```javascript
// Video lightbox (hero + home-video "Watch Video" triggers)
function getYouTubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function openVideoLightbox(url) {
  const videoId = getYouTubeId(url);
  if (!videoId) return;

  const overlay = document.createElement("div");
  overlay.className = "video-lightbox-overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:2rem;";

  const iframeWrap = document.createElement("div");
  iframeWrap.style.cssText = "position:relative;width:100%;max-width:960px;aspect-ratio:16/9;";
  iframeWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" style="width:100%;height:100%;border:0;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;

  overlay.appendChild(iframeWrap);
  document.body.appendChild(overlay);

  function closeLightbox() {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
  }
  function onKeydown(e) {
    if (e.key === "Escape") closeLightbox();
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });
  document.addEventListener("keydown", onKeydown);
}

document.querySelectorAll("[data-video-url]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    openVideoLightbox(trigger.getAttribute("data-video-url"));
  });
});
```

- [x] **Step 4: Verify the fix**

Run:
```bash
grep -c 'data-video-url' src/pages/index.astro
grep -c 'openVideoLightbox' src/pages/index.astro
```
Expected: `3` for `data-video-url` (the home-video anchor's attribute, the `querySelectorAll("[data-video-url]")` selector string, and the `trigger.getAttribute("data-video-url")` call — three separate lines) and `2` for `openVideoLightbox` (function definition + call site).

- [x] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: wire up video lightbox for hero and home-video CTAs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Add missing fluid root font-size scaling

**Files:**
- Modify: `src/pages/index.astro:36-42` (head `<style>` blocks)

**Context:** Diffing benchmark `style.css` (240,956 bytes) against `public/styles/drivelodge.css` (214,151 bytes) showed the gap is almost entirely explained already (Swiper/Lenis CSS loaded via CDN links, several blocks already duplicated inline in `index.astro`/`Hero.astro`). The one genuine, unaccounted-for gap: benchmark's root `html { font-size }` fluid scaling rule, which makes every `rem`-based size on the page scale with viewport width. It's absent from both `drivelodge.css` and `global.css`. Astro scopes `<style>` blocks per-page by default, so adding it as a page-local `<style>` in `index.astro` (next to the other "Page-Specific" blocks already there) won't leak into other pages that use a different, fixed rem scale in `global.css`.

- [x] **Step 1: Confirm the gap (failing check)**

Run:
```bash
grep -c 'html { font-size' src/pages/index.astro
```
Expected: `0`

- [x] **Step 2: Add the rule**

In `src/pages/index.astro`, find:
```astro
<!-- Page-specific CSS from benchmark -->
<style>
@media (min-width:992px) {
  html.w-mod-js:not(.w-mod-ix) [data-w-id="d78fcd4d-9e32-d46a-c58c-1fd11d11f6f8"] {background-color:rgb(234,238,241);}
  html.w-mod-js:not(.w-mod-ix) [data-w-id="d78fcd4d-9e32-d46a-c58c-1fd11d11f6fe"] {transform:translate3d(0,0,0) scale3d(1,1,1) rotateX(0) rotateY(0) rotateZ(0) skew(0,0);}
}
</style>
```
Add a new `<style>` block directly after it:
```astro
<!-- Page-specific CSS from benchmark -->
<style>
@media (min-width:992px) {
  html.w-mod-js:not(.w-mod-ix) [data-w-id="d78fcd4d-9e32-d46a-c58c-1fd11d11f6f8"] {background-color:rgb(234,238,241);}
  html.w-mod-js:not(.w-mod-ix) [data-w-id="d78fcd4d-9e32-d46a-c58c-1fd11d11f6fe"] {transform:translate3d(0,0,0) scale3d(1,1,1) rotateX(0) rotateY(0) rotateZ(0) skew(0,0);}
}
</style>

<!-- Fluid root font-size scaling (from benchmark, missing from drivelodge.css) -->
<style>
html { font-size: 1.125rem; }
@media screen and (max-width:1920px) { html { font-size: calc(0.625rem + 0.41666666666666674vw); } }
@media screen and (max-width:1440px) { html { font-size: calc(0.5991091314031181rem + 0.4454342984409799vw); } }
@media screen and (max-width:991px) { html { font-size: calc(0.758056640625rem + 0.390625vw); } }
@media screen and (max-width:479px) { html { font-size: calc(0.7494769874476988rem + 0.8368200836820083vw); } }
</style>
```

- [x] **Step 3: Verify the fix**

Run:
```bash
grep -c 'html { font-size' src/pages/index.astro
```
Expected: `5` (base rule + 4 media-query overrides)

- [x] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "fix: add missing fluid root font-size scaling from benchmark

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Full visual + interaction verification pass

**Files:** none (verification only — fixes for anything found here become follow-up tasks, not blind edits)

**Context:** Tasks 1-4 closed every gap found during investigation. This task confirms the rendered result actually matches, both visually and behaviorally, per the "full behavior parity" scope agreed on.

- [x] **Step 1: Serve the benchmark branch statically for comparison**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
git worktree add /tmp/skyrule-benchmark origin/html-benchmark
cd /tmp/skyrule-benchmark && npx --yes serve -l 5050 .
```
Expected: benchmark page now reachable at `http://localhost:5050`

- [x] **Step 2: Confirm the Astro dev server is running**

Run (from the main repo):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321
```
Expected: `200`. If not running, start it with `npm run dev` (background) as done earlier in this session.

- [x] **Step 3: Screenshot comparison at 3 breakpoints**

Using the preview browser tooling available in your environment (or `npx playwright screenshot <url> <file>` as a fallback if the preview tool's server-start step fails), capture both `http://localhost:4321` and `http://localhost:5050` at:
- Desktop: 1440x900
- Tablet: 768x1024
- Mobile: 375x812

Compare section by section in this order: navbar, hero (parallax layers + product cards), fitter-cta, featured (carousel), home-about, config-cta, home-video, build-cta, contact-cta, footer. Note any visual drift (spacing, image crop/sizing, font size, color) as a follow-up item — do not silently patch without confirming against the benchmark markup first.

- [x] **Step 4: Interaction checks**

On `http://localhost:4321`:
1. Scroll past the hero — mountains/van/rocks parallax layers should move at different rates (GSAP `ScrollTrigger` targeting `.section_hero-home`).
2. Click the hero "Watch Video" ("The Story of Skyrule") — a modal should open playing `XXfufgp_Y9Q`.
3. Click "Watch Video" in the `section_home-video` block — a modal should open playing `mQuQNDKXfR0`.
4. Press `Escape` or click the modal backdrop — it should close.
5. In the `section_featured` product carousel, click the next/prev arrows — slides should advance; verify `disabled` state on the prev arrow at the start.
6. Resize to a mobile width and click the nav hamburger — the menu should open/close.

- [x] **Step 5: Clean up the benchmark worktree**

```bash
cd /Users/opeyemiajagbe/Documents/Projects/skyrule-travels
git worktree remove /tmp/skyrule-benchmark
```

- [x] **Step 6: Final commit (if Step 3/4 surfaced fixes)**

Only if drift was found and fixed:
```bash
git add -A
git commit -m "fix: address visual/interaction drift found in benchmark parity pass

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
If no drift was found, no commit is needed for this task — the plan is complete after Task 4's commit.

---

## Self-Review Notes

- **Spec coverage:** P0 (Hero) → Tasks 1-2. P1 (CSS parity) → Task 4 (only genuine gap found after investigation; the rest was already covered by CDN links or existing inline blocks — noted in Task 4's context so the next engineer doesn't re-diff from scratch). P1 (interactive behavior / lightbox) → Task 3. P2 (full section-by-section visual diff) → Task 5.
- **No placeholders:** every step has literal file paths, literal code, and literal expected command output.
- **Type/name consistency:** `data-video-url` attribute name and `openVideoLightbox`/`getYouTubeId` function names are used consistently between Task 1 (Hero anchor) and Task 3 (home-video anchor + script).
