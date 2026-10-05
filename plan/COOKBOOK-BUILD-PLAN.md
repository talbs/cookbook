# Cookbook build plan

The order to build in, what is still undecided, and what to watch for when testing.

Status: **not started.** Nothing below is built. The repo holds 10 recipes as plain Markdown, the mock, and these notes.

## Before the first task

Three things need Brian's answer or a quick check, because they change early work.

1. **Table engine.** D-23 recommends CSS grid with equal-fraction rows over table layout. It needs a screen reader pass to confirm. Decide before porting the CSS.
2. **Font Awesome kit.** Make a Pro kit with the handful of icons the page uses, in one style (Regular or Light). Check that the Eleventy plugin accepts it. The mock's yield and active-time icons are stand-ins.
3. **Site URL.** The mock's canonical URL assumes `https://talbs.github.io/cookbook/`.

## Tasks, in order

Each task is small, has a file and a check. Write the failing test first where a test is named.

### 1. Project setup

- [ ] Replace the Python `.gitignore` with one for Node: `_site/`, `node_modules/`, `.env`. Check: `git status` stays clean after an install and a build.
- [ ] `npm init`, add `@11ty/eleventy` only. Match the lockfile's package manager from here on. Check: `npx @11ty/eleventy --version` prints.
- [ ] Add `eleventy.config.js` with input and output directories and nothing else. Check: a build produces `_site/`.

### 2. The layout function

File: `lib/recipe-table.js`. Tests: `test/recipe-table.test.js`, run with `node --test`.

- [ ] Test and implement validation: every ingredient used once, every step but the last used once, unknown ids rejected. Check: the pumpkin bars' missing ingredients fail with a message that names them.
- [ ] Test and implement row order for the cookies. Check: 12 rows in the order the mock shows.
- [ ] Test and implement row span and column for each step. Check: matches the worked example in COOKBOOK-DATA-FORMAT.md.
- [ ] Test and implement column span and fill cells. Check: chocolate's fill is 3 columns, sea salt's is 5.
- [ ] Test and implement `data-steps` and note numbering.
- [ ] Add the flan cake and the pot de crème as fixtures. Check: both produce a valid layout. Expect to learn something here.

### 3. Convert three recipes

- [ ] `recipes/desserts/chocolate-chip-cookies.md`, from the example in COOKBOOK-DATA-FORMAT.md.
- [ ] `recipes/desserts/magic-chocolate-flan-cake.md`.
- [ ] `recipes/desserts/chocolate-pot-de-creme.md`. This is the stress case: many steps, few ingredients, a long tools list, long notes.

Check for each: the build passes validation.

### 4. One page, unstyled

- [ ] `_includes/recipe.liquid`: the markup from the mock, driven by the layout function. Check: the built HTML for the cookies matches the mock's structure element for element.
- [ ] A directory data file so every recipe uses the layout.

### 5. Styles

- [ ] Move the mock's CSS into `_includes/recipe.css` and inline it in the head. Check: the built cookies page looks like the mock at 375px, 800px and 1280px.
- [ ] Generate the per-recipe focus rules from the layout. Check with a real click.
- [ ] Generate the marker stroke from the accent color.
- [ ] Self-host the two Atkinson font files with `font-display: swap`. Check: no request to Google.
- [ ] Run the floor audit on the built page. Check: only the two expected scale-name findings (D-24).

### 6. Icons and head

- [ ] Add `@11ty/font-awesome` with the kit. Check: icons render as inline SVG, no webfont request.
- [ ] Title, description, canonical, Open Graph, JSON-LD from data. Check: Google's Rich Results Test parses the Recipe.

### 7. The rest

- [ ] Index page: recipes grouped by folder. Not designed yet. Keep it a plain list.
- [ ] Print stylesheet: black on white, table unrolled to full width, no pinning, textures kept or dropped (decide by printing).
- [ ] Convert the other seven recipes.
- [ ] GitHub Action to build and deploy to Pages. The kit token is a repository secret.
- [ ] Lighthouse, all four categories, on a recipe page and the index.

## Open questions

Design:

- Palette source: map the four base colors to named steps from Quiet, Harmony or Tailwind (colors.abeautifulsite.net), or keep the hand-tuned values.
- Long tools and prep on a phone push the table down by about 150px. A phone-only disclosure was proposed.
- Long notes make a tall card. May need the same treatment.
- A step that spans two columns is very wide in scrolling mode, and its label can slide behind the pinned column.
- In scrolling mode the scrollbar sits right above the notes divider and the two read as a pair of lines.
- A very long ingredient name widens the whole ingredient column in wide mode, because nothing wraps. Needs a maximum width.
- Optional steps, stopping points and repeats are designed (D-11) but not in the mock or the format.
- The index page has no design.
- Whether to show a key for the textures, and where. It is site-level help, so not on the card.

Engineering:

- How to produce readable `HowToStep` text for structured data from terse table text.
- How to turn "25 hr" into an ISO 8601 duration.
- Whether focusable table cells are acceptable for the focus state.
- Whether Google will show recipe rich results with no image.

## Test notes

- Width matters more than device. Test the table region at just under and just over 60rem, where the two modes switch.
- The table at 1280px has no spare width. Any change that adds horizontal space (padding, gaps, a longer ingredient) can tip desktop into scrolling mode. Re-check `tableFits` after spacing changes.
- Equal row heights only hold while no step needs more height than its rows give it. Test with a long step beside one or two ingredients.
- Check the leaders at real size on a non-retina screen. They are 1.2px dots at 40% opacity.
- Check `:target` by loading a URL with `#note-1` and with `#step-4`.
- Check with `alpha()` unavailable by temporarily breaking the `@supports` test. Hairlines and textures must still show.
- Check forced colors (Windows High Contrast, or emulate in dev tools).
- Check reduced motion.
- Print at least once. It has never been tried.

## Later ideas

- **Spin the texture library off into its own thing.** Brian flagged this on 2026-10-04. The marks in COOKBOOK-DESIGN.md and the twelve specimens in `docs/mocks/archive/04-texture-systems.html` are the starting point. Nothing is planned yet: no name, no format, no scope. Ask before building anything.
- A cross-document view transition where the top card lifts to show the next recipe (D-12).

## Not doing

Scaling, unit conversion, shopping lists, cook mode, timers, search, tags, images, themes, a dark scheme, Web Awesome components, any script that a page depends on. See D-01, D-02 and D-25.
