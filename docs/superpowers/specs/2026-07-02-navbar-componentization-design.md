# Navbar Componentization — Design

## Goal

Make `src/components/nav/Navbar.astro` a fully self-contained component — markup, styling, and behavior all in one place — so it can be reused on other pages later with zero missing pieces. This is step one of a larger effort (raised separately) to bring the rest of the site's pages in line with the homepage's real design system; that broader work is explicitly out of scope here.

## Background

`Navbar.astro` is already imported into `src/pages/index.astro` and renders correctly there, but two pieces of its actual behavior currently live in `index.astro`'s own bottom `<script>`/`<head>` `<style>` blocks instead of inside the component itself:

1. **Mobile nav toggle** — a click handler on `.navbar_menu-button` that toggles the `data-nav-menu-open` attribute on `.navbar_menu` and the `w--open` class on the button.
2. **Scroll-blur effect** — a scroll listener toggling `.is-scrolled` on `.navbar_component`, plus the CSS that transitions `.navbar_background` from transparent to `rgba(0,0,0,0.8)` with a 12px backdrop blur.

Both are plain vanilla JS/CSS with no GSAP or other dependency. If another page imported `<Navbar />` today, it would render with correct markup and styling from `drivelodge.css`, but the mobile menu wouldn't open and the scroll effect wouldn't fire — because that behavior isn't attached to the component.

## Approach

Move both blocks (the two `<script>` snippets and the one `<style>` block) out of `index.astro` and into `Navbar.astro`'s own `<script>`/`<style>` tags. This is a straight relocation, not a rewrite — the code doesn't change, only where it lives.

Astro scopes `<style>` blocks per component render, so a scoped `<style>` in `Navbar.astro` targeting `.navbar_background`/`.navbar_component` applies correctly, since those are elements `Navbar.astro` itself renders.

`index.astro` loses these blocks entirely (not replaced with anything — `<Navbar />` already renders the component, so the behavior isn't lost, just relocated). No other file changes.

## Out of Scope

- Extracting a `Footer.astro` component
- Wiring `Navbar`/`Footer` into `BaseLayout.astro`
- Applying the navbar to `about.astro` or any other page
- Removing `global.css` or any other cleanup on `BaseLayout.astro`

These are true follow-ups, not deferred parts of this task — each gets its own scoped pass later.

## Verification

Regression-focused, since the goal is byte-for-byte identical behavior on the homepage after the move:

1. Live homepage check: mobile hamburger still opens/closes the nav menu.
2. Live homepage check: scroll-blur effect still transitions `.navbar_background` to `rgba(0,0,0,0.8)` + 12px blur past the 100px scroll threshold, and reverts when scrolling back to top.
3. No console/page errors.
4. No visual diff on the homepage versus current state (screenshot comparison).
