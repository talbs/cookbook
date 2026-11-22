import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNoteTitle } from '../lib/notes.js';
import { formatTimeSummary, loadRecipe, widenTimeForTimers } from '../lib/recipe.js';

test('the ingredient list adds up every mention of an ingredient', () => {
  const { recipe } = loadRecipe('test/fixtures/totals.cook');
  assert.deepEqual(
    recipe.ingredients.map(ingredient => ingredient.text),
    [
      '1 1/2 cups flour',
      '1 tbsp plus 1 tsp sugar',
      '3 eggs',
      '360 ml milk',
      '1/3 cup plus 2 tsp honey',
      '1 1/4 lb butter',
      '6 oz cheddar (shredded)',
      '1 1/2 kg potatoes',
      '1/4 cup parmesan (1 oz, grated)',
      '2 tbsp parsley (optional)',
      'Good Recipe',
    ]
  );
});

test('a timing total whose ends round to one figure reads as about that figure', () => {
  const rows = [
    [13, 15, 'about 15 min'],
    [24, 27, 'about 25 min'],
    [38, 44, '40–45 min'],
    [15, 15, '15 min'],
  ];
  for (const [low, high, shown] of rows) {
    assert.equal(formatTimeSummary(low, high), shown, `${low} to ${high} minutes`);
  }
});

test("a note's bold title splits from its body, and a note without one has no title", () => {
  const rows = [
    ['**Fingertip tight** — Turn until snug.', { title: 'Fingertip tight', rest: 'Turn until snug.' }],
    ['**Dialing it in**\n\n- Grind finer.\n\n- Grind coarser.', { title: 'Dialing it in', rest: '- Grind finer.\n\n- Grind coarser.' }],
    ['**Storing**', { title: 'Storing', rest: '' }],
    ['Rest the batter. It thickens as it sits.', null],
  ];
  for (const [note, expected] of rows) {
    assert.deepEqual(splitNoteTitle(note), expected, `note: ${note}`);
  }
});

test('a step gets a band for each timer worth counting down', () => {
  const { recipe } = loadRecipe('test/fixtures/timers.cook');
  const steps = recipe.sections.flatMap(section =>
    section.blocks.filter(block => block.type === 'steps').flatMap(block => block.steps)
  );
  const expectedBandsPerStep = [
    [['roast', true, 20, 20]],
    [['roast', true, 30, 40]],
    [['simmer', true, 10, 10]],
    [['rest', false, 0.5, 0.5]],
    [],
    [['chill', true, 480, 960]],
    [
      ['cook', true, 5, 6],
      ['cook', true, 1, 1],
    ],
    [['roast', true, 20, 20]],
    [],
  ];
  const shownBandsPerStep = steps.map(step =>
    step.bands.map(band => [band.name, band.isCountable, band.lowMinutes, band.highMinutes])
  );
  assert.deepEqual(shownBandsPerStep, expectedBandsPerStep);

  const bandIds = steps.flatMap(step => step.bands.map(band => band.id));
  assert.equal(new Set(bandIds).size, bandIds.length);
});

test("a recipe's stated time never promises less than its timers add up to", () => {
  const rows = [
    [600, { min: 570, max: 1050 }, { min: 600, max: 1080 }],
    [90, { min: 38, max: 44 }, { min: 90, max: 90 }],
    [145, { min: 1541, max: 1543 }, { min: 145, max: 145 }],
    [15, undefined, { min: 15, max: 15 }],
    [null, { min: 5, max: 10 }, null],
  ];
  for (const [stated, timerTotal, shown] of rows) {
    assert.deepEqual(widenTimeForTimers(stated, timerTotal), shown, `stated: ${stated}`);
  }
});

test("a recipe's search engine data carries its times, yield, credit and steps", () => {
  const { jsonLd } = loadRecipe('test/fixtures/search-engine-data.cook');
  assert.deepEqual(JSON.parse(jsonLd), {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Search Engine Data',
    description: 'A small test recipe with every field search engines read.',
    image: ['https://example.com/roast.jpg'],
    recipeCategory: 'main',
    recipeCuisine: 'Italian',
    keywords: 'weeknight, roasting',
    recipeYield: '4 bowls',
    prepTime: 'PT20M',
    cookTime: 'PT1H10M',
    totalTime: 'PT1H30M',
    recipeIngredient: ['1 kg potatoes', '3 cloves garlic', '2 tbsp olive oil'],
    recipeInstructions: [
      {
        '@type': 'HowToSection',
        name: 'Prep',
        itemListElement: [{ '@type': 'HowToStep', text: 'Peel the potatoes and slice the garlic.' }],
      },
      {
        '@type': 'HowToSection',
        name: 'Roast',
        itemListElement: [
          { '@type': 'HowToStep', text: 'Toss everything in a roasting pan with the olive oil.' },
          { '@type': 'HowToStep', text: 'Roast for 1 hour until golden.' },
        ],
      },
    ],
    tool: ['roasting pan'],
    isBasedOn: 'https://example.com/roast',
    author: { '@type': 'Person', name: 'Test Cook' },
  });
});
