# Cookbook design reference

What the mock implements, written down so the build can reproduce it. The source is [docs/mocks/recipe-card.html](../docs/mocks/recipe-card.html). When this file and the mock disagree, the mock wins and this file gets fixed.

Status: **matches the mock as of 2026-10-04.**

## Card anatomy

Everything about a recipe lives on one card. Only the breadcrumb sits outside it.

```
nav        breadcrumb back to the folder (Desserts)
main
  article.stack            the card and the two cards drawn behind it
    div.card
      header.card-head     h1, facts (total time, active time, yield), then tools and prep
      div.scroller         focusable scroll region
        table.recipe-table ingredients as row headers, steps as cells
      div.card-notes       step notes, notes, source
```

A hairline divides head from table and table from notes.

## Tokens

All tokens are custom properties on `:root`, named by role. No component rule holds a raw spacing, color, type size or weight.

### Spacing

One unit is 4px (`--unit: 0.25rem`). Steps are named by how related two things are.

| Token | Size | Use |
| --- | --- | --- |
| `--space-tight` | 4px | An icon and its label. A note number and its text. Lines within one step. |
| `--space-related` | 8px | Lines that belong together. The stack offset. |
| `--space-group` | 12px | Padding inside a step box. The gap between boxes and rows. |
| `--space-gutter` | 16 to 24px | Between blocks in the card. Either side of a divider. Page side padding. |
| `--space-section` | 32 to 48px | Card padding. Between the head's two columns. Between note columns. |

Rules:

- A container pads at a bigger step than the gaps between its children.
- The two fluid steps grow with the viewport using `clamp()`.

### Sizes

| Token | Size | Use |
| --- | --- | --- |
| `--size-page` | 90rem | Max page width |
| `--size-measure` | 55ch | Max line length for notes |
| `--size-target` | 44px | Minimum touch target for every link |
| `--size-row` | 48px | Height of every ingredient row in wide mode |
| `--size-pin` | 128px | Width of the pinned ingredient column in scrolling mode |
| `--size-step-min` | 88px | Minimum step column width in wide mode |
| `--size-step-max` | 176px | Maximum step column width in scrolling mode |
| `--size-step-peek` | 48px | How much of the next step shows in scrolling mode |
| `--size-gap` | 12px | Gap between table cells |
| `--size-lift` | 8px | Offset of each card in the stack |

### Type

Three layers. Rendered examples of all three are in [docs/mocks/type-specimen.html](../docs/mocks/type-specimen.html).

**1. The scale.** Eight sizes, each about 1.15 times the one before. Size-named, like Web Awesome's. Only the family styles read these.

| Token | Size |
| --- | --- |
| `--font-size-xs` | 11px |
| `--font-size-s` | 13px |
| `--font-size-m` | 15px |
| `--font-size-l` | 17px |
| `--font-size-xl` | 20px |
| `--font-size-2xl` | 23px |
| `--font-size-3xl` | 26px |
| `--font-size-4xl` | 30px |

**2. Families.** Each style is a full `font` value: weight, size, line height, face. Heading and body are the sans. Data and caption are the mono: data for content, caption for labels. Web Awesome has heading, body, caption and longform. Data replaces longform here because the mono carries primary content.

| Style | Face | Size | Weight | Leading | Used for |
| --- | --- | --- | --- | --- | --- |
| `--heading-l` | Sans | 23 to 30px | 700 | 1.05 | Recipe title |
| `--heading-m` | Sans | 20px | 700 | 1.2 | Reserved: category heading on the home page |
| `--heading-s` | Sans | 17px | 600 | 1.2 | Reserved: recipe name in a list |
| `--body-l` | Sans | 17px | 400 | 1.5 | Reserved: an intro or long notes |
| `--body-m` | Sans | 15px | 400 | 1.4 | Step text, tools and prep, notes |
| `--body-s` | Sans | 13px | 400 | 1.5 | Breadcrumb |
| `--data-l` | Mono | 15px | 400 | 1.35 | Fact numbers |
| `--data-m` | Mono | 13px | 400 | 1.35 | Ingredients, facts |
| `--data-s` | Mono | 11px | 500 | 1.4 | Step times, note markers |
| `--caption-m` | Mono | 13px | 500 | 1.4 | Reserved: a key or table header |
| `--caption-s` | Mono | 11px | 500 | 1.4 | Section and setup labels |

**3. Roles.** Components only ever use these. Each points at one family style: `--type-title`, `--type-step`, `--type-setup`, `--type-note`, `--type-crumb`, `--type-ingredient`, `--type-fact`, `--type-time`, `--type-noteref`, `--type-label`. A component sets `font: var(--type-step)` and then, where the recipe below says so, a weight and an ink.

Weights: body 400, label 500, action 600, strong 700. A light weight was dropped on 2026-10-04. It had one use.

#### The recipes

Every piece of text on the card, loudest first.

| Role | Style | Weight | Ink | Noise | Where |
| --- | --- | --- | --- | --- | --- |
| Recipe title | `heading-l` | 700 | primary | 5 | Top of the card, once per page |
| Fact number | `data-l` | 700 | primary | 4 | Under the title: total, active, yield. One size above quantities. |
| Quantity | `data-m` | 700 | primary | 4 | Start of every ingredient row |
| Step action | `body-m` | 600 | primary | 4 | First word or two of each step line |
| Step text | `body-m` | 400 | secondary | 3 | The rest of a step line |
| Setup text | `body-m` | 400 | secondary | 3 | Tools and prep values in the card head |
| Note text | `body-m` | 400 | secondary | 3 | Step notes, notes, source |
| Step time | `data-s` | 700 | primary | 3 | Bottom edge of a step box |
| Ingredient name | `data-m` | 400 | secondary | 2 | After the quantity |
| Fact word | `data-m` | 400 | secondary | 2 | After a fact number |
| Note marker | `data-s` | 500 | accent | 2 | After a step line, and beside its note |
| Section label | `caption-s`, caps, tracked | 500 | tertiary | 1 | Above each block in the card footer |
| Setup label | `caption-s`, caps, tracked | 500 | tertiary | 1 | Before tools and prep |
| Breadcrumb | `body-s` | 400 | tertiary | 1 | Above the card |

#### Noise

Noise is how loud a piece of text is, from 1 to 5. It is scored, not guessed:

- Start from size: 11px is 1, 13px is 2, 15 and 17px are 3, 20px is 4, 23px and up is 5.
- Add 1 for full-strength ink. Take 1 off for the faintest ink.
- Add 1 for weight 600 or more.
- Add 1 for the red accent.
- Nothing goes below 1. Only heading sizes can reach 5.

Changes the scoring led to, all on 2026-10-04:

- Tools and prep text dropped to secondary ink. It scored a 4, the same as quantities.
- Step times went to bold, full-strength ink. They scored a 1, the same as the breadcrumb, and a time is cooking data.
- Fact numbers went up one size to 15px mono. Level 4 held 25 items, and the three head facts were indistinguishable from the eleven quantities.
- Tried and dropped: ingredient names in full-strength ink. It made the bold quantity stand out less and the column heavier.

Notes were raised from 13px to 15px because they read as too small. If they turn out to be peripheral, that gets handled by a future cooking view, not by shrinking them.

Rules for using it:

- One level 5 per page.
- Level 4 is for the things a cook scans for: quantities, fact numbers, action words. Tools and prep text was scored a 4 by the rubric and was dropped to secondary ink for that reason.
- Levels 1 and 2 are for labels, reference and navigation.
- Capitals and letter-spacing only at level 1.
- Red never goes above level 2.
- To make something louder, first make its neighbors quieter.

### Color

Four base colors in OKLCH.

| Token | Value | |
| --- | --- | --- |
| `--paper` | `oklch(98% 0.008 90)` | Page |
| `--card` | `oklch(99.5% 0.004 90)` | Card and table |
| `--ink` | `oklch(24% 0.015 60)` | Text and every line |
| `--accent` | `oklch(52% 0.2 29)` | Note numbers, link hover, focus ring |

Everything else is ink or accent at an opacity held in an `--alpha-*` token.

| Role token | Opacity | Measured contrast |
| --- | --- | --- |
| `--text-primary` | 100% ink | 16:1 on card |
| `--text-secondary` | 82% ink | 9:1 on card |
| `--text-tertiary` | 68% ink | 5.5:1 on paper |
| `--border-container` | 34% ink | 2.1:1 (card edge, link underline) |
| `--border-divider` | 15% ink | 1.4:1 (step outline, dividers) |
| `--mark-dot` | 40% ink | leader dots |
| `--mark-stipple` | 24% ink | stipple dots |
| `--mark-line` | 8% ink | hatch lines |
| accent on card | | 6:1 |

The two border values sit below 3:1 on purpose. Brian asked for very faint structural lines, and no meaning depends on a line alone.

These were measured in the browser at the values above. Re-measure if the palette changes.

## The mark kit

| Mark | Token or selector | Meaning |
| --- | --- | --- |
| Hatch | `[data-kind="combine"]` | Hands on, combining |
| Back hatch | `[data-kind="shape"]` | Hands on: prep, shape, portion |
| Cross-hatch | `[data-kind="cook"]` | Hands on, with heat |
| Stipple | `[data-kind="wait"]` | Hands off |
| Dense stipple | `[data-kind="bake"]` | Hands off, with heat |
| Dotted leader | `.fill`, `--tx-leader-dot` | An ingredient waiting to join |
| Hairline box | `.step` border | One step |
| Ruled hairline | `.card-head::after`, `.card-notes::before` | Divider inside the card |
| Red superscript number | `.noteref` | This step has a note |
| Marker stroke | `--tx-highlight` | The note you jumped to |

Metrics: hatch lines 1px at a 9px pitch, 45 degrees. Stipple dots on a staggered 10px grid, 6px when dense. Leader dots every 6px, fitted to whole dots, sitting on the text baseline in wide mode.

**Possible spin-off.** Brian may want to pull this texture library (hatch, back hatch, cross-hatch, the stipples, leaders, the marker stroke, and the nine extra specimens in `docs/mocks/archive/04-texture-systems.html`) out into its own project. Keep the textures token-driven and free of recipe-specific selectors so that stays easy: each is one custom property plus a pitch, and nothing in them knows about tables.

Step text sits on a soft fade (`--tx-fade`) so the texture clears behind the words. A step's time sits on the bottom edge of its box, on a card-colored patch that interrupts the outline.

## Responsive behavior

The table has two modes, switched by a container query on the scroll region, not by screen width.

| Mode | When | Behavior |
| --- | --- | --- |
| Scrolling | Region narrower than 60rem | Table scrolls sideways. Ingredient column pinned, with an edge line. Quantity stacked over name. One step plus a peek of the next. Scroll snaps to steps. |
| Wide | Region 60rem or wider | Table fills the card. No pinning. Quantity and name on one line with a leader. Rows 48px. |

Page breakpoints (media queries): card padding grows at 44rem. Notes go to two columns at 48rem. The card head goes to two columns at 60rem.

Measured: at 1280px the table fits with no slack left. At 375px there is no horizontal page scroll and the first ingredient starts 331px down.

## Interaction

Everything here is CSS except keyboard movement between steps, which is one inline script. The rule is D-25: nothing requires JavaScript.

- **Step focus.** A step is focusable. When focused or targeted its edge goes to full ink. While a step is focused, other steps, leaders and unrelated ingredients drop to 45% opacity. Ingredients that feed the focused step stay at 100% through `data-steps` and one generated rule per step.
- **Hover.** Step edges darken slightly, only on devices with hover.
- **Links.** Faint underline at 0.35em. On hover: 2px, accent, 0.25em.
- **Notes.** A note number in a step links to its note. The note's number links back to the step.
- **Keyboard.** With the script: Tab enters the table once, arrows move between steps in cooking order, Home and End jump, Esc returns focus to the scroll region, and a hint line shows under the table. Without it: each step is a tab stop in markup order and there is no hint. Full behavior in D-26.
- **Motion.** Opacity, border and underline transitions run only when the user has not asked for reduced motion.

## Scripts

One, inline at the end of the page, as a module.

| Script | Adds | Without it |
| --- | --- | --- |
| Step navigation | One tab stop for the table, arrow keys, Home, End, Esc, a key hint. Drops the scroll area's tab stop when the table does not scroll. | Each step is a tab stop in markup order, and the scroll area is always one. Click and tap work. |

It finds steps by class, orders them by the number in their id, and manages which one is the tab stop. It adds no elements and changes no content. It un-hides the hint and links it to the scroll region as its description.

## Accessibility requirements

- One `h1`. Section headings are `h2`.
- Landmarks: `nav` (labelled Breadcrumb), `main`, `article` labelled by the title.
- The table is a real table with a `caption` that explains how to read it. The caption is collapsed to zero height, not removed, so screen readers still get it. (A position-based hiding class added a stray gap above the first row.) Ingredients are `th scope="row"`.
- The scroll region has `role="region"`, a label, and `tabindex="0"`.
- Every link has a 44px target, including the note numbers.
- `:focus-visible` shows a 2px accent outline on everything focusable. A review of focus states is deferred (D-27).
- A `forced-colors` block restores borders and removes textures.
- Icons are decorative and hidden from assistive tech. The text next to them carries the meaning.
- Durations use `<time datetime>` where they are a single value.

Not yet tested, and required before shipping:

- A screen reader pass on the table, with rowspans and with no column headers.
- Whether focusable step cells (`tabindex="0"` on a `td`) are acceptable, or whether the focus feature should hang off the note links only.
- Tap-to-focus on a real phone.

## SEO requirements

- `<title>`: recipe name, a separator, the site name.
- A meta description written per recipe.
- A canonical URL. The mock assumes `https://talbs.github.io/cookbook/`. Confirm the real one.
- Open Graph type, title, description and URL.
- schema.org Recipe JSON-LD with name, description, category, yield, total and prep time, tools, ingredients and steps.
- Likely: Google only shows recipe rich results when the data includes an image. The site has no images, so expect plain listings unless that changes.

The JSON-LD steps in the mock are full sentences, not the terse table text. The build needs a rule for producing them. See COOKBOOK-DATA-FORMAT.md.

## CSS architecture

```css
@layer reset, tokens, base, compositions, blocks;
```

- `reset`: box sizing, margins, list styles, table borders.
- `tokens`: every custom property, plus the `color-mix()` fallback.
- `base`: element selectors only (`body`, `h1`, `h2`, `dt`, `a`, focus ring).
- `compositions`: `.wrapper`.
- `blocks`: everything with a class.

A second small `<style data-generated="per-recipe">` holds the step focus rules, because those depend on the recipe.

The mock has about 410 lines of CSS and no comments. Every custom property that is defined is used, and every one used is defined (checked by script).

### Baseline status of what the CSS uses

| Feature | Baseline |
| --- | --- |
| Cascade layers, `:is()`, `clamp()`, `min()`, `inset`, individual `translate`, `overscroll-behavior`, `forced-colors`, `accent-color`, `text-underline-offset` | Widely available |
| `:has()`, container queries and `cqi`, `oklch()`, the `lh` unit, `color-mix()` | Widely available (2023) |
| `text-wrap: balance`, `scrollbar-width` | Newly available (2024) |
| `scrollbar-color` | Likely newly available. Cosmetic only. |
| `box-decoration-break` | Shipped with the `-webkit-` prefix alongside. Cosmetic only. |
| `alpha()` | Newly available, September 2026. Has a `color-mix()` fallback in `@supports not`. |

If a browser lacks any of the cosmetic ones, the page still reads correctly.

## What the mock borrows that the build must replace

- Fonts come from Google Fonts. Self-host two files.
- Icons come from the Font Awesome Free CDN as a webfont. Use the Eleventy plugin and a Pro kit, as inline SVG.
- The marker stroke's color is hard-coded in an inline SVG.
- The step focus rules are written by hand.
