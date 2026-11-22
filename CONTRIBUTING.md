# Contributing

Every recipe here was cooked in our kitchen first. Each one keeps its credit and a link back to where it started.

## Add a recipe

1. Make a file at `recipes/<slug>.cook`.
2. Write it. The [recipe format](docs/recipe-format.md) covers what the build checks. The [style guide](docs/style-guide.md) covers how recipes are written here.
3. Run `npm start` and look at the page.
4. Run `npm test`. It has to pass.
5. Open a pull request.

## The file name

The file name is the page's address (`recipes/pot-roast.cook` becomes `/recipes/pot-roast/`), so use lowercase words joined by hyphens. **Never rename it after you've shared a link.**

## Before you open a PR

- [ ] The title is the dish's name. ([Titles](docs/style-guide.md#titles))
- [ ] The description is one sentence with one hook. ([Descriptions](docs/style-guide.md#descriptions))
- [ ] Every tag is one of the allowed kinds, or there are none. ([Tags](docs/style-guide.md#tags), [Seasons](docs/style-guide.md#seasons))
- [ ] The credit is right, and an adapted recipe says what changed. ([Credit](docs/style-guide.md#credit))
- [ ] Times, servings and yield come from the source or the steps. ([Facts](docs/style-guide.md#facts))
- [ ] Repeated ingredients use `@&`, and every timer has a name. ([Marks](docs/recipe-format.md#marks))
- [ ] Sections and notes follow the rules for when to use them. ([Sections](docs/style-guide.md#sections), [Notes](docs/style-guide.md#notes))
- [ ] Amounts, times and temperatures match the source. ([Copy rules](docs/style-guide.md#copy-rules))
- [ ] `npm test` passes. ([When the build fails](docs/recipe-format.md#when-the-build-fails))
