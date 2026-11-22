import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePick, readDaypart, readSeason } from '../site/assets/pick.js';
import { SEASON_NAMES } from '../lib/validate-recipe.js';

const eggs = { url: '/eggs/', title: 'Eggs', course: 'breakfast', seasons: [] };
const coffee = { url: '/coffee/', title: 'Coffee', course: 'drink', seasons: [] };
const stew = { url: '/stew/', title: 'Stew', course: 'main', seasons: ['fall'] };
const tacos = { url: '/tacos/', title: 'Tacos', course: 'main', seasons: [] };
const slaw = { url: '/slaw/', title: 'Slaw', course: 'side', seasons: ['midsummer'] };
const pie = { url: '/pie/', title: 'Pie', course: 'dessert', seasons: [] };
const pickles = { url: '/pickles/', title: 'Pickles', course: 'condiment', seasons: ['fall'] };
const entries = [eggs, coffee, stew, tacos, slaw, pie, pickles];
const first = () => 0;
const last = () => 0.999;

test('the pick follows the hour, the month and what is already showing', () => {
  const bands = [
    [0, 'night'], [4, 'night'], [5, 'morning'], [10, 'morning'], [11, 'afternoon'],
    [16, 'afternoon'], [17, 'evening'], [20, 'evening'], [21, 'night'], [23, 'night'],
  ];
  for (const [hour, word] of bands) assert.equal(readDaypart(hour).word, word, `hour ${hour}`);

  const seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 'early-summer',
    'midsummer', 'late-summer', 'fall', 'fall', 'fall', 'winter'];
  seasons.forEach((season, monthIndex) => {
    assert.equal(readSeason(monthIndex), season, `month ${monthIndex}`);
    assert.ok(SEASON_NAMES.includes(season), `${season} is a season the recipes can be tagged with`);
  });

  // [hour, monthIndex, excludedUrl, random, expected url or null, isInSeason]
  const picks = [
    [8, 10, null, first, '/eggs/', false],
    [8, 10, null, last, '/coffee/', false],
    [18, 10, null, last, '/stew/', true],      // in fall, the fall main wins a first pick
    [18, 10, '/stew/', first, '/tacos/', false], // "Send back" draws from the whole pool
    [18, 10, '/stew/', last, '/slaw/', false],
    [13, 6, null, first, '/slaw/', true],
    [13, 3, null, first, '/stew/', false],      // nothing tagged spring: whole pool
    [22, 10, null, first, '/pie/', false],
    [22, 10, '/pie/', first, null, false],      // the pool ran dry
  ];
  for (const [hour, monthIndex, excludedUrl, random, url, isInSeason] of picks) {
    const pick = choosePick({ entries, hour, monthIndex, excludedUrl, random });
    const label = `hour ${hour}, month ${monthIndex}, excluding ${excludedUrl}`;
    if (url === null) {
      assert.equal(pick, null, label);
      continue;
    }
    assert.equal(pick.entry.url, url, label);
    assert.equal(pick.isInSeason, isInSeason, label);
    assert.notEqual(pick.entry.course, 'condiment', label);
  }
});
