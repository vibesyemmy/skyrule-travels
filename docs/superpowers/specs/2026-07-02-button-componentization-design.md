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

All 13 button icons across the site are one identical arrow SVG (path fingerprint `M10.9541 3.45557L6.00455 3.49545...`, viewBox `0 0 16 17`, `fill="currentColor"`, clip-path id `clip0_6401_1558`) — so the icon lives inside the component behind a boolean, no slot needed. The benchmark wraps the SVG in a **doubled** `icon-slot` (`button-icon > icon-slot > icon-slot > svg` — all 22 benchmark icon buttons have this); 11 of the 13 current icons match, but `Hero.astro`'s 2 buttons deviate with a single `icon-slot`. The component uses the doubled benchmark form, so migrating Hero **corrects** this deviation (visually inert: `.icon-slot` is `width:100%;height:100%;padding:0`) — an expected, documented DOM change.

The markup also carries `data-wf--*` attributes (`data-wf--button--size` on wrap, `data-wf--button-style--style` on content, `data-wf--button-layout--layout` on layout). These are Webflow Designer metadata with zero CSS/JS effect (the only `[data-wf` selectors in `drivelodge.css` are `[data-wf-focus-visible]` on unrelated filter-slider components), but the component reproduces them verbatim so the rendered-DOM diff stays strictly zero-tolerance. Notably, some values exist only as attributes with no hash class: `size="large"`, `style="brand"`, and `layout="normal"` all render identically to the unset state.

Dark/light theming is applied by ancestor `data-theme` wrappers in page markup (they swap the custom-property values the variant classes consume). The button itself carries no theme — so theme is **not** a component prop, and the wrappers stay where they are.

## Component API

New file: `src/components/button/Button.astro`. Pure presentational, no JS, no `<style>` (all styling is `drivelodge.css`).

The props mirror Webflow's own property vocabulary 1:1 (pinned from the 18 call sites' actual `data-wf--*` values), so each optional prop means "this Webflow property was explicitly set": the matching `data-wf--*` attribute is emitted iff the prop is provided, and the hash class is added only where one exists.

| Prop | Type | Default | Renders as |
|---|---|---|---|
| `href` | `string` (required) | — | `<a href>` |
| `label` | `string` (required) | — | `button-text` content (all 18 existing buttons are plain text) |
| `variant` | `'brand' \| 'primary' \| 'secondary' \| 'tertiary' \| 'link'` (optional) | *(unset — no attr, base style)* | `data-wf--button-style--style={variant}` on content; content hash for primary/secondary/tertiary/link (`brand` = attr only, renders as base) |
| `size` | `'small' \| 'large'` (optional) | *(unset — no attr)* | `data-wf--button--size={size}` on wrap; wrap hash for `small` (`large` = attr only, renders as unset) |
| `layout` | `'normal' \| 'reversed'` (optional) | *(unset — no attr)* | `data-wf--button-layout--layout={layout}` on layout; layout hash for `reversed` (`normal` = attr only). Replaces the draft's `iconLeading` boolean — `reversed` is confirmed on anchor #10, Navbar's "All products" |
| `icon` | `boolean` | `true` | the shared arrow SVG in the doubled `button-icon > icon-slot > icon-slot` benchmark form (13 of 18 buttons have an icon — house style) |

The component maps semantic names → exact hash classes and `data-wf--*` attributes internally; call sites never see a hash.

## Migration

All 18 anchors convert to `<Button ... />` calls, per the signature census:

- `index.astro` (9): Find a fitter / Configure / Build your dream camper (default, no icon); View all products (small, no icon); 4× View Product (small + primary + icon); Our Process (default + icon)
- `Navbar.astro` (5): Configure ×2 (brand; one small, one large, both icon); All products (small + link + reversed layout + icon); Contact (secondary + large + icon); Contact (small + tertiary, no icon)
- `Hero.astro` (2): Get in touch (default + icon); Search by model (primary + icon)
- `Footer.astro` (2): Get in touch (primary + icon); Configurator (secondary + icon)

(The implementation plan will pin each call site's exact prop set from the file contents at migration time — the census above is the inventory, not the source of truth.)

## Out of Scope

- The contact form's `<input class="button max-width-full w-button">` submit — a different Webflow element (an `<input>` cannot contain the nested divs); stays as-is.
- The `button-group` flex wrappers (incl. `is-footer`, `hide-tablet` modifiers) — layout containers, not buttons; stay as plain markup.
- Any change to `drivelodge.css`, the theme wrappers, or button visual design.
- Non-anchor buttons for future pages (e.g., `<button type="submit">`) — YAGNI until a real page needs one.

## Verification

1. **DOM-equivalence diff:** all 18 buttons render on `/` (index 9 + Navbar 5 + Hero 2 + Footer 2), so one baseline snapshot of the rendered homepage covers the whole inventory. Extract every `a.button-wrap` element before migration and after each file's migration; compare tag structure, sorted attributes, and class lists. Normalization strips `data-astro-cid-*` attributes (Astro scoped-style build artifacts — Navbar/Hero have `<style>` blocks so their buttons carry one today; `Button.astro` has no `<style>`, so they drop it) and trims text nodes (two current labels carry trailing whitespace). Expected result: zero diffs everywhere except Hero's 2 buttons, whose only diff must be the benchmark-corrective `icon-slot` doubling. DOM-equivalence is the bar (Astro reformats whitespace, so byte-identical HTML is not).
2. **Live interaction pass:** hover states on each variant, navbar buttons at 390px mobile width, footer CTA rendering under its `data-theme="dark"` wrapper.
3. **No console/page errors** on any checked page.
