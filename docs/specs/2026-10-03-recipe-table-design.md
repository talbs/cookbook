# Recipe table design

Date: 2026-10-03. Status: **superseded on 2026-10-04 by the notes in `/plan`.** Kept for history. The visual direction, the card structure, the step kinds and several field names changed after this was written. Start at `plan/README.md`.

The reference mock is `docs/mocks/recipe-card.html`. Open it in a browser at phone width and at desktop width. Earlier rounds are in `docs/mocks/archive/`.

## Goal

Turn this repo into a small static site where each recipe renders as a recipe table: ingredients as rows, steps as columns, and each step spanning the rows it combines. The format comes from Cooking for Engineers. The look borrows from recipetables.com, print cookbooks, and old lab notebooks.

The site is built with Build Awesome (Eleventy) and uses Font Awesome for icons. It deploys to GitHub Pages.

## Scope

In:

- One recipe table per recipe, generated at build time.
- One page per recipe and a plain index page grouped by folder.
- One visual theme.
- A print stylesheet.
- schema.org Recipe JSON-LD generated from the same data.

Out, on purpose:

- Scaling and unit conversion.
- Shopping lists.
- Cook mode, timers, step highlighting.
- Search, tags, images.
- Web Awesome. The page has no components that need it.
- Any client-side JavaScript.

## Recipe data

Each recipe stays a Markdown file in `recipes/`. The structured part lives in YAML frontmatter. The Markdown body holds free-form notes (variations, storage, tips).

Trade-off accepted: the files no longer read as a plain recipe on GitHub. The site is the reading surface.

```yaml
title: Chocolate Chip Cookies
source: { name: New York Times, url: https://www.nytimes.com/2008/07/09/dining/091crex.html, adapted: true }
yield: 18 large cookies
time: { total: 25 hr, active: 30 min }
equipment:
  - stand mixer with paddle
  - 2 oz scoop
prep:
  - Line a baking sheet with parchment
ingredients:
  cake-flour: { qty: 8.5 oz, name: cake flour }
  bread-flour: { qty: 8.5 oz, name: bread flour }
  soda: { qty: 1 1/4 t, name: baking soda }
  powder: { qty: 1 1/2 t, name: baking powder }
  salt: { qty: 1 1/2 t, name: coarse salt }
  butter: { qty: 2 1/2 sticks, name: unsalted butter }
  brown-sugar: { qty: 10 oz, name: light brown sugar }
  sugar: { qty: 8 oz, name: granulated sugar }
  eggs: { qty: "2", name: large eggs }
  vanilla: { qty: 2 t, name: vanilla extract }
  chocolate: { qty: 1 1/4 lb, name: bittersweet chocolate }
  sea-salt: { name: flaky sea salt }
steps:
  - id: dry
    do: Sift together
    uses: [cake-flour, bread-flour, soda, powder, salt]
  - id: creamed
    do: Cream 5 min, until very light
    uses: [butter, brown-sugar, sugar]
  - id: wet
    do: Beat in eggs one at a time, then vanilla
    uses: [creamed, eggs, vanilla]
  - do: Mix in dry until just combined
    uses: [dry, wet]
    detail: 5 to 10 seconds on low. Stop the moment the flour disappears.
  - do: Fold in. Chill 24–36 hrs
    adds: [chocolate]
    rest: true
    detail: Press plastic wrap against the dough. It keeps up to 72 hours.
  - do: Heat oven to 350°. Scoop 2 oz mounds
    detail: 6 to 9 mounds per sheet. Turn any chocolate that pokes up flat.
  - do: Sprinkle. Bake 18–20 min
    adds: [sea-salt]
    detail: Surface cracked, edges golden, center still soft.
  - do: Cool on sheet 10 min
    rest: true
```

### Fields

- `ingredients`: a map of id to `{ qty, name }`. `qty` is optional ("salt and pepper to taste"). Optional `alt` holds a second unit ("225 g" beside "16 T"). Quantities are plain text and are never parsed.
- `steps`: a flat list in cooking order.
  - `do`: the short text shown in the table cell. Aim for six words. It can be a list, which stacks several short lines in one cell (rest, skim, fill, seal).
  - `uses`: starts a fresh combination from the listed ingredients and earlier step ids.
  - `adds`: the previous step's result plus the listed ingredients.
  - Neither: the step continues the previous step with nothing new.
  - `id`: only needed when a later step refers back to this one.
  - `detail`: optional longer note, shown under the table as a numbered step note.
  - `rest`: optional. Marks a hands-off step (chill, cool, rise).
- `prep`: things that are true before step 1 (grease the pan, line the sheet). Anything that happens later, like preheating after a long chill, goes in that step's `do`.
- `equipment`, `yield`, `time`, `source`: all optional.

### Rules the build enforces

A recipe that breaks either rule fails the build.

1. Every ingredient is used exactly once.
2. Every step except the last is used exactly once.

These rules mean the recipe is a tree, which is what makes the table possible. They would already catch real mistakes in this repo: the pumpkin cheesecake bars use vanilla and eggs that are missing from the ingredient list.

### Things the format does not model

- An ingredient split across steps ("sugar, divided"). List it as two ingredients, one per use.
- The same ingredient in two roles. Use two ids (`butter-cold`, `butter-melted`).
- A mixture that gets split (cinnamon sugar partly in the batter and partly on top, lasagna filling in thirds). Say it in the step text.
- Things removed (drained water). Say it in the step text.

## From data to table

One plain JavaScript function turns `steps` into table rows. It has no dependencies and gets tests before anything else is built.

- Rows: walk the tree from the last step, depth first, in the order ingredients and steps are listed. Each ingredient is one row.
- Row span: a step's cell spans as many rows as it has ingredients beneath it.
- Column: a step that uses only ingredients sits in column 1. Otherwise it sits one column right of the furthest-right step it uses.
- Column span: a step's cell stretches right until it meets the step that uses it.
- Fill cells: an ingredient that joins late gets an empty cell running from its name to the step it joins. This is where the dotted leader is drawn.
- Step numbers follow cooking order.

## Page layout

Top to bottom:

1. Title block. A form-style header: the title in the first field, then File (the folder), Yield, Time, Source, Apparatus. Fields with no data are left out.
2. The table, with any `prep` lines as a full-width row at the top.
3. Step notes: a numbered list containing only the steps that have `detail`. Each number links back to its cell, and the cell's number links down to the note.
4. The Markdown body.

### Small screens

The table stays a real `<table>` and scrolls sideways inside its own region.

- The ingredient column stays pinned while steps scroll.
- On phones the quantity stacks above the ingredient name to keep that column narrow.
- Step columns are sized so one full step shows with a sliver of the next.
- Scroll snaps to step columns.
- `overscroll-behavior-x: contain` stops a hard swipe from navigating back.
- The scroll region has `role="region"`, a label, and `tabindex="0"` so it works from the keyboard.
- When the table fits its container (a container query, not a screen-width breakpoint), the pinning switches off and quantities align in their own column.

A reflowing alternative (the same markup laid out by CSS subgrid on wide screens and as a step outline on phones) was prototyped and works. It was set aside in favor of the scrolling table. It is in `docs/mocks/archive/01-scroll-vs-reflow.html`.

## Visual direction

"Lab notebook" structure with "recipe card" warmth.

- Type: Atkinson Hyperlegible Mono for the title, ingredients, quantities and labels. Atkinson Hyperlegible Next for step text and prose. No serif. Two font files, self-hosted.
- Rule of thumb: mono for data, sans for instructions.
- Quantities are written typewriter-style (`1 1/4 t`). Single-character fractions are illegible in mono.
- Color: warm near-white paper, slightly lighter card for the table, warm near-black ink, one red accent. Faint graph-paper grid behind the page in a tint of the red.
- Labels are small, muted, uppercase mono.

### The mark kit

Everything is drawn with lines and dots. No filled cells. Each mark has one meaning.

| Mark | Meaning |
| --- | --- |
| Dotted leader | An ingredient waiting to join |
| Hairline | These things get combined |
| Open hatch | Early work |
| Close hatch | Further along |
| Cross-hatch | The last active step |
| Stipple | Resting, hands off |
| Ringed number | This step has a note |
| Double rule (red) | The card starts here |

- Hatch tone is worked out from a step's position, in thirds. Nothing is written in the data for it.
- Stipple comes from `rest: true`.
- Hatch fades out behind step text so the words sit on clear ground.
- Leaders sit on the text baseline, with round dots at a fixed pitch, fitted to whole dots per run.

## CSS approach

One plain CSS file. No preprocessor and no build step. Small enough to inline in the page head.

```css
@layer reset, tokens, base, compositions, blocks;
```

- Cascade layers (Miriam Suzanne) hold the CUBE CSS groups (Andy Bell).
- Element styles in `base` do most of the work, so templates carry few classes.
- Fluid type and space scales with `clamp()`.
- Container queries decide the table's layout.
- Custom properties are the table's API. Print reassigns them.
- Four base colors in OKLCH: paper, card, ink, accent. Every other color is one of those at lower opacity using `alpha(from var(--ink) / 30%)`.

## Build

- Eleventy with zero plugins to start. Liquid templates (the default).
- Font Awesome through `@11ty/font-awesome`, using a kit so Pro families are available. It outputs a per-page SVG sprite with no JavaScript. The npm token is a repository secret and never committed.
- One GitHub Action builds and deploys to Pages.

## Performance budget

- Zero client-side JavaScript.
- One stylesheet, inlined.
- Two font files.
- No images to start.
- Lighthouse 100 in all four categories, checked by hand before each deploy.

## Open questions

- Palette source. Map the four base colors to named steps from Quiet, Harmony or Tailwind (all on colors.abeautifulsite.net), or keep the hand-tuned values.
- Lab vocabulary (Yield, Apparatus, Setup, Observations, Remarks) or standard labels.
- Browsers without `alpha()` need a `color-mix()` fallback. Without it, hairlines and hatching vanish.
- At tablet width the table is slightly too wide and step text wraps to one word per line.
- On phones, a step label that spans two columns can slide behind the pinned column mid-scroll.
- The graph paper shows around the table but not through it.
- Whether a kit can supply the newest Font Awesome packs through the Eleventy plugin. Test with one icon.
- Where the five or so icons go. None are in the mock yet.
- Print stylesheet: not started.
- The `.gitignore` is a Python template. It needs `_site/` and `node_modules/`.

## Suggested order of work

1. Tests and the steps-to-rows function, with the validation rules.
2. Minimal Eleventy setup and one recipe page with unstyled output.
3. Port the mock's CSS.
4. Convert three recipes by hand: chocolate chip cookies, magic chocolate flan cake (two components), chocolate pot de crème (many steps, few ingredients).
5. Print stylesheet.
6. Icons, JSON-LD, index page.
7. GitHub Action and Lighthouse pass.
