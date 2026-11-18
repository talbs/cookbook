import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeSummary, trimNoteForTotal } from '../lib/recipe.js';

test('a note shown beside a total drops the parts that are amounts', () => {
  const rows = [
    ['1 cup, shredded', 'shredded'],
    ['1 1/2 cups', null],
    ['grated, or Parmigiano Reggiano', 'grated, or Parmigiano Reggiano'],
    ['large', 'large'],
    [null, null],
  ];
  for (const [note, shown] of rows) {
    assert.equal(trimNoteForTotal(note), shown, `note: ${note}`);
  }
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
