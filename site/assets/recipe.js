import { startTimers } from './timers.js';
import { changeWithTransition } from './transition.js';

const page = document.querySelector('.recipe-page');
const recipe = page.querySelector('.recipe');
const modeBar = page.querySelector('.mode-bar');
const modeRest = page.querySelector('.mode-rest');
const modeSwitches = [...page.querySelectorAll('.mode-switch')];
const checkboxes = [...recipe.querySelectorAll('wa-checkbox[data-check]')];
const storageKey = `recipe:${recipe.dataset.recipe}`;
const screenToast = page.querySelector('.screen-toast');

// Private windows and blocked site data make sessionStorage throw; the page still works for this visit.
function readSavedState() {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

function saveState() {
  const checked = checkboxes.filter(checkbox => checkbox.checked).map(checkbox => checkbox.dataset.check);
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ mode: page.dataset.mode, checked, timers: timers.readStarts() }));
  } catch {}
}

function readScreenToastShown() {
  try {
    return sessionStorage.getItem('screen-toast-shown') !== null;
  } catch {
    return false;
  }
}

let isScreenToastShown = readScreenToastShown();
let runningTransition = null;

async function waitForPageReveal() {
  const root = document.documentElement;
  if (root.classList.contains('wa-cloak')) {
    await new Promise((resolve) => {
      const cloakWatcher = new MutationObserver(() => {
        if (root.classList.contains('wa-cloak')) return;
        cloakWatcher.disconnect();
        resolve();
      });
      cloakWatcher.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
  }
  await Promise.allSettled(page.getAnimations().map((animation) => animation.finished));
}

function markScreenToastShown() {
  isScreenToastShown = true;
  try {
    sessionStorage.setItem('screen-toast-shown', '1');
  } catch {}
}

async function showScreenToastOnce() {
  if (isScreenToastShown) return;
  markScreenToastShown();
  await customElements.whenDefined('wa-toast');
  await waitForPageReveal();
  // A running view transition paints the page's snapshots over the top layer, toast included.
  // The second one is the transition a recipe opened from another page arrives inside.
  await runningTransition?.finished;
  await document.activeViewTransition?.finished;
  const toastItem = await screenToast.create('Screen stays on while you cook.', {
    size: 'm',
    duration: 3000,
    icon: { name: 'bread-slice', variant: 'regular' },
  });
  toastItem.querySelector('wa-icon')?.setAttribute('animation', 'flip-360');
}

function isMode(value) {
  return value === 'overview' || value === 'cook';
}

// Replaced, not pushed, so Back leaves the recipe instead of flipping modes. Overview is the default and keeps the URL clean.
function writeModeToUrl(mode) {
  const url = new URL(location.href);
  if (mode === 'cook') url.searchParams.set('mode', 'cook');
  else url.searchParams.delete('mode');
  history.replaceState(history.state, '', url);
}

function showMode(mode) {
  page.dataset.mode = mode;
  for (const modeSwitch of modeSwitches) {
    modeSwitch.value = mode;
  }
  writeModeToUrl(mode);
  timers.keepScreenAwakeWhileNeeded();
}

function switchMode(mode) {
  runningTransition = changeWithTransition(() => {
    showMode(mode);
    saveState();
  });
}

function restoreChecks(checkedIds) {
  for (const checkbox of checkboxes) {
    checkbox.checked = checkedIds.includes(checkbox.dataset.check);
  }
}

const savedState = readSavedState();
const timers = startTimers({
  root: recipe,
  savedStarts: savedState.timers ?? {},
  onChange: saveState,
  isCooking: () => page.dataset.mode === 'cook',
  onScreenHeld: showScreenToastOnce,
});
const linkedMode = new URLSearchParams(location.search).get('mode');
if (isMode(linkedMode)) showMode(linkedMode);
else if (isMode(savedState.mode)) showMode(savedState.mode);
if (Array.isArray(savedState.checked)) restoreChecks(savedState.checked);
if (isMode(linkedMode)) saveState();
modeRest.hidden = false;

// The switch rests in the page; once it starts scrolling off the top, wa-page's sticky header bar slides in with its own copy.
// The hidden bar can't be reached, and the resting switch goes inert while the bar shows, so there is only ever one switch to meet.
const restingSwitchWatcher = new IntersectionObserver(([entry]) => {
  const isPinned = entry.boundingClientRect.top < 0;
  modeBar.classList.toggle('is-pinned', isPinned);
  modeRest.inert = isPinned;
}, { threshold: 1 });
restingSwitchWatcher.observe(modeRest);

for (const modeSwitch of modeSwitches) {
  modeSwitch.addEventListener('change', () => {
    if (page.dataset.mode === modeSwitch.value) return;
    switchMode(modeSwitch.value);
  });
}

// A printed page can't be clicked back to, so each sheet's footer carries the address it came from.
// Only the browser knows the host, so the rule is written here; site.css styles the box.
const pageAddress = (location.host + location.pathname).replaceAll('\\', '').replaceAll('"', '');
const printAddressStyle = document.createElement('style');
printAddressStyle.textContent = `@page { @bottom-center { content: "${pageAddress}"; } }`;
document.head.append(printAddressStyle);

for (const printControl of page.querySelectorAll('.print-control')) {
  printControl.addEventListener('click', () => window.print());
}

for (const checkbox of checkboxes) {
  checkbox.addEventListener('change', () => {
    checkbox.classList.add('is-touched');
    saveState();
  });
}
