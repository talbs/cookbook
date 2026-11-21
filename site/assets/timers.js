import { isLongTimer, readTimerPhase } from './timer-phase.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const GLYPHS = { idle: 'play', running: 'stop', check: 'stop', done: 'check' };
const ACTIONS = {
  idle: 'Start',
  running: 'Stop',
  check: 'Stop',
  done: 'Clear',
};
const CHIME_NOTES = { check: 2, done: 3 };
const HOURGLASS_FRAMES = ['hourglass-start', 'hourglass-half', 'hourglass-end'];
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function capitalize(words) {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isSameDay(first, second) {
  return first.toDateString() === second.toDateString();
}

// The page's copy is lowercase ("ready 6:40 pm"), so only the am/pm part is lowered; a weekday keeps its capital.
function formatClockTime(timestamp) {
  const date = new Date(timestamp);
  const options = { hour: 'numeric', minute: '2-digit' };
  if (!isSameDay(date, new Date())) options.weekday = 'short';
  const parts = new Intl.DateTimeFormat(undefined, options).formatToParts(date);
  return parts
    .map((part) =>
      part.type === 'dayPeriod' ? part.value.toLowerCase() : part.value
    )
    .join('');
}

function buildCounter(timer, targetAt) {
  const counter = document.createElement('wa-counter');
  const isUnderAnHour = targetAt - timer.startedAt < HOUR_MS;
  counter.setAttribute('date', new Date(targetAt).toISOString());
  counter.setAttribute('delimiter', ':');
  counter.setAttribute('without-labels', '');
  counter.setAttribute('largest-unit', isUnderAnHour ? 'minutes' : 'hours');
  counter.setAttribute('label', `${capitalize(timer.name)} time left`);
  return counter;
}

function readBand(band, savedStarts) {
  const savedStart = savedStarts[band.dataset.timer];
  const time = band.querySelector('.timer-time');
  const highMs = Number(band.dataset.highMinutes) * MINUTE_MS;
  return {
    id: band.dataset.timer,
    name: band.dataset.name,
    band,
    lowMs: Number(band.dataset.lowMinutes) * MINUTE_MS,
    highMs,
    isLong: isLongTimer(highMs),
    startedAt: Number.isFinite(savedStart) ? savedStart : null,
    phase: null,
    bar: band.querySelector('wa-progress-bar'),
    words: band.querySelector('.timer-words'),
    time,
    labelHtml: time.innerHTML,
    control: band.querySelector('.timer-control'),
    square: band.querySelector('.timer-square'),
    readout: band.querySelector('.timer-readout'),
    hourglass: band.querySelector('.timer-hourglass'),
    glyph: band.querySelector('.timer-control wa-icon'),
  };
}

async function measureReadout(timer, fillTime) {
  const probe = timer.readout.cloneNode(true);
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.minInlineSize = '0';
  probe.querySelector('.timer-words').textContent = '';
  fillTime(probe.querySelector('.timer-time'));
  timer.band.append(probe);
  const counter = probe.querySelector('wa-counter');
  if (counter) {
    await customElements.whenDefined('wa-counter');
    await counter.updateComplete;
  }
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

// The label and the countdown differ in width, so each band holds the wider of its own two and starting a timer doesn't shift the bar.
async function reserveReadoutWidth(timer) {
  const widths = [
    await measureReadout(timer, (time) => (time.innerHTML = timer.labelHtml)),
  ];
  if (!timer.isLong) {
    const countdownProbe = { name: timer.name, startedAt: 0 };
    widths.push(
      await measureReadout(timer, (time) =>
        time.replaceChildren(buildCounter(countdownProbe, timer.lowMs))
      )
    );
  }
  const fontSize = parseFloat(getComputedStyle(timer.readout).fontSize);
  timer.readout.style.minInlineSize = `${Math.max(...widths) / fontSize}em`;
}

// Removing the class and reading layout before adding it back restarts the animation, so every tap and every chime moves the square again.
function replayMove(timer, moveClass) {
  timer.square.classList.remove('is-springing', 'is-flashing');
  void timer.square.offsetWidth;
  timer.square.classList.add(moveClass);
}

function showTime(timer, { phase, targetAt }) {
  const { isLong } = timer;
  timer.words.textContent = phase === 'check' && !isLong ? 'check now' : '';
  if (phase === 'idle') {
    timer.time.innerHTML = timer.labelHtml;
  } else if (phase === 'done') {
    timer.time.textContent = 'done';
  } else if (isLong && phase === 'running') {
    timer.time.textContent = `ready ${formatClockTime(targetAt)}`;
  } else if (isLong) {
    timer.time.textContent = `check now · by ${formatClockTime(targetAt)}`;
  } else {
    timer.time.replaceChildren(buildCounter(timer, targetAt));
  }
}

function showPhase(timer, state) {
  timer.band.dataset.phase = state.phase;
  timer.glyph.name = GLYPHS[state.phase];
  timer.control.setAttribute(
    'aria-label',
    `${ACTIONS[state.phase]} ${timer.name} timer`
  );
  showTime(timer, state);
}

let audio = null;

// Browsers only let a page make sound after a tap, so the Start tap opens the audio for every chime after it.
function unlockAudio() {
  if (!window.AudioContext) return;
  audio ??= new AudioContext();
  if (audio.state === 'suspended') audio.resume();
}

function playChime(noteCount) {
  if (!audio) return;
  const start = audio.currentTime;
  for (let index = 0; index < noteCount; index++) {
    const noteAt = start + index * 0.25;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = 880;
    volume.gain.setValueAtTime(0.0001, noteAt);
    volume.gain.exponentialRampToValueAtTime(0.3, noteAt + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, noteAt + 0.18);
    tone.connect(volume).connect(audio.destination);
    tone.start(noteAt);
    tone.stop(noteAt + 0.2);
  }
}

let wakeLock = null;
let isRequestingWakeLock = false;

async function holdScreenAwake() {
  if (!navigator.wakeLock || wakeLock || isRequestingWakeLock) return;
  isRequestingWakeLock = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    wakeLock = lock;
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null;
    });
  } catch {}
  isRequestingWakeLock = false;
}

function letScreenSleep() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

export function startTimers({ root, savedStarts, onChange, isCooking }) {
  const timers = [...root.querySelectorAll('.timer-band')].map((band) =>
    readBand(band, savedStarts)
  );
  const status = root.querySelector('.timer-status');
  let clock = null;
  let tickCount = 0;

  function isTicking(timer) {
    return timer.phase === 'running' || timer.phase === 'check';
  }

  function isScreenNeeded() {
    if (isCooking()) return true;
    return timers.some((timer) => isTicking(timer) && !timer.isLong);
  }

  function announce(timer, phase) {
    const name = capitalize(timer.name);
    status.textContent =
      phase === 'check' ? `${name}: check now` : `${name} timer done`;
    playChime(CHIME_NOTES[phase]);
    replayMove(timer, 'is-flashing');
  }

  function showHourglass(timer, phase) {
    let frame = 'hourglass-half';
    if (phase === 'done') frame = 'hourglass-end';
    const isTurning = phase === 'running' || phase === 'check';
    if (isTurning && !prefersReducedMotion.matches)
      frame = HOURGLASS_FRAMES[tickCount % HOURGLASS_FRAMES.length];
    if (timer.hourglass.name !== frame) timer.hourglass.name = frame;
  }

  function renderTimer(timer, now, { isAnnounced }) {
    const state = readTimerPhase(timer, now);
    timer.bar.value = state.fractionDone * 100;
    showHourglass(timer, state.phase);
    const hasChanged = state.phase !== timer.phase;
    if (hasChanged) showPhase(timer, state);
    if (hasChanged && isAnnounced && CHIME_NOTES[state.phase])
      announce(timer, state.phase);
    timer.phase = state.phase;
    return hasChanged;
  }

  function tick() {
    tickCount++;
    const now = Date.now();
    let hasAnyPhaseChanged = false;
    for (const timer of timers) {
      if (!isTicking(timer)) continue;
      if (renderTimer(timer, now, { isAnnounced: true }))
        hasAnyPhaseChanged = true;
    }
    if (hasAnyPhaseChanged) keepClockRunningWhileNeeded();
  }

  async function keepScreenAwakeWhileNeeded() {
    if (isScreenNeeded() && document.visibilityState === 'visible')
      await holdScreenAwake();
    if (!isScreenNeeded()) letScreenSleep();
  }

  function keepClockRunningWhileNeeded() {
    const isNeeded = timers.some(isTicking);
    if (isNeeded && !clock) clock = setInterval(tick, 1000);
    if (!isNeeded && clock) {
      clearInterval(clock);
      clock = null;
    }
    keepScreenAwakeWhileNeeded();
  }

  function pressControl(timer) {
    const isStarting = timer.phase === 'idle';
    if (isStarting) unlockAudio();
    timer.startedAt = isStarting ? Date.now() : null;
    onChange();
    renderTimer(timer, Date.now(), { isAnnounced: false });
    replayMove(timer, 'is-springing');
    keepClockRunningWhileNeeded();
  }

  // Bands are hidden in Overview and measure as zero, so each one is measured the first time it takes up space.
  const firstSightWatcher = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width === 0) continue;
      firstSightWatcher.unobserve(entry.target);
      reserveReadoutWidth(timers.find((timer) => timer.band === entry.target));
    }
  });

  const now = Date.now();
  for (const timer of timers) {
    renderTimer(timer, now, { isAnnounced: false });
    timer.control.hidden = false;
    timer.control.addEventListener('click', () => pressControl(timer));
    firstSightWatcher.observe(timer.band);
  }
  keepClockRunningWhileNeeded();
  document.addEventListener('visibilitychange', keepScreenAwakeWhileNeeded);
  // A browser can refuse the lock until the reader has touched the page, so each touch asks again; it does nothing once the lock is held.
  document.addEventListener('pointerdown', keepScreenAwakeWhileNeeded);

  return {
    keepScreenAwakeWhileNeeded,
    readStarts() {
      const starts = {};
      for (const timer of timers) {
        if (timer.startedAt != null) starts[timer.id] = timer.startedAt;
      }
      return starts;
    },
  };
}
