# cookbook

Personally approved collection of recipes culled from books, shows, and the Internet.

## Run it

You need Node 24.19 or newer.

```bash
npm install
npm start       # local site with live reload
npm run build   # writes the site to _site/
npm test
```

## Add a recipe

Make a file at `recipes/<slug>.cook`. The file name is the page's address (`recipes/pot-roast.cook` becomes `/recipes/pot-roast/`), so use lowercase words joined by hyphens. **Never rename it after you've shared a link.**

Recipes are written in [Cooklang](https://cooklang.org). A complete small one:

```
---
title: Brown Butter Shortbread
description: Crisp shortbread made with browned butter.
tags: [cookies, baking]
course: dessert
author: Jane Baker
source:
  name: Example Kitchen
  url: https://example.com/shortbread
  author: Sam Writer
adapted: true
servings: 8
yield: 16%cookies
time: 1h30m
---

= Dough

Brown the @unsalted butter{227%g}(16 tbsp) in a #small saucepan{}, then cool for ~cool{20%minutes}.

> Brown butter smells nutty when it's ready.

Beat the browned @&unsalted butter{} with @sugar{100%g}(1/2 cup) and @flour{240%g}(2 cups), then bake at 325°F (165°C) for ~bake{25%minutes}.
```

### Front matter keys

These are [Cooklang's canonical keys](https://cooklang.org/docs/conventions/), so a recipe written here works in other Cooklang apps too.

| Key           | Required | What it holds                                                                                     |
| ------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `title`       | yes      | The recipe's name                                                                                 |
| `description` | yes      | One sentence. Shows in link previews and search results                                           |
| `tags`        | no       | A list: `[cookies, baking]`. Lowercase words joined by hyphens. `all` and `recipes` are taken     |
| `course`      | no       | `dessert`, `main`, `side`, `condiment`                                                            |
| `cuisine`     | no       | `French`, `Mexican`                                                                               |
| `author`      | no       | Who created the recipe                                                                            |
| `source`      | no       | A name, a URL, or `{ name, url, author }`. `author` is who wrote the article or book              |
| `adapted`     | no       | `true` shows "Adapted from" instead of "Source:". This one is ours, not Cooklang's                |
| `servings`    | no       | How many it serves                                                                                |
| `yield`       | no       | What it makes, as an amount and unit: `16%cookies`, or a list: `[500%ml, 350%g]`                  |
| `time`        | no       | Total time: `1h30m`, `45m`. Use this, or `prep time` and `cook time`, not both                    |
| `prep time`   | no       | Prep time only: `15m`                                                                             |
| `cook time`   | no       | Cooking time only: `1h`. With prep time, the page shows both and the total goes to search engines |
| `image`       | no       | An image URL, or a list of them. Search engines need one to show a recipe card                    |
| `diet`        | no       | `vegetarian`, or a list. Not shown on the page yet                                                |
| `difficulty`  | no       | `easy`. Not shown on the page yet                                                                 |
| `locale`      | no       | `en_GB`. Not used yet                                                                             |

Cooklang also accepts other names for some keys (`serves`, `category`, `introduction`, `duration`, `images`). The build asks for the names above so every page reads the same key. Any other key stops the build.

### Writing the steps

- One paragraph per step, with a blank line between steps.
- `@name{amount%unit}` for an ingredient, in the step that uses it. Each step carries the amount that step uses.
- **Mentioning an ingredient again? Write `@&name`.** The `&` is what adds the amounts together on the ingredient list (`@&sugar{50%g}`). A repeat can't have its own note in parentheses.
- Names with more than one word need braces even with no amount: `@&egg yolks{}`.
- Keep the name identical every time, or the list splits it into two lines.
- `#name{}` for cookware. This builds the Equipment list. Repeats work the same way: `#&bowl{}`.
- Every timer gets a one-word name: `~bake{20%minutes}`, `~chill{24-36%hours}`. Timers know seconds, minutes, hours and days. Write longer waits as plain words ("at least 1 week").
- A second unit or a count goes in the note: `@egg yolks{110%g}(4 oz, about 7)`.
- `@./other-recipe{}` uses another recipe as an ingredient. Write the other recipe's file name. The page shows its title as a link, and the other recipe's page says where it's used. `@?./other-recipe{}` marks it optional.
- `= Name` starts a section. `>` starts a note, which can use Markdown links and bold.
- Type `1/2`, not `½`.
- Temperatures go in the step text as `350°F (175°C)`.

### Units

Weigh it → grams. Pour it → volume. Under a tablespoon → spoons. Buy it by the pound → pounds.

Use these spellings, in lowercase: `tsp`, `tbsp`, `cup`, `oz`, `lb`, `g`, `kg`, `ml`. Cooklang reads `Tbsp` or `T` as a different unit, so the build stops on them. Cans are `{1%can}` with the size in the note: `@pinto beans{1%can}(15 oz, rinsed)`.

The page prints every amount in one style: `1/2 cup`, `2 cups`, `1 1/2 tsp`, `12–14 minutes`. When an ingredient is measured in several steps, the ingredient list adds them up into kitchen measures (`2 tsp` and `10 tsp` show as `1/4 cup`). Notes are printed as written, so write them the same way.

## Bringing one in from somewhere else

A recipe pasted from Paprika, a web page or another Cooklang cookbook won't build as it arrives. That's on purpose. Here's what usually needs changing:

| It arrives as                        | Change it to                                    |
| ------------------------------------ | ----------------------------------------------- |
| `serves`, `category`, `introduction` | `servings`, `course`, `description`             |
| `time required`, `duration`          | `time`                                          |
| `yield: 24 bars`                     | `yield: 24%bars`                                |
| `nutrition`, `calories`              | Delete it                                       |
| `tags: soup, winter`                 | `tags: [soup, winter]`                          |
| `>> key: value` lines                | Front matter between `---` lines                |
| A separate ingredient list           | Marks inside the steps that use each ingredient |
| `~{5%minutes}`                       | A named timer: `~rest{5%minutes}`               |
| `½`, `¼`                             | `1/2`, `1/4`                                    |
| The same ingredient twice            | `@&name` on the second mention                  |

## When the build fails

The build names the file and says what's wrong. What each message means:

| Message                                               | Fix                                                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `file name must be lowercase words joined by hyphens` | Rename the file: `Mom's Chili.cook` becomes `moms-chili.cook`                                                                       |
| `parser error: ...`                                   | A Cooklang mistake. The message quotes the line. Common ones: a repeat with a note, a `@&` with no earlier mention, a timer in cups |
| `parser error: unreachable`                           | The parser crashed. Look for a mark with no amount, like `~rest` or `@{1%cup}`                                                      |
| `missing title` / `missing description`               | Add the key. If both appear, the front matter's YAML is probably broken                                                             |
| `unknown front matter key "..."`                      | Fix the typo, or move it to a key from the table above                                                                              |
| `write servings, not serves` (or another name)        | Rename the key to the one the message gives                                                                                         |
| `time "..." isn't a time the parser understands`      | Write it like `1h30m`. The same goes for `prep time` and `cook time`                                                                |
| `use time, or prep time and cook time, not both`      | Keep `time` alone, or split it into `prep time` and `cook time`                                                                     |
| `yield "..." must be an amount and unit`              | `yield: 24 bars` becomes `yield: 24%bars`                                                                                           |
| `source must have a name`                             | Add `name` to the `{ name, url }` map, or write the source as plain text                                                            |
| `diet must be text or a list of text` (or `image`)    | `diet: vegetarian` or `diet: [vegetarian, gluten-free]`                                                                             |
| `tag "..." is reserved by the site`                   | `all` and `recipes` name the site's own lists. Pick another tag                                                                     |
| `title must be text` (or another key)                 | Write one plain value: `author: Jacques Torres`, not a list or a `{ name, url }` map. Quote a number: `title: "1984"`               |
| `adapted must be true or false`                       | `adapted: true`, with no quotes                                                                                                     |
| `recipes go directly in recipes/`                     | Move the file out of the subfolder (or out of the stray folder) into `recipes/`                                                     |
| `tag "..." must be lowercase words joined by hyphens` | `Gluten Free` becomes `gluten-free`                                                                                                 |
| `write 1/2, not ½`                                    | Swap the glyph for typed digits                                                                                                     |
| `timer in step N has no name`                         | `~{5%minutes}` becomes `~rest{5%minutes}`                                                                                           |
| `unit "..." in step N isn't one Cooklang knows`       | Use the spelling the message gives: `Tbsp` becomes `tbsp`, `T` becomes `tbsp`, `lbs` becomes `lb`                                   |
| `"..." in step N is mentioned again: write @&...`     | Add `&` to the repeat                                                                                                               |
| `linked recipe "..." doesn't exist`                   | The `@./name{}` mark points at a file that isn't in `recipes/`. Fix the spelling, or add the recipe                                 |
| `linked recipe "..." must be written @./name{}`       | Drop the folder from the mark. Every recipe sits directly in `recipes/`                                                             |
| `linked recipe "..." needs {} after it`               | `@./name` becomes `@./name{}`. Without the braces the mark prints as typed                                                          |
| `linked recipe "..." is this recipe`                  | A recipe can't use itself. Point the mark at the other recipe                                                                       |
| `no steps` / `no ingredients`                         | The recipe needs at least one step and one `@` ingredient                                                                           |

Warnings print during the build but don't stop it.
