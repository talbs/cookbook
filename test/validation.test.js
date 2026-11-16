import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRecipe } from '../lib/recipe.js';

const malformedRecipes = [
  ['parser-error.cook', /parser error/],
  ['missing-title.cook', /missing title/],
  ['empty-description.cook', /missing description/],
  ['unknown-key.cook', /unknown front matter key "nutrition"/],
  ['no-steps.cook', /no steps/],
  ['no-ingredients.cook', /no ingredients/],
  ['bad-time.cook', /time "soon" isn't a time the parser understands/],
  ['bad-source.cook', /source must have a name/],
  ['bad-tag.cook', /tag "Gluten Free" must be lowercase words joined by hyphens/],
  ['Bad Name.cook', /file name must be lowercase words joined by hyphens/],
  ['glyph-fraction.cook', /write 1\/2, not ½/],
  ['unnamed-timer.cook', /timer in step 1 has no name/],
  ['repeat-without-reference.cook', /"eggs" in step 2 is mentioned again: write @&eggs/],
  ['title-list.cook', /title must be text/],
  ['author-map.cook', /author must be text/],
  ['adapted-text.cook', /adapted must be true or false/],
  ['wrong-unit-case.cook', /unit "Tbsp" in step 1 isn't one Cooklang knows: write tbsp/],
  ['alias-key.cook', /write servings, not serves/],
  ['text-yield.cook', /yield "24 bars" must be an amount and unit/],
  ['time-and-prep.cook', /use time, or prep time and cook time, not both/],
  ['reserved-tag.cook', /tag "all" is reserved/],
  ['missing-linked-recipe.cook', /linked recipe "no-such-recipe" doesn't exist/],
  ['linked-recipe-in-subfolder.cook', /linked recipe "\.\/toppings\/good" must be written @\.\/good\{\}/],
  ['linked-recipe-without-braces.cook', /linked recipe "\.\/good" needs \{\} after it: write @\.\/good\{\}/],
  ['links-to-itself.cook', /linked recipe "links-to-itself" is this recipe/],
  ['missing-course.cook', /missing course/],
  ['bad-course.cook', /course "brunch" must be one of main, side, dessert, breakfast, drink, condiment/],
  ['bad-difficulty.cook', /difficulty "medium" must be easy, or left off/],
  ['wrong-season-word.cook', /tag "summer" isn't a season here: write early-summer, midsummer or late-summer/],
];

test('a malformed recipe fails to load and names its file', () => {
  for (const [fileName, expectedProblem] of malformedRecipes) {
    const inputPath = `test/fixtures/${fileName}`;
    assert.throws(
      () => loadRecipe(inputPath),
      error => error.message.includes(inputPath) && expectedProblem.test(error.message),
      `${fileName} should fail with ${expectedProblem}`
    );
  }

  for (const fileName of ['good.cook', 'canonical-keys.cook']) {
    assert.doesNotThrow(() => loadRecipe(`test/fixtures/${fileName}`), fileName);
  }
});
