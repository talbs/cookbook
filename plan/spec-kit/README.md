# Spec Kit handoff

Material for trying [Spec Kit](https://github.com/github/spec-kit) on this project. Nothing here installs or runs Spec Kit. These are inputs shaped to fit its steps, plus screenshots of the mock.

Status: **prepared 2026-10-04, not used yet.** Spec Kit is not installed on this machine (`uv` and `specify` are both missing).

## What Spec Kit wants, and what we have

Spec Kit splits work into steps, and it is strict about one thing: the specification says what and why, and the plan says how. Our notes in `plan/` mix the two, because they were written as a design record. The files in this folder pull them apart.

| Spec Kit step | What it asks for | Give it |
| --- | --- | --- |
| `/speckit-constitution` | The project's standing principles | [constitution-input.md](constitution-input.md) |
| `/speckit-specify` | What to build and why. No technology. | [specify-input.md](specify-input.md) |
| `/speckit-plan` | Tech stack, architecture, constraints | [plan-input.md](plan-input.md) |
| Clarifying questions, at any step | Answers | [clarifications.md](clarifications.md) |
| `/speckit-tasks`, `/speckit-implement`, `/speckit-converge` | Nothing from us. They work from Spec Kit's own files. | Compare its task list against [../COOKBOOK-BUILD-PLAN.md](../COOKBOOK-BUILD-PLAN.md) |

Command names are as the Spec Kit README listed them on 2026-10-04. They have changed between versions before, so check `specify --help` after installing.

## Getting started

Unverified. Read from the README, not run.

1. Install `uv`, then `uv tool install specify-cli`.
2. In this repo, run `specify init` with the flag for an existing folder (`--here`) and the flag that selects Claude Code. Check `specify init --help` for both. The README only showed a new-project example.
3. Look at what it added before committing: a `.specify/` folder (templates, scripts, `memory/constitution.md`) and, once you run a step, `specs/<number>-<name>/` with `spec.md`, `plan.md`, `tasks.md`, `data-model.md` and `research.md`.
4. Run the steps in the order of the table above, pasting or pointing at the matching file.

## Things to decide first

- **Two sources of truth.** Once Spec Kit writes `specs/…/spec.md` and `plan.md`, those and the files in `plan/` will describe the same project. Pick one to keep current. Suggestion: Spec Kit's files become the working spec, `plan/COOKBOOK-DECISIONS.md` stays as the history of why, and the design reference and data format stay as the detail Spec Kit's plan links to.
- **Branches.** By default Spec Kit creates a numbered branch per spec (such as `001-recipe-table`), which clashes with the `talbs/<name>` convention. It can be avoided. Read from Spec Kit's own templates and issue tracker on 2026-10-04, not run:
  - Give it the name: when `GIT_BRANCH_NAME` is provided, the specify step uses that exact value as the branch name.
  - Turn branching off: `specify extension disable git`. Spec folders are still created, and no branch operations happen.
  - Never turn it on: `specify init --no-git`.
  - The spec folder name (`specs/001-recipe-table`) is separate from the branch name, so the folder keeps its number either way.
  - Branch settings live in `.specify/extensions/git/git-config.yml`.
  - The git extension was still being moved out of core when this was read, so confirm with `specify extension --help` after installing. Commit or stash before the first specify step regardless.
- **One feature or several.** The whole project could be one spec, or split in three: the layout function and data format, the recipe page, and the site around it (index, deploy). Splitting matches Spec Kit's grain better and gives smaller task lists. [specify-input.md](specify-input.md) is written as one feature with those three parts marked, so it can be cut.
- **The mock is not the spec.** Spec Kit's spec should describe behavior. Point it at the screenshots and the mock as the visual reference in the plan step, not the specify step.

## Screenshots

Taken from `docs/mocks/recipe-card.html` on 2026-10-04 with headless Chrome at 2x.

| File | Shows |
| --- | --- |
| [screenshots/01-desktop-1440.webp](screenshots/01-desktop-1440.webp) | The whole card at 1440px. Wide mode: no scrolling, one-line ingredients with leaders. |
| [screenshots/02-tablet-800.webp](screenshots/02-tablet-800.webp) | 800px. Scrolling mode: pinned ingredient column, stacked quantity and name. |
| [screenshots/03-phone-375.webp](screenshots/03-phone-375.webp) | 375px, top of the page. |
| [screenshots/04-step-focus-1440.webp](screenshots/04-step-focus-1440.webp) | A focused step: other steps and unrelated ingredients faded. The red ring is the keyboard focus outline. |
| [screenshots/05-note-target-800.webp](screenshots/05-note-target-800.webp) | After following a note link: the marker stroke under note 3. |
| [screenshots/06-texture-specimens.webp](screenshots/06-texture-specimens.webp) | The texture exploration page from the archive, with all twelve specimens. Older styling than the final card. |

Not captured: the table scrolled sideways on a phone, hover states, print.

To retake them, run headless Chrome with `--screenshot`, `--force-device-scale-factor=2` and a `--window-size`. Chrome will not open narrower than about 500px, so the phone shot loads the mock in a 375px iframe and crops.

## Where everything else is

- [../README.md](../README.md): index of the plan notes and reminders for agents.
- [../COOKBOOK-DECISIONS.md](../COOKBOOK-DECISIONS.md): 23 decisions with reasons and rejected options.
- [../COOKBOOK-DESIGN.md](../COOKBOOK-DESIGN.md): tokens, scales, the mark kit, accessibility and SEO requirements.
- [../COOKBOOK-DATA-FORMAT.md](../COOKBOOK-DATA-FORMAT.md): the recipe format and the rules for laying out the table.
- [../COOKBOOK-BUILD-PLAN.md](../COOKBOOK-BUILD-PLAN.md): our own task order, open questions and test notes.
- `docs/mocks/recipe-card.html`: the reference implementation.
- `recipes/`: the 10 existing recipes, still in their original Markdown.
