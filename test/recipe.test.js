import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findWait, formatTimeSummary, splitNoteTitle, trimNoteForTotal } from '../lib/recipe.js';

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

test("a note's title and body together carry the whole note, with nothing said twice", () => {
  const rows = [
    ['Rest the batter. It thickens as it sits.', 'Rest the batter.', 'It thickens as it sits.'],
    ['Rest the batter.', 'Rest the batter.', ''],
    ['Hold at 350°F (175°C). Serve warm.', 'Hold at 350°F (175°C).', 'Serve warm.'],
    ['Do this in order\n\n1. Mix.\n\n2. Rest.', 'Do this in order', '1. Mix.\n\n2. Rest.'],
    ['**Fingertip tight** — Turn until snug.', 'Fingertip tight', 'Turn until snug.'],
  ];
  for (const [note, title, rest] of rows) {
    assert.deepEqual(splitNoteTitle(note), { title, rest }, `note: ${note}`);
  }
});

test('a step is followed by a wait only for a timer the cook walks away from', () => {
  const rest = { name: 'rest', minutes: 30, label: '30 min' };
  const bake = { name: 'bake', minutes: 45, label: '45 min' };
  const brown = { name: 'brown', minutes: 8, label: '8 min' };
  const rows = [
    [[rest], '30 min'],
    [[brown], null],
    [[brown, rest, bake], '45 min'],
    [[], null],
  ];
  for (const [timers, shown] of rows) {
    assert.equal(findWait(timers), shown, `timers: ${timers.map(timer => timer.name).join(', ')}`);
  }
});
