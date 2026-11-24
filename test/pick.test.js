import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePick, chooseSurprise, readDaypart, readSeason } from '../site/assets/pick.js';
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

test('the pick follows the hour and the date', () => {
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

  const at = (day, hour, monthIndex = 10) => new Date(2026, monthIndex, day, hour);
  const urlAt = (day, hour, monthIndex) => choosePick({ entries, date: at(day, hour, monthIndex) })?.entry.url ?? null;

  // The same period on the same day always gives the same recipe.
  assert.equal(urlAt(23, 8), urlAt(23, 10));
  // The period's edges: 5:00 is already morning, 4:59 is still last night.
  assert.equal(urlAt(23, 5), urlAt(23, 8));
  assert.equal(urlAt(24, 2), urlAt(23, 22), 'the night pick survives midnight');
  // A pool is walked once before any recipe repeats.
  const mornings = new Set([urlAt(23, 8), urlAt(24, 8)]);
  assert.deepEqual([...mornings].sort(), ['/coffee/', '/eggs/']);
  const aprilLunches = new Set([1, 2, 3].map((day) => urlAt(day, 13, 3)));  // nothing tagged spring, so the pool is stew, tacos, slaw
  assert.equal(aprilLunches.size, 3);
  // Season wins whenever it matches the period.
  for (const day of [20, 21, 22, 23]) {
    assert.equal(urlAt(day, 18), '/stew/');
    assert.equal(choosePick({ entries, date: at(day, 18) }).isInSeason, true);
  }
  assert.equal(urlAt(1, 13, 6), '/slaw/');                                  // July is midsummer
  // A fall condiment never wins: its course fits no period.
  assert.notEqual(urlAt(23, 13), '/pickles/');
  // Nothing to recommend.
  assert.equal(choosePick({ entries: [eggs], date: at(23, 22) }), null);

  // Surprise Me draws from everything except the recommendation.
  assert.equal(chooseSurprise({ entries, excludedUrl: '/eggs/', random: first }).url, '/coffee/');
  assert.equal(chooseSurprise({ entries, excludedUrl: '/pickles/', random: last }).url, '/pie/');
  assert.equal(chooseSurprise({ entries: [eggs], excludedUrl: '/eggs/' }), null);
});
