export const LONG_TIMER_MS = 120 * 60 * 1000;

export function isLongTimer(highMs) {
  return highMs > LONG_TIMER_MS;
}

export function readTimerPhase({ startedAt, lowMs, highMs }, now) {
  if (startedAt == null)
    return { phase: 'idle', targetAt: null, fractionDone: 0 };

  const elapsed = now - startedAt;
  const fractionDone = Math.min(Math.max(elapsed / highMs, 0), 1);
  if (elapsed < lowMs)
    return { phase: 'running', targetAt: startedAt + lowMs, fractionDone };
  if (elapsed < highMs)
    return { phase: 'check', targetAt: startedAt + highMs, fractionDone };
  return { phase: 'done', targetAt: null, fractionDone };
}
