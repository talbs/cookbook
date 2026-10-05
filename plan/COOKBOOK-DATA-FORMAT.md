# Cookbook data format

How a recipe is written, and how the build turns it into the table in the mock.

Status: **proposed, not implemented.** The first-day version of this format is in `docs/specs/2026-10-03-recipe-table-design.md`. This file supersedes it. Fields marked *new* were added after that spec, because the design grew to need them.

## The file

A recipe stays a Markdown file under `recipes/<folder>/`. The structured part is YAML frontmatter. The Markdown body is free-form notes (variations, storage, tips) and renders in the card footer under "Notes".

```yaml
title: Chocolate Chip Cookies
description: Large chocolate chip cookies from a dough that chills for a day before baking.
source: { name: New York Times, url: "https://www.nytimes.com/2008/07/09/dining/091crex.html", adapted: true }
yield: { count: 18, unit: large cookies }
time: { total: 25 hr, active: 30 min }
tools:
  - Stand mixer with paddle
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
    do: [Sift | together]
    uses: [cake-flour, bread-flour, soda, powder, salt]
  - id: creamed
    do: [Cream | until very light]
    time: 5 min
    uses: [butter, brown-sugar, sugar]
  - id: wet
    do: ["Beat in | eggs one at a time, then vanilla"]
    uses: [creamed, eggs, vanilla]
  - do: [Mix in | dry until just combined]
    uses: [dry, wet]
    note: 5 to 10 seconds on low. Stop the moment the flour disappears.
  - do: [Fold in, Chill]
    kind: wait
    time: 24–36 hr
    adds: [chocolate]
    note: Press plastic wrap against the dough. It keeps up to 72 hours.
  - do: [Heat | oven to 350°, Scoop | 2 oz mounds]
    kind: shape
    note: 6 to 9 mounds per sheet. Turn any chocolate that pokes up flat. It makes a better-looking cookie.
  - do: [Sprinkle, Bake]
    kind: bake
    time: 18–20 min
    adds: [sea-salt]
    note: Surface cracked, edges golden, center still soft.
  - do: [Cool | on sheet]
    kind: wait
    time: 10 min
```

## Fields

Recipe level:

- `title`, required.
- `description`, one sentence. *New.* Used for the meta description and structured data.
- `source`: `name`, `url`, and `adapted`.
- `yield`: `count` and `unit`. *Changed* from a single string, so the count can be bold.
- `time`: `total` and `active`, as short text.
- `tools`: a list. *Renamed* from `equipment`. Rendered as one comma-separated sentence.
- `prep`: a list of things that are true before step 1. Anything that happens later, like preheating after a long chill, belongs in that step.
- `ingredients`: a map of id to `{ qty, name }`. `qty` is optional. Quantities are plain text, typewriter style (`1 1/4 t`), and are never parsed.

Step level:

- `do`, required: a list of lines. Each line is one short sentence. Quote a line that contains a comma. A pipe splits the action from the rest: `Cream | until very light`. A line with no pipe is all action. The action renders semi-bold. *Changed* from a single string.
- `uses`: starts a fresh combination from the listed ingredients and earlier step ids.
- `adds`: the previous step's result plus the listed ingredients.
- Neither: the step continues the previous step.
- `id`: only when a later step refers back to it.
- `kind`: `combine` (the default), `shape`, `cook`, `wait` or `bake`. *New.* Replaces `rest: true`. Picks the texture.
- `time`: short text shown under the step in mono. *New.*
- `note`: longer detail, shown in the footer as a numbered step note. *Renamed* from `detail`.

Designed but not yet in the format: `optional: true` on a step or ingredient, a stopping point between steps, and a repeat count.

## Rules the build enforces

A recipe that breaks either rule fails the build.

1. Every ingredient is used exactly once.
2. Every step except the last is used exactly once.

Together they mean the recipe is a tree, which is what makes the table possible. They would already catch real mistakes in this repo: the pumpkin cheesecake bars use vanilla and eggs that are not in the ingredient list.

Also worth checking: every `uses` and `adds` id exists, ids are unique, and `kind` is one of the five values.

## What the format does not model

- An ingredient split across steps ("sugar, divided"). List it as two ingredients.
- The same ingredient in two roles. Use two ids (`butter-cold`, `butter-melted`).
- A mixture that gets split (cinnamon sugar partly in the batter, partly on top). Say it in the step text.
- Things removed (drained water). Say it in the step text.
- A step that is two kinds at once ("Fold in. Chill"). Pick the dominant kind, or split the step.

## From data to table

One plain function with no dependencies turns `steps` into a layout. It gets tests before anything else is built.

- **Rows.** Walk the tree from the last step, depth first, following the order things are listed. Each ingredient is one row.
- **Row span.** A step spans as many rows as it has ingredients beneath it.
- **Column.** A step that uses only ingredients is in column 1. Otherwise it is one column right of the furthest-right step it uses.
- **Column span.** A step stretches right until it meets the step that uses it.
- **Fill cells.** An ingredient that joins late gets an empty cell from its name to the step it joins. The leader is drawn there.
- **Step ids.** `step-1` up, in cooking order. These are anchors, not visible numbers.
- **`data-steps`.** Each ingredient lists every step whose span includes its row. The step focus rules use it.
- **Note numbers.** Steps with a `note` are numbered 1 up, in cooking order. The marker goes on the last line of `do`.
- **Units.** Replace the space between a number and its unit with a non-breaking space in `do` and `time`.

The cookies, worked through: 12 rows and 7 step columns. "Sift" spans rows 1 to 5 and two columns. "Cream" spans rows 6 to 8. "Beat in" spans rows 6 to 10. "Mix in" spans rows 1 to 10. Chocolate joins at "Fold in" with a fill cell three columns wide. Sea salt joins at "Bake" with a fill cell five columns wide.

These rules were proven by one hand-built example only. The first tests should pin them down against at least three recipes: the cookies, the flan cake (two components that meet late), and the pot de crème (19 steps for 5 ingredients).

## Structured data

The build writes schema.org Recipe JSON-LD from the same data.

| schema.org | From |
| --- | --- |
| `name`, `description` | `title`, `description` |
| `recipeCategory` | the folder |
| `recipeYield` | `yield` |
| `totalTime`, `prepTime` | `time.total`, `time.active`, converted to ISO 8601 durations |
| `tool` | `tools` |
| `recipeIngredient` | each ingredient as "qty name" |
| `recipeInstructions` | one `HowToStep` per step |
| `isBasedOn` | `source.url` |

Open: `HowToStep` text should be a readable sentence, and the table text is terse ("Sift together"). The mock's JSON-LD was written by hand with fuller sentences. Options are to generate text from `do` plus the ingredient names, or to add an optional long-form field per step. Not decided.

Converting "25 hr" to `PT25H` needs a small parser, or the format could store the ISO value and derive the display text.
