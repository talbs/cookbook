# Cookbook decisions

The decision log. Newest decisions have the highest numbers. Each entry says what was decided, why, and what lost. Dates are when the decision was made in the planning sessions of 2026-10-03 and 2026-10-04.

Confidence words used below: **verified** means it was tested in a browser or read from a source. **Likely** means a strong inference. **Unverified** means nobody checked.

## Scope and stack

### D-01 One recipe table per recipe, and nothing else

In: a page per recipe, an index page grouped by folder, one visual theme, a print stylesheet, schema.org structured data.

Out: scaling, unit conversion, shopping lists, cook mode, timers, search, tags, images.

Why: the recipetables.com feature set is a product. This is a hackathon-sized project. Scope was cut back three times during planning.

### D-02 Build Awesome and Font Awesome. No Web Awesome.

Eleventy with zero plugins to start, Liquid templates (the zero-config default). Font Awesome through `@11ty/font-awesome`, which outputs a per-page SVG sprite with no JavaScript. Verified from its README: it supports Pro packages and kits.

Web Awesome was dropped. The page is one static table with no dialogs, tabs or menus, so there is no component to use. `wa-icon` was the only candidate and it needs JavaScript.

### D-03 Zero client-side JavaScript (replaced by D-25)

The original rule, kept for the record: every interaction is CSS, and this is a hard rule, not a preference. It held until 2026-10-04, when arrow-key navigation was asked for. Nothing in CSS responds to arrow keys.

### D-04 Recipes are structured data in frontmatter

Each recipe stays a Markdown file. Ingredients and steps move into YAML frontmatter. Format in COOKBOOK-DATA-FORMAT.md.

Accepted cost: the files stop reading as a plain recipe on GitHub. The site becomes the reading surface.

Rejected: tagging ingredients inside prose (Cooklang style), and converting with AI at build time.

### D-05 Author in our own format, publish schema.org

No existing recipe standard records which step consumes which ingredient or step. schema.org/Recipe, Cooklang and Open Recipe Format all store two flat lists. So the authoring format is custom, and the build writes schema.org Recipe JSON-LD from it.

## The table

### D-06 A sideways-scrolling table with a pinned ingredient column

On narrow screens the table keeps its shape and scrolls inside its own region. The ingredient column stays pinned. Verified at 375px.

Rejected: shrinking the whole table to fit (what recipetables.com does, text ends up near 6px), and reflowing the same markup into a step outline on phones. The reflow version was prototyped with CSS subgrid and works. It is in `docs/mocks/archive/01-scroll-vs-reflow.html`.

Known cost: on a phone you see about one step at a time, and a step that spans two columns can slide its label behind the pinned column.

### D-07 Step notes are footnotes, numbered on their own

Steps in the table carry no numbers. Table position is the order. A step with extra detail gets a small red superscript number, and the notes list in the card footer uses the same numbers. Links go both ways.

Replaces an earlier version where every step was numbered and the step number doubled as the note marker.

### D-18 Ingredient rows

- Wide: quantity and name on one line, quantity bold. A dotted leader runs from the name to the step the ingredient joins. Every leader has a minimum length.
- Narrow: quantity stacked above the name, to keep the pinned column slim.
- Every row is the same height (48px), with text and leader centered vertically.
- In scrolling mode the pinned column has a continuous hairline on its right edge, so a step sliding under it still has a boundary. An earlier attempt drew that line with a shadow and left stray marks between rows.
- Quantities are written typewriter style (`1 1/4 t`). Single-character fractions are illegible in a mono face. Verified.

### D-23 Build the table with CSS grid, not table layout (recommended, not built)

The mock is a real `<table>`. Table layout only gives extra height to the rows a tall cell spans, so one long step makes its rows taller than the rest.

Verified in a throwaway test: a grid with `grid-template-rows: repeat(n, 1fr)` grows every row equally. Six rows went from 26, 109, 109, 26, 26, 26 to 109 each.

Grid also gives a real `gap` (the mock fakes it with `border-spacing` plus a shadow on the pinned column) and lets a leader be one element.

Cost: table semantics have to be kept by hand, either with ARIA table roles or by keeping the table tags and changing their display. Either way it needs a screen reader test. This is the first real build decision. It is not final until that test passes.

## Visual direction

### D-08 What was rejected, so nobody proposes it again

Typefaces: Vollkorn, Piazzolla, Alegreya, Andada, Besley, Fraunces, Instrument Serif, Gloock, Zodiak, Boska, Cutive, Zilla Slab, IBM Plex Serif, Aleo, Old Standard, Bespoke Slab, Bricolage Grotesque, Courier Prime, IBM Plex Mono, Sometype Mono, Geist. No serif survived. Brian called the Huerta Tipográfica serifs "doodoo" and dislikes Bricolage.

Looks: yellow or tan tinted cells ("feels like a stain"), filled step cells of any color, a dark theme as the default, the graph-paper background, the boxed lab-report header, the typed all-caps title, lab vocabulary (Yield, Apparatus, Observations), the purple "ditto sheet", the ruled index card, hatched or dotted or dashed dividers, ringed step numbers, a solid highlight bar on the active note.

Cooking for Engineers is the source of the format only. It is not a visual reference.

### D-09 Atkinson Hyperlegible Next and Mono

Mono for data: ingredients, quantities, times, labels. Sans for instructions and notes. Two font files, self-hosted in the build. The mock loads them from Google Fonts.

The rule came from studying recipetables.com, which pairs Geist with Geist Mono the same way.

### D-10 Four base colors, everything else derived

Paper, card, ink, accent, in OKLCH. Every other color is ink or accent at a lower opacity, written with `alpha(from var(--ink) / 30%)`.

`alpha()` reached Baseline in September 2026 (verified in Chrome 152, and reported by MDN). The mock includes a `color-mix()` fallback inside `@supports not`, because a missing `alpha()` inside a custom property fails silently and the hairlines and textures would vanish.

Open: whether to map the four base colors onto named steps from Quiet, Harmony or Tailwind at colors.abeautifulsite.net.

### D-11 The mark kit: lines work, dots wait

Textures fill step boxes only, and each means an activity.

| Texture | Meaning | `kind` |
| --- | --- | --- |
| Hatch | Hands on, combining | `combine` |
| Back hatch | Hands on: prep, shape, portion | `shape` |
| Cross-hatch | Hands on, with heat | `cook` |
| Stipple | Hands off: chill, rest, cool | `wait` |
| Dense stipple | Hands off, with heat | `bake` |

Other marks: dotted leaders mean an ingredient is waiting to join. Hairlines outline a step. A ruled hairline divides parts of the card. Nothing else is drawn.

Replaces two earlier systems: hatch density by position in the recipe, and a four-kind version where prep steps had no texture and looked unfinished. A pictorial system with waves for heat was explored and set aside. It is in `docs/mocks/archive/04-texture-systems.html`.

States that are not textures: a note is a red number, time and temperature are mono, optional would be a dashed edge, a stopping point would be a break between steps, a repeat would be a mono count. The last three are designed but not in the mock.

### D-12 The card holds the whole recipe

Test: if someone screenshots or prints only the card, the recipe is complete.

Top to bottom: head (title, time, yield, tools, prep), table, footer (step notes, notes, source). Only the breadcrumb sits outside.

Depth is a stack of three cards, each offset 8px, with a faint soft shadow under the last. An alternate with a hatched underlayer is archived. Later idea, not built: a cross-document view transition where the top card lifts to show the next recipe.

### D-13 Spacing scale on a 4px unit, named by relationship

`tight` 4, `related` 8, `group` 12, `gutter` 16 to 24, `section` 32 to 48. Pick a step by how related two things are. A container always pads at a bigger step than the gaps between its children.

A strict doubling scale (4, 8, 16, 32, 64, 128) was built, fit the layout, and was withdrawn the same hour.

### D-14 Card head layout

Title with three facts under it on the left. Tools and prep on the right, flush to the card's right edge, labels and values left-aligned to each other. Below about 960px the right block drops under the left.

Facts follow the ingredient pattern: bold mono number, soft word. Time is split into total and active.

Verified with no tools or prep, a little, and a lot. On a phone, a long list pushes the table from 324px down to 479px. A phone-only disclosure for long lists was proposed and not built.

### D-15 Step text

The action is semi-bold in full ink and the rest is softer. Each sentence gets its own line. A number never separates from its unit. Time sits on the bottom edge of the step box in mono, breaking the outline like a label on a drawing, so every time is in the same place. Text is centered in its box. A left-aligned block was tried on 2026-10-04 and reverted: it made the text hug one side of its fade and the padding look tight.

Limit: at 1280px with seven step columns each column is about 100px, so a long step still takes three lines. The cure is short step text.

### D-16 Step focus state

By default every step looks the same. Click, tap or tab to a step and it gets a dark edge, the other steps and unrelated ingredients fade to 45%, and the ingredients that feed it stay at full strength. The look is pure CSS. The build writes one rule per step. Verified with a real click. Moving between steps by keyboard is the script in D-26.

Cost: each step is a tab stop on an element with no interactive role. Needs a screen reader test before shipping.

### D-17 Links and the active note

Links have a faint underline set below the text. On hover it moves closer, thickens and turns red. The note you jumped to gets a hand-drawn marker stroke under each line of its text, only as wide as the words.

The stroke's color is written into an inline SVG, so it does not follow the accent token. The build should generate it from the same value.

### D-20 Dividers are a ruled hairline

Same faint ink as step outlines. Typed hyphens and typed asterisks were built as alternates and are archived. Brian's reaction to the ruled line was "Great."

### D-22 One icon style

Regular or Light, never mixed. The mock uses Font Awesome Free Regular from a CDN, and its yield and active-time icons are stand-ins because Free has no cooking icons in that style. The build uses a Pro kit. Light suits the design better.

### D-24 Type in three layers: scale, families, roles

A size-named scale of eight steps at a ratio near 1.15 (`--font-size-xs` to `--font-size-4xl`), modelled on Web Awesome's. Four families on top (heading, body, data, caption), each style a full `font` value. Role tokens on top of those (`--type-title`, `--type-step` and so on), which are the only ones components use.

Each role also has a recipe: its family style, weight, ink and a noise level from 1 to 5, scored by a fixed rubric. The recipes and rubric are in COOKBOOK-DESIGN.md and rendered in `docs/mocks/type-specimen.html`.

Chosen over size names alone (fails the floor audit's rule against size-named tokens) and role names alone (no scale to reach into for a new case).

Known cost: the floor audit flags `--font-size-xs` and `--font-size-xl` as size-named. That is expected. The audit needs an exception for the `--font-size-` scale layer, which Brian has to add himself.

Changes that came out of scoring the recipes, same day: tools and prep text to secondary ink, step times to bold full-strength ink, fact numbers up to 15px, labels all capitals, notes up from 13px to 15px, the light weight removed. Stronger ink on ingredient names was tried and dropped. The title now tops out at 30px (a scale step) instead of 32px.

### D-25 Nothing requires JavaScript

Replaces D-03. Every page is complete and usable with scripts off. A script may add a convenience on top of something that already works, and nothing else.

Limits, so the rule has an edge:

- Inline in the page. No dependencies, no network requests.
- It never creates content, layout or data. Those come from the build.
- With the script off, the feature it improves still works in a plainer form.
- Every script is listed in COOKBOOK-DESIGN.md with what it adds and what happens without it.
- A new script needs its own decision entry.

Why it changed: Brian asked for arrow keys and Esc on the steps. It was also the better accessibility answer. Eight separate tab stops became one, which is the standard way to move around inside a group.

The risk named at the time: the next small script is easier to say yes to. The limits above are there for that.

### D-26 Keyboard navigation for steps

The one script (about 50 lines, 1.8KB before minifying). Behavior:

- Tab enters the table once, landing on the first step or the last one visited. Tab again reaches a note link inside that step, then leaves the table.
- Right and Down go to the next step in cooking order. Left and Up go to the previous one. Left and Right swap in a right-to-left layout.
- Home and End go to the first and last step. There is no wrap-around.
- Esc moves focus to the table's scroll region, which clears the focus state without losing the reader's place.
- A hint line ("Arrow keys move between steps. Esc leaves the table.") appears under the table while a step has keyboard focus. It is also the scroll region's description for screen readers.

Without the script: every step is its own tab stop, in markup order (Sift, Mix in, Fold in, Scoop, Bake, Cool, Cream, Beat in), which is not cooking order. The hint stays hidden. Click and tap still work.

Choices worth knowing:

- All four arrows move along cooking order. Up and Down do not move spatially. Most columns hold one step, so spatial movement would leave those keys dead most of the time. This differs from what was first proposed.
- The table keeps its table role. It does not claim to be a grid, because arrows only visit steps, not every cell. Screen readers in browse mode keep their own table commands.
- Keys with a modifier held are ignored, so browser and screen reader shortcuts are not swallowed.
- Only the current step's note link is a tab stop. Otherwise Tab would visit links in markup order before reaching the current step.

- The scroll area around the table is a tab stop only while the table actually scrolls sideways. When the table fits, that stop did nothing, so the script removes it. It is set once at load and again whenever the table or its area changes size. Esc can still move focus there either way.
- After an arrow move the script also scrolls the new step fully into view.

Verified with real key presses in the browser on 2026-10-04. Not verified with a screen reader. The resize update could not be verified in the preview pane, which does not deliver resize observations while it is in the background. The at-load behavior was verified at both widths.

### D-27 Focus states (deferred)

A round on focus rings was built and then backed out on 2026-10-04, to be picked up another day. The mock still has the earlier behavior: a 2px red ring on anything with keyboard focus, and a dark edge on the current step.

What that round found, for whoever returns to it:

- A keyboard-focused step shows two frames in two colors: its dark edge, and the red ring 2px outside it.
- Red is meant to stay at noise level 2 or below. A red ring around a whole step is the loudest thing on the page.
- The ring on a note marker sits on the last letter of the word before it.
- The ring on the table's scroll area wraps the whole table and reads as heavy.

What was tried: one ink ring for everything, a softer ink ring for the scroll area, a 2px ink frame in place of a ring on steps, and side padding on note markers.

## Engineering

### D-19 CSS architecture

One stylesheet, no preprocessor. Cascade layers in this order: `reset, tokens, base, compositions, blocks`. Tokens are named by role, never by size. Element selectors in `base` do most of the work.

The file passes the visual-defaults floor audit apart from the two expected scale-name findings (D-24). Details and the Baseline list are in COOKBOOK-DESIGN.md.

### D-21 Performance budget

Nothing requires JavaScript (D-25), and the one enhancement script is inline. One stylesheet, inlined. Two font files. No images to start. Lighthouse 100 in all four categories, checked by hand before each deploy. Not yet measured, because nothing is built.
