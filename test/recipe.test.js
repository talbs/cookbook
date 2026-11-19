import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitNoteTitle } from '../lib/notes.js';
import { findBands, formatTimeSummary, trimNoteForTotal, widenTimeForTimers } from '../lib/recipe.js';

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

test('a step gets a band for each timer worth counting down', () => {
  const row = (name, lowMinutes, highMinutes, label) => ({ name, lowMinutes, highMinutes, label });
  const rows = [
    [[row('roast', 20, 20, '20 min')], [['roast', true, 20, 20]]],
    [[row('roast', 30, 40, '30–40 min')], [['roast', true, 30, 40]]],
    [[row('simmer', 10, 10, '10 min')], [['simmer', true, 10, 10]]],
    [[row('rest', 0.5, 0.5, '30 sec')], [['rest', false, 0.5, 0.5]]],
    [[row('whisk', 0.5, 0.5, '30 sec')], []],
    [[row('chill', 480, 960, '8–16 hr')], [['chill', true, 480, 960]]],
    [
      [row('cook', 5, 6, '5–6 min'), row('cook', 1, 1, '1 min')],
      [
        ['cook', true, 5, 6],
        ['cook', true, 1, 1],
      ],
    ],
    [[row('rest', 0.5, 0.5, '30 sec'), row('roast', 20, 20, '20 min')], [['roast', true, 20, 20]]],
    [[row('', 5, 5, '5 min')], [['timer', true, 5, 5]]],
    [[], []],
  ];
  for (const [timers, expected] of rows) {
    const bands = findBands(timers, 's0-1');
    const shown = bands.map(band => [band.name, band.isCountable, band.lowMinutes, band.highMinutes]);
    const message = `timers: ${timers.map(timer => timer.name).join(', ')}`;
    assert.deepEqual(shown, expected, message);
    assert.equal(new Set(bands.map(band => band.id)).size, bands.length, message);
  }
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
