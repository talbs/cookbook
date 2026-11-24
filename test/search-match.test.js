import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMatches, prepareEntries } from '../site/assets/search-match.js';

const entries = prepareEntries([
  { url: '/sauce/', title: 'Peruvian Green Sauce', description: 'Bright.', tags: ['condiments'], course: 'condiment', ingredients: ['jalapeños', 'cilantro'] },
  { url: '/pickles/', title: 'Pickled Jalapeños', description: 'Quick.', tags: ['pickles'], course: 'condiment', ingredients: ['jalapeño peppers'] },
  { url: '/tacos/', title: 'Cauliflower Tacos', description: 'Crisp.', tags: ['air-fryer'], course: 'main', ingredients: ['cauliflower'] },
  { url: '/ziti/', title: 'Baked Ziti', description: 'Cheesy weeknight pasta.', tags: [], course: 'main', ingredients: ['ziti'] },
]);

test('findMatches orders and explains matches', () => {
  const rows = [
    { query: 'jalapeno', urls: ['/pickles/', '/sauce/'], reasons: ['', 'has jalapeños'] },
    { query: 'air fryer', urls: ['/tacos/'], reasons: ['tagged air fryer'] },
    { query: 'TACOS cauli', urls: ['/tacos/'], reasons: [''] },
    { query: 'weeknight', urls: ['/ziti/'], reasons: [''] },
    { query: 'main', urls: ['/tacos/', '/ziti/'], reasons: ['', ''] },
    { query: 'ziti kale', urls: [], reasons: [] },
    { query: '   ', urls: [], reasons: [] },
    { query: 'c++ (\\', urls: [], reasons: [] },
  ];
  for (const { query, urls, reasons } of rows) {
    const matches = findMatches(entries, query);
    assert.deepEqual(matches.map(match => match.entry.url), urls, `urls for "${query}"`);
    assert.deepEqual(matches.map(match => match.reason), reasons, `reasons for "${query}"`);
  }
});
