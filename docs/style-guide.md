# Style guide

How recipes are written here. For what the build checks, see the [recipe format](recipe-format.md).

## Titles

- Use the dish's name, in title case.
- Drop a publication's branding and boasts ("The Best", "Perfect").
- Keep a name the dish is known by: `Magnolia Bakery's Banana Pudding`.

## Descriptions

One sentence, about 70 to 105 characters. It shows on the recipe's card, at the top of its page and in link previews.

- Say what the dish is in plain words. If the title doesn't explain itself (Kare Raisu), the description does.
- Give one hook: a technique, an odd ingredient or a wait.
- Tell the reader something the title doesn't.
- Use adjectives you could see or feel (charred, thin, crisp). Skip verdicts like "delicious". Two at most.
- Pick, don't list. Three named ingredients is the ceiling.
- No colon followed by a space. It breaks the front matter, and the build stops with `front matter didn't parse`.
- Most descriptions run "dish with a thing, done a certain way". Break that shape now and then so the list of recipes doesn't read like a template.
- Read the steps for the hook. Never invent a use or a fact.
- Keep the dish's own words for itself. Smash burgers are double-stacked, not "two thin patties".

A good one: `Instant ramen baked on a sheet pan until crisp, with hoisin-maple glazed tofu and baby bok choy.`

## Tags

- Stick to the kinds the `tags` row in [Front matter keys](recipe-format.md#front-matter-keys) lists. No ingredient tags (`chicken`) and no character tags (`spicy`).
- Tags are optional. Don't invent one to fill the line.
- A new method or gear tag also goes in `METHOD_TAGS` in `eleventy.config.js`. Without it, `/tags/` files the tag under Dishes.

## Seasons

- Season tags go on by hand. The `tags` row in [Front matter keys](recipe-format.md#front-matter-keys) has the names.
- Tag a season only when the dish belongs to one. No season tag means any time.
- `year-round` isn't a tag. The build stops on it.

## Credit

- `author` is who created the recipe. `source.author` is who wrote the article or book.
- `source.name` is the publication as it writes itself (`Serious Eats`, `NYT Cooking`), not a bare domain.
- Every recipe has a `source` unless it's our own.
- `adapted: true` means we changed the recipe. It needs a What's Changed note that says what.

A book from a publication or a kitchen is a `{ name, book }` map. `name` is the publication or kitchen, and `book` is the title.

```
source:
  name: America's Test Kitchen
  book: The Make-Ahead Cook
  url: https://www.amazon.com/Make-Ahead-Cook-Americas-Kitchen/dp/1936493845
```

When nobody but the author stands behind the book, the book's title is the `name` and the person goes in `author`.

```
author: J. Kenji López-Alt
source: The Food Lab
```

## Facts

- Set `cuisine` when the dish plainly has one, as a capitalized adjective (`Italian`, `Tex-Mex`). Leave it off otherwise.
- Times, servings and yield come from the source, or plainly from the steps. Never add up the timers, and never fill them in from memory.
- For `difficulty: easy` and `icons`, see their rows in [Front matter keys](recipe-format.md#front-matter-keys).

## Sections

- Use sections only when a recipe has parts you make separately, or phases with a wait between them. Name a part with a noun (`Sauce`) and a phase with one verb (`Marinate`).
- Don't label a part inside a step (`Make the dressing:`). Give it a section, or write it as a sentence.

## Notes

- A note after a step folds under it. Give it a bold title in title case, a dash, and at least one sentence: `> **Storing** — Keeps for 2 weeks.` Reach for Storing, Making Ahead, Serving, Swaps or Extras first. One idea per note. If skipping it breaks the step, it isn't a note. Put it in the step.
- A note before the recipe's first step shows under "Before You Start", in both modes. Keep it to things the cook does first (wear gloves, get a pressure cooker). Reasons the method works go in `why` instead.

## Timer names

- Name a timer with one lowercase verb for what's happening: `rise`, `simmer`, `bake`. Hyphenate a two-word verb: `pressure-cook`, `sous-vide`.
- When two things cook at the same time, a timer can take the thing's name, so the countdowns can be told apart. `~corn` runs while the chicken's `~char` and `~grill` do.
- For a wait under a minute that the cook can walk away from, use a name on the hands-off list in `lib/recipe.js` (`rest`, `cool`, `set`…). That name is what gives the step its wait marker in Cook mode.

## Copy rules

- Ingredient and cookware names are lowercase, except proper nouns (`Parmesan cheese`, `Dutch oven`).
- A size or a stand-in for a piece of cookware goes in its note: `#biscuit cutter{}(4-inch)`, `#jar lifter{}(or tongs)`. The note shows in the Equipment list and not in the step. If the step doesn't make sense without it, say it in the step too.
- An ingredient's name agrees with the recipe's total, because it's spelled the same at every mention. One clove in the whole recipe is `garlic clove`. One clove now and two later is `garlic cloves` both times.
- Name an ingredient as specifically as the source does (`unsalted butter`, `large eggs`), never less.
- Use American spelling. `chile` is the pepper. `chili` is the dish and the powder.
- Steps are full sentences.
- A copy edit never changes an amount, a time, a temperature or the order of steps.
