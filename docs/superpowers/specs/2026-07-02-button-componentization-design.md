# Button Componentization — Design

## Goal

Extract the site's repeated inline button markup into a single reusable `src/components/button/Button.astro` with a semantic props API, and migrate all 18 existing button call sites (`index.astro`: 9, `Navbar.astro`: 5, `Hero.astro`: 2, `Footer.astro`: 2) to it. Rendered DOM stays identical — this is a relocation behind a clean interface, not a redesign. `drivelodge.css` is not modified.

## Background

Confirmed via direct extraction and CSS decoding: every button on the site is the same 4-level composite, styled entirely by `drivelodge.css`:

```html
<a href="..." class="button-wrap [SIZE-HASH] w-inline-block">
  <div class="button-content [VARIANT-HASH]">
    <div class="button-layout [LAYOUT-HASH]">
      <div class="button-text">LABEL</div>
      <!-- optional: -->
      <div class="button-icon"><div class="icon-slot"><svg .../></div></div>
    </div>
  </div>
</a>
```

The Webflow variant hashes decode to exactly these semantics (verified against `drivelodge.css` rules):

| Level | Hash class | Meaning |
|---|---|---|
| `button-content` | *(none)* | **default** — solid brand blue (base `.button-content` rule) |
| `button-content` | `w-variant-2322bba7-d743-d5ae-17b2-3a616235fc2a` | **primary** — `--primary-button--*` custom properties (black by default; white under `data-theme="dark"` ancestors) |
| `button-content` | `w-variant-a1ef9764-3803-38f9-aea9-55b770b8a820` | **secondary** — `--secondary-button--*` |
| `button-content` | `w-variant-ae85fb8f-012c-37ad-3f72-31aeb5a8a9de` | **tertiary** — `--tertiary-button--*` |
| `button-content` | `w-variant-16fb8767-26f4-a35f-edd9-ba91eadcd66c` | **link** — transparent, brand-blue text, no padding/radius |
| `button-wrap` | `w-variant-0fa6310e-3b03-4614-cc31-5599b3d7993a` | **small** — `font-size: .8rem` |
| `button-layout` | `w-variant-b2abb149-0ec9-15b2-b963-49640b0e39dc` | **icon-leading** — `flex-flow: row-reverse`, `.5em` gap |

All 13 button icons across the site are one identical arrow SVG (path fingerprint `M10.9541 3.45557L6.00455 3.49545...`, viewBox `0 0 16 17`, `fill="currentColor"`, clip-path id `clip0_6401_1558`) — so the icon lives inside the component behind a boolean, no slot needed.

Dark/light theming is applied by ancestor `data-theme` wrappers in page markup (they swap the custom-property values the variant classes consume). The button itself carries no theme — so theme is **not** a component prop, and the wrappers stay where they are.

## Component API

New file: `src/components/button/Button.astro`. Pure presentational, no JS, no `<style>` (all styling is `drivelodge.css`).

| Prop | Type | Default | Renders as |
|---|---|---|---|
| `href` | `string` (required) | — | `<a href>` |
| `label` | `string` (required) | — | `button-text` content (all 18 existing buttons are plain text) |
| `variant` | `'default' \| 'primary' \| 'secondary' \| 'tertiary' \| 'link'` | `'default'` | content-level hash per table above (`'default'` adds none) |
| `size` | `'default' \| 'small'` | `'default'` | wrap-level hash (`'default'` adds none) |
| `icon` | `boolean` | `true` | the shared arrow SVG in `button-icon`/`icon-slot` (13 of 18 buttons have it — house style) |
| `iconLeading` | `boolean` | `false` | layout-level hash — `drivelodge.css` has exactly one use in `Navbar.astro`, but whether it sits on one of the 18 anchors must be pinned at plan time; if it turns out not to, drop this prop (YAGNI) |

The component maps semantic names → exact hash classes internally; call sites never see a hash.

## Migration

All 18 anchors convert to `<Button ... />` calls, per the signature census:

- `index.astro` (9): Find a fitter / Configure / Build your dream camper (default, no icon); View all products (small, no icon); 4× View Product (small + primary + icon); Our Process (default + icon)
- `Navbar.astro` (5): Configure ×2 (one small, one default, both icon); All products (small + link + icon); Contact (secondary + icon); Contact (small + tertiary, no icon)
- `Hero.astro` (2): Get in touch (default + icon); Search by model (primary + icon)
- `Footer.astro` (2): Get in touch (primary + icon); Configurator (secondary + icon)

(The implementation plan will pin each call site's exact prop set from the file contents at migration time — the census above is the inventory, not the source of truth.)

## Out of Scope

- The contact form's `<input class="button max-width-full w-button">` submit — a different Webflow element (an `<input>` cannot contain the nested divs); stays as-is.
- The `button-group` flex wrappers (incl. `is-footer`, `hide-tablet` modifiers) — layout containers, not buttons; stay as plain markup.
- Any change to `drivelodge.css`, the theme wrappers, or button visual design.
- Non-anchor buttons for future pages (e.g., `<button type="submit">`) — YAGNI until a real page needs one.

## Verification

1. **DOM-equivalence diff per page:** render each affected route (`/`, `/about` for Navbar/Footer via BaseLayout) before and after migration; extract every `a.button-wrap` element and compare tag structure, attributes, and class lists. DOM-equivalence is the bar (Astro reformats whitespace, so byte-identical HTML is not).
2. **Live interaction pass:** hover states on each variant, navbar buttons at 390px mobile width, footer CTA rendering under its `data-theme="dark"` wrapper.
3. **No console/page errors** on any checked page.
