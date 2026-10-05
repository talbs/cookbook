# Input for `/speckit-plan`

The how: stack, architecture and constraints. Detail lives in the files linked here. This is the summary to hand over, with pointers.

## Stack

- **Static site generator:** Build Awesome (Eleventy), started with zero plugins. Liquid templates, the zero-config default.
- **Icons:** Font Awesome through `@11ty/font-awesome`, using a Pro kit. Inline SVG, one style only (Regular or Light).
- **Styles:** one hand-written CSS file, inlined in the page head. No preprocessor, no CSS framework, no Web Awesome.
- **Scripts on the page:** one small inline enhancement for moving between steps by keyboard. The page works without it.
- **Tests:** Node's built-in test runner for the layout function.
- **Fonts:** Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, self-hosted, two files.
- **Hosting:** GitHub Pages, built and deployed by a GitHub Action.

## Architecture

- **Content.** One Markdown file per recipe under `recipes/<category>/`. Structured data in YAML frontmatter, free-form notes in the body. Format: [../COOKBOOK-DATA-FORMAT.md](../COOKBOOK-DATA-FORMAT.md).
- **Layout function.** One dependency-free module that validates a recipe and turns its steps into rows, columns, spans, fill cells, note numbers and per-ingredient step lists. Rules and a worked example are in the data format file. This is the only real logic in the project.
- **Template.** One recipe layout that renders the card from the layout function's output. Its target markup is `docs/mocks/recipe-card.html`.
- **Generated per recipe.** The step focus rules (one CSS rule per step) and the schema.org Recipe JSON-LD.
- **Styles.** Cascade layers in this order: `reset, tokens, base, compositions, blocks`. All values are role-named custom properties. Reference: [../COOKBOOK-DESIGN.md](../COOKBOOK-DESIGN.md).

## The reference implementation

`docs/mocks/recipe-card.html` is a finished, hand-written version of one recipe page: markup, CSS, structured data. The build's job is to produce that page from data for every recipe.

Screenshots of it at three widths and in two states are in [screenshots/](screenshots/).

What the mock borrows and the build must replace: fonts from Google Fonts, icons from a CDN webfont, a hard-coded color inside the marker-stroke SVG, hand-written focus rules.

## Constraints

- Nothing requires JavaScript. Enhancement scripts only, within the limits in D-25.
- Baseline CSS only. `alpha()` is used for derived colors and has a `color-mix()` fallback.
- Lighthouse 100 in all four categories on a recipe page.
- The floor audit (`~/.claude/skills/visual-defaults/audit.py`) reports only the two expected scale-name findings on built pages (see D-24).
- Never push from an agent session. Local commits only.

## Decisions still open that affect the plan

- **Table engine.** The mock uses a real `<table>`. Table layout cannot keep rows equal when one step needs more height. CSS grid with equal-fraction rows can (verified in a test). Grid needs table semantics added by hand and a screen reader check. Recommended, not decided. See D-23.
- **Readable step text for structured data.** The table text is terse. `HowToStep` text should be a sentence. Either generate it or add an optional field.
- **Durations.** "25 hr" must become `PT25H`. Either parse the short text or store the ISO value.
- **Step syntax.** `do` lines use `Action | rest` to mark the emphasized action word. Proposed, not reviewed.
- **Focusable steps.** The focus state puts a tab stop on each step cell. Needs a screen reader check, or a different trigger.

The full list is in [../COOKBOOK-BUILD-PLAN.md](../COOKBOOK-BUILD-PLAN.md) under "Open questions".

## Suggested order

Our own task order is in the build plan: setup, the layout function with tests, three converted recipes, one unstyled page, styles, icons and head, then the index, print, the remaining recipes, deploy and a Lighthouse pass. Use it to check the task list Spec Kit generates.
