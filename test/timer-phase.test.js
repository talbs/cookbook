import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLongTimer, readTimerPhase } from '../assets/timer-phase.js';

const m = (minutes) => minutes * 60 * 1000;

test("a timer's phase follows its start time, low end and high end", () => {
  const rows = [
    [null, 20, 20, 5, 'idle', null, 0],
    [0, 20, 20, 5, 'running', m(20), 0.25],
    [0, 20, 20, 20, 'done', null, 1],
    [0, 30, 40, 10, 'running', m(30), 0.25],
    [0, 30, 40, 30, 'check', m(40), 0.75],
    [0, 30, 40, 40, 'done', null, 1],
    [0, 30, 40, 500, 'done', null, 1],
  ];
  for (const [
    startedAt,
    low,
    high,
    now,
    phase,
    targetAt,
    fractionDone,
  ] of rows) {
    const timer = { startedAt, lowMs: m(low), highMs: m(high) };
    assert.deepEqual(
      readTimerPhase(timer, m(now)),
      { phase, targetAt, fractionDone },
      `started ${startedAt}, ${low}–${high}, now ${now}`
    );
  }
  assert.equal(isLongTimer(m(120)), false);
  assert.equal(isLongTimer(m(121)), true);
});
