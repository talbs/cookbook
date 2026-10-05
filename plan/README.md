# Cookbook plan

Planning notes for turning this repo into a small static site where every recipe renders as a recipe table. Written for future agents and for Brian. Read this file first, then the one you need.

Status: **design settled in a browser mock, nothing built.** Last updated 2026-10-04. Branch `talbs/table-for-one`, local only.

## The files

| File | What it holds | Read it when |
| --- | --- | --- |
| [COOKBOOK-DECISIONS.md](COOKBOOK-DECISIONS.md) | Every decision, numbered D-01 up, with the reason and what was rejected | Before proposing a change. The answer is probably already here. |
| [COOKBOOK-DESIGN.md](COOKBOOK-DESIGN.md) | Tokens, spacing and type scales, the mark kit, card anatomy, accessibility and SEO requirements | Writing or reviewing CSS or markup |
| [COOKBOOK-DATA-FORMAT.md](COOKBOOK-DATA-FORMAT.md) | The recipe frontmatter format and how it becomes a table | Writing the build, or converting a recipe |
| [COOKBOOK-BUILD-PLAN.md](COOKBOOK-BUILD-PLAN.md) | Ordered build tasks, open questions, test notes | Starting or resuming the build |
| [spec-kit/](spec-kit/README.md) | Inputs shaped for Spec Kit's steps, plus screenshots of the mock | Trying Spec Kit on this project, or wanting pictures |

The reference implementation is [docs/mocks/recipe-card.html](../docs/mocks/recipe-card.html). It is one hand-written HTML file with inline CSS. Trust it over any prose here, and fix the prose when they disagree.

[docs/mocks/type-specimen.html](../docs/mocks/type-specimen.html) renders the type scale, the families and the recipe for every piece of text, with noise levels. It is generated from the mock's tokens, so regenerate it when they change.

Earlier rounds are in `docs/mocks/archive/`, numbered in the order they happened. `05-card-with-switches.html` has the alternates that were considered last (hatched card underlayer, typed dividers, long tools and prep).

`docs/specs/2026-10-03-recipe-table-design.md` is the first-day spec. It is superseded by this folder and kept for history.

## How to keep this current

- A decision changes: add a new D-nn entry that says which one it replaces. Don't rewrite history.
- Something gets built: change the Status line at the top of the file that planned it, with the date.
- The mock changes: update COOKBOOK-DESIGN.md in the same sitting.
- An open question gets answered: move it from the build plan to the decision log.

## Reminders for agents

Working with Brian on this project:

- He decides visual questions by looking, not by reading. Put options in the browser with a switch between them. Three is plenty.
- He rejected a lot along the way. Check D-08 before suggesting a typeface, a color or a decorative idea.
- "Lighter hand" is the standing brief: plain page, faint structural lines, the card is the object.
- Scope creep was cut three times. If a request grows the scope, say so first.
- He may spin the texture library off into its own project. See "Later ideas" in the build plan, and keep the textures free of recipe-specific code.
- Never push. Commit only when asked. Branch names follow `talbs/<pun>`.

Working in this repo:

- Preview the mock with the `cookbook-mocks` entry in `~/.claude/launch.json` (serves `docs/mocks` on port 8177).
- The preview caches hard. Add `?v=something` to the URL after every edit, or you will be looking at the old file.
- `:focus` styles do not apply to scripted focus in the preview pane. Use a real click to test the step focus state.
- When the preview pane is in the background its page is hidden: screenshots lag, and `ResizeObserver` and animation frames do not fire. Measure with script after a wait, and do not trust a screenshot that disagrees with a measurement.
- Screenshots wider than the pane are scaled down, and the dotted leaders and fine hatching vanish in them. Measure with script, or look at 800px wide or less.
- Run the floor audit after any CSS change: `python3 ~/.claude/skills/visual-defaults/audit.py docs/mocks/recipe-card.html`. It prints 2 findings, both expected: `--font-size-xs` and `--font-size-xl` (see D-24). Anything else is new.
- No CSS comments unless the reason is not obvious from the code. The mock has none.
