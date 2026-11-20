# Cookbook

Personally approved collection of recipes culled from books, shows, and the Internet.

Each recipe is one plain text file written in [Cooklang](https://cooklang.org). [Eleventy](https://www.11ty.dev) turns those files into a static site with a searchable index and a page per tag. Each recipe page has an Overview mode for reading, a Cook mode with countdown timers, and its own print layout.

## Contents

- [Quick start](#quick-start)
- [Commands](#commands)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Tests and CI](#tests-and-ci)
- [Add a recipe](#add-a-recipe)
- [Bringing one in from somewhere else](#bringing-one-in-from-somewhere-else)
- [When the build fails](#when-the-build-fails)
- [License](#license)

## Quick start

You need Node 24.19 or newer (`.node-version` pins it), and npm, which comes with it.

```bash
git clone https://github.com/talbs/cookbook.git
cd cookbook
npm ci
npm start
```

The site is at http://localhost:4186/. If that port is taken, it uses the next free one and prints the address.

Two things to know on a fresh clone:

- **Pages need a network connection to look right.** Web Awesome (the components and page shell) and the Font Awesome icons load from CDNs. The text fonts are in the repo.
- **Titles show in the wrong font.** They're set in [Free Lunch](https://simplebits.shop/products/free-lunch), a paid font that isn't in the repo. Without it titles fall back to a condensed font already on your machine (Avenir Next Condensed on a Mac, Impact on Windows), and the browser logs one missing file: `/assets/fonts/FreeLunch-Regular.woff2`. Everything else works. To see the real titles, put your licensed `FreeLunch-Regular.otf` in `~/.config/cookbook/` and run `npm run font`. It writes the web font to `site/assets/fonts/`, which Git ignores.

## Commands

| Command         | What it does                                                          |
| --------------- | --------------------------------------------------------------------- |
| `npm ci`        | Installs exactly what `package-lock.json` lists                       |
| `npm start`     | Serves the site at http://localhost:4186/ and rebuilds when you save  |
| `npm test`      | Checks the recipe rules and the built pages                           |
| `npm run build` | Writes the site to `_site/`                                           |
| `npm run font`  | Rebuilds the web fonts from source files in `~/.config/cookbook/`     |

`npm start` rebuilds when you save a recipe, a template, a data file or anything in `site/assets/`. It restarts itself when you save `eleventy.config.js` or a file in `lib/`. Either way the browser reloads on its own.

`npm start` and `npm run build` both empty `_site/` first, so a renamed or deleted recipe never leaves an old page behind. `_site/` is the only folder they write to. `npm test` builds the site in memory and writes nothing.

## How it works

1. Eleventy finds every `recipes/*.cook` file. `eleventy.config.js` tells it what a `.cook` file is.
2. `lib/recipe.js` reads the file with the official Cooklang parser (`@cooklang/cooklang`), then shapes the result for the page: ingredients with their amounts added up, equipment, steps, timers and notes.
3. `lib/validate-recipe.js` checks the recipe against this site's rules. One bad recipe stops the build with exit code 1 and names the file. [When the build fails](#when-the-build-fails) lists each message.
4. `site/_includes/recipe.njk` lays the recipe out as a page at `/recipes/<file name>/`. It also writes [schema.org Recipe](https://schema.org/Recipe) data into the page for search engines.
5. The templates in `site/pages/` build everything else from the same recipes: the index, the tag pages and the About page. They also write `search.json`, which the search box reads.

No bundler, no framework. The scripts in `site/assets/` are plain ES modules, and the browser loads them as written.

## Project layout

```
recipes/              One .cook file per recipe. The file name is the URL
  recipes.json        Gives every recipe the recipe.njk layout
site/                 Everything that turns recipes into a website
  pages/              Every page that isn't a recipe
    index.njk         Home: all recipes, with search, a time filter and a cards/list switch
    tags.njk          /tags/, every tag grouped as dishes, methods and seasons
    tag.njk           /tags/<tag>/, one page per tag
    about.njk         /about/
    404.njk
    search.11ty.js    /search.json, what the search box reads
  _includes/          Layouts and partials
    base.njk          The HTML shell, CDN links, font preloads and color scheme
    recipe.njk        The recipe page
    listing.njk       The shell shared by index, tag and About pages
    recipe-list.njk   Recipe cards
    site-header.njk, site-nav.njk, site-footer.njk
  _data/              Site-wide data: the site title, footer links, the jokes shown when a search finds nothing
  assets/             Sent to the browser as written, served from /assets/
    site.css          All the site's own styles
    listing.js        Search, the time filter and the cards/list switch
    recipe.js         Overview and Cook modes, checked-off steps, print
    timers.js         Countdown timers in Cook mode
    timer-phase.js    Timer math, shared with the tests
    open-fonts/       The two text fonts and their licenses
lib/                  Build-time code (Node)
  recipe.js           Parses a .cook file and shapes it for the templates
  validate-recipe.js  The recipe rules and their error messages
  quantity.js         Units, and how amounts are added up and printed
  notes.js            Splits a note into its title and body
  typeset.js          Fractions, number ranges and line-break rules for text
  json-ld.js          The schema.org data for search engines
  icon-names.js       The Font Awesome icons a recipe may use
test/                 Node's built-in test runner
  fixtures/           Sample recipes, most of them broken on purpose, one per rule
scripts/
  make-fonts.js       What npm run font runs. Trims each font to the characters the site uses
eleventy.config.js    The .cook extension, filters, the recipes collection, dev server settings
```

## Tests and CI

`npm test` runs four files with Node's built-in test runner. Nothing else to install.

- `test/validation.test.js` loads each broken recipe in `test/fixtures/` and expects the build to refuse it and name the file.
- `test/recipe.test.js` covers how a recipe is shaped: notes, timing totals, timers, ingredient totals and the search engine data.
- `test/site.test.js` builds the whole site in memory. It checks that every recipe has a page and the home page links to all of them. It also checks `search.json`, that each recipe page carries search engine data, and that every link on the site leads to a page.
- `test/timer-phase.test.js` covers the timer math.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm test` and `npm run build` on every pull request and on every push to `main`. It doesn't deploy anything.

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

| Key           | Required | What it holds                                                                                                                                                                                                                                                                        |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`       | yes      | The recipe's name                                                                                                                                                                                                                                                                    |
| `description` | yes      | One sentence. Shows in link previews and search results                                                                                                                                                                                                                              |
| `tags`        | no       | A list: `[cookies, baking]`, in lowercase words joined by hyphens. Three kinds: dish type (`pasta`), method or gear (`sheet-pan`) and season. The seasons are `spring`, `early-summer`, `midsummer`, `late-summer`, `fall`, `winter` and `year-round`. `all` and `recipes` are taken |
| `course`      | yes      | One of `main`, `side`, `dessert`, `breakfast`, `drink`, `condiment`                                                                                                                                                                                                                  |
| `cuisine`     | no       | `French`, `Mexican`. Shows with the recipe's other facts                                                                                                                                                                                                                             |
| `author`      | no       | Who created the recipe                                                                                                                                                                                                                                                               |
| `source`      | no       | A name, a URL, or `{ name, url, author, book }`. `author` is who wrote the article or book. `book` is the book's title, shown after the name                                                                                                                                         |
| `adapted`     | no       | `true` shows "Adapted from" instead of "Source:". This one is ours, not Cooklang's                                                                                                                                                                                                   |
| `servings`    | no       | How many it serves                                                                                                                                                                                                                                                                   |
| `yield`       | no       | What it makes, as an amount and unit: `16%cookies`, or a list: `[500%ml, 350%g]`                                                                                                                                                                                                     |
| `time`        | no       | Total time: `1h30m`, `45m`. Use this, or `prep time` and `cook time`, not both                                                                                                                                                                                                       |
| `prep time`   | no       | Prep time only: `15m`                                                                                                                                                                                                                                                                |
| `cook time`   | no       | Cooking time only: `1h`. With prep time, the page shows both and the total goes to search engines                                                                                                                                                                                    |
| `image`       | no       | An image URL, or a list of them. Not shown on the page. Search engines need one to show a recipe card                                                                                                                                                                                |
| `diet`        | no       | `vegetarian`, or a list. Not used yet                                                                                                                                                                                                                                                |
| `difficulty`  | no       | `easy`, or leave it off. Easy means few steps and little hands-on work. Gear like a food processor or pressure cooker is fine. Shows with the recipe's other facts                                                                                                                   |
| `locale`      | no       | `en_GB`. Not used yet                                                                                                                                                                                                                                                                |
| `why`         | no       | Why the method works, as a list of sentences. Shows under "Why it works" in Overview only                                                                                                                                                                                            |
| `icons`       | yes      | Three Font Awesome icon names, most defining first: `[pepper-hot, garlic, bowl-hot]`. Shown on the recipe's card and on the rule above its credits. New names go in `lib/icon-names.js` first. This one is ours, not Cooklang's                                                      |

Cooklang also accepts other names for some keys (`serves`, `category`, `introduction`, `time required`, `duration`, `images`, `picture`, `pictures`). The build asks for the names above so every page reads the same key. Any other key stops the build.

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
- A note after a step folds under that step. Start it with a bold title and a dash, `> **Storing** — Keeps for 2 weeks.`, and the title is what shows when it's folded. With no title, the first sentence is the title, so a one-sentence note needs one.
- A note before the first step shows under "Before you start", in both modes. Keep it to things the cook does first (wear gloves, get a pressure cooker). Reasons the method works go in `why` instead.
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
| `note "..." is one sentence, so give it a title`      | Start the note with a bold title and a dash: `> **Storing** — Keeps for 2 weeks.`                                                   |
| `missing title` / `missing description`               | Add the key. If both appear, the front matter's YAML is probably broken                                                             |
| `missing course`                                      | Add `course:` with one of the six courses in the table above                                                                        |
| `course "..." must be one of ...`                     | Pick one of the six the message lists: `brunch` becomes `breakfast`                                                                 |
| `missing icons`                                       | Add three names from `lib/icon-names.js`                                                                                            |
| `icons must list exactly three names`                 | List three names                                                                                                                    |
| `icon "..." isn't in lib/icon-names.js`               | Check the spelling, or add the name to `lib/icon-names.js` after checking it renders                                                |
| `icon "..." is listed twice`                          | Pick a different third icon                                                                                                         |
| `difficulty "..." must be easy, or left off`          | Write `difficulty: easy`, or delete the line                                                                                        |
| `tag "..." isn't a season here`                       | Use the season the message gives: `autumn` becomes `fall`, `summer` becomes `early-summer`, `midsummer` or `late-summer`            |
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

## License

[MIT](LICENSE). That covers the code. The recipes are adapted from other people's work, and each one credits its source.
