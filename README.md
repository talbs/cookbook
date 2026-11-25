# Cookbook

Recipes, personally approved. Culled from books, shows, and the Internet, then changed until we liked them better.

Each recipe is one plain text file written in [Cooklang](https://cooklang.org). [Eleventy](https://www.11ty.dev) turns those files into a static site with an index, a page per tag and a search dialog on every page. Each recipe page has an Overview mode for reading, a Cook mode with countdown timers, and its own print layout.

## Contents

- [Quick start](#quick-start)
- [Commands](#commands)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Tests and CI](#tests-and-ci)
- [Deploy](#deploy)
- [Adding a recipe](#adding-a-recipe)
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
3. `lib/validate-recipe.js` checks the recipe against this site's rules. One bad recipe stops the build with exit code 1 and names the file. [When the build fails](docs/recipe-format.md#when-the-build-fails) lists each message.
4. `site/_includes/recipe.njk` lays the recipe out as a page at `/recipes/<file name>/`. It also writes [schema.org Recipe](https://schema.org/Recipe) data into the page for search engines.
5. The templates in `site/pages/` build everything else from the same recipes: the index, the tag pages and the About page. They also write `search.json`, which the search dialog and the 404's Today's Special read.
6. The build also publishes each recipe's `.cook` file as plain text at `/recipes/<file name>.txt` and writes `/llms.txt`, a list of every recipe for AI agents. `/sitemap.xml` lists every page for search engines, and `/robots.txt` points them to it. On a recipe page, the File link in the footer shows the file.

No bundler, no framework. The scripts in `site/assets/` are plain ES modules, and the browser loads them as written.

## Project layout

```
recipes/              One .cook file per recipe. The file name is the URL
  recipes.json        Gives every recipe the recipe.njk layout
site/                 Everything that turns recipes into a website
  pages/              Every page that isn't a recipe
    index.njk         Home: all recipes, with Chef's Pick, a time filter and a cards/list switch
    tags.njk          /tags/, every tag grouped as dishes, methods and seasons
    tag.njk           /tags/<tag>/, one page per tag
    about.njk         /about/
    404.njk
    search.11ty.js    /search.json, what search and the 404 read
    raw-recipe.11ty.js /recipes/<file name>.txt, each recipe's .cook file as plain text
    llms.11ty.js      /llms.txt, every recipe's file, grouped by course
    sitemap.11ty.js   /sitemap.xml, every page's address for search engines
    robots.11ty.js    /robots.txt, which points crawlers to the sitemap
  _includes/          Layouts and partials
    base.njk          The HTML shell, CDN links, font preloads and color scheme
    recipe.njk        The recipe page
    listing.njk       The shell shared by index, tag and About pages
    pick-popover.njk  The Chef's Pick panel
    search-dialog.njk The search dialog on every page, opened from the header or with ⌘K / Ctrl+K
    recipe-list.njk   Recipe cards
    site-header.njk, site-nav.njk, site-footer.njk
  _data/              Site-wide data: the site title, footer links, the jokes shown when a search finds nothing
  assets/             Sent to the browser as written, served from /assets/
    site.css          All the site's own styles
    listing.js        The time filter, the cards/list switch and Chef's Pick
    search.js         The search dialog: results, keyboard and the ?q= address. Reports searches that find nothing to Umami as `search-empty`
    search-match.js   How a search matches and orders recipes, shared with the tests
    pick.js           Chooses the Chef's Pick, shared with the tests
    recipe.js         Overview and Cook modes, checked-off steps, print
    scheme.js         The light/dark toggle
    source.js         The recipe's .cook file in a dialog, with Cooklang colors
    timers.js         Countdown timers in Cook mode
    timer-phase.js    Timer math, shared with the tests
    transition.js     View transitions and the panel open/close marks
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
docs/                 How to write a recipe
  recipe-format.md    What the build checks, and what each error means
  style-guide.md      How recipes are written here
eleventy.config.js    The .cook extension, filters, the recipes collection, dev server settings
CONTRIBUTING.md       How to add a recipe, with a checklist for the pull request
AGENTS.md             Notes for coding agents
```

## Tests and CI

`npm test` runs five files with Node's built-in test runner. Nothing else to install.

- `test/validation.test.js` loads each broken recipe in `test/fixtures/` and expects the build to refuse it and name the file.
- `test/recipe.test.js` covers how a recipe is shaped: notes, timing totals, timers, ingredient totals and the search engine data.
- `test/site.test.js` builds the whole site in memory. It checks that every recipe has a page and the home page links to all of them. It also checks `search.json`, that each recipe page carries search engine data, and that every link on the site leads to a page. Each recipe's `.cook` file must be published unchanged, `llms.txt` must list every recipe, and `sitemap.xml` every page.
- `test/timer-phase.test.js` covers the timer math.
- `test/pick.test.js` covers how Chef's Pick chooses a recipe by hour and season.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm test` and `npm run build` on every pull request. It doesn't deploy anything.

## Deploy

Every push to `main` publishes the site to https://cookbook.talbs.me through GitHub Pages (`.github/workflows/deploy.yml`). It runs the tests, adds the title font, builds, and publishes `_site/`. It can also be run by hand from the Actions tab, from `main` only.

The title font isn't in the repo, so the deploy reads it from a repository secret named `TITLE_FONT_WOFF2_BASE64`. If the secret is missing, cut off, or isn't a web font, the deploy stops and the live site stays as it was. To set or replace it, run `npm run font`, then:

```bash
base64 -i site/assets/fonts/FreeLunch-Regular.woff2 | gh secret set TITLE_FONT_WOFF2_BASE64
```

One-time setup, before the first push to `main`:

1. Add a DNS record: `cookbook` as a `CNAME` pointing to `talbs.github.io`.
2. Set the font secret with the command above.
3. In the repo's Pages settings, set the source to "GitHub Actions" and the custom domain to `cookbook.talbs.me`.
4. Turn on "Enforce HTTPS" there once GitHub has issued the certificate.

## Adding a recipe

Each recipe is one `.cook` file in `recipes/`, and [CONTRIBUTING.md](CONTRIBUTING.md) walks through adding one. The [recipe format](docs/recipe-format.md) covers what the build checks, and the [style guide](docs/style-guide.md) covers how recipes are written.

## License

[MIT](LICENSE). That covers the code. The recipes are adapted from other people's work, and each one credits its source.
