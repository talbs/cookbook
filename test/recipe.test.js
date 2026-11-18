import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimNoteForTotal } from '../lib/recipe.js';

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
