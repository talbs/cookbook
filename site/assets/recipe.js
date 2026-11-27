import { startTimers } from './timers.js';
import { changeWithTransition } from './transition.js';

const page = document.querySelector('.recipe-page');
const recipe = page.querySelector('.recipe');
const modeRow = page.querySelector('.mode-row');
const stuckMarker = recipe.querySelector('.stuck-marker');
const modeSwitch = page.querySelector('.mode-switch');
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
  const pageGrid = page.shadowRoot.querySelector('[part~="base"]');
  const revealAnimations = [...page.getAnimations(), ...pageGrid.getAnimations()];
  await Promise.allSettled(revealAnimations.map((animation) => animation.finished));
}

function markScreenToastShown() {
  isScreenToastShown = true;
  try {
    sessionStorage.setItem('screen-toast-shown', '1');
  } catch {}
}

// A running view transition paints the page's snapshots over the top layer, toast included.
// The second one is the transition a recipe opened from another page arrives inside.
async function waitForViewTransitions() {
  await runningTransition?.finished;
  await document.activeViewTransition?.finished;
}

async function showToast(message, duration) {
  const toastItem = await screenToast.create(message, {
    size: 'm',
    duration,
    icon: { name: 'bread-slice', variant: 'regular' },
  });
  toastItem.querySelector('wa-icon')?.setAttribute('animation', 'flip-360');
  return toastItem;
}

async function showScreenToastOnce() {
  if (isScreenToastShown) return;
  markScreenToastShown();
  await customElements.whenDefined('wa-toast');
  await waitForPageReveal();
  await waitForViewTransitions();
  await showToast('Screen stays on while you cook.', 3000);
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
  modeSwitch.value = mode;
  writeModeToUrl(mode);
  timers.keepScreenAwakeWhileNeeded();
}

function findStepBeingRead() {
  const rowBottom = modeRow.getBoundingClientRect().bottom;
  const steps = recipe.querySelectorAll('.step');
  for (const step of steps) {
    const { top } = step.getBoundingClientRect();
    if (top >= rowBottom && top < window.innerHeight) return step;
  }
  // No step starts on screen, so the step running past the row is the one being read.
  for (const step of steps) {
    const { top, bottom } = step.getBoundingClientRect();
    if (bottom > rowBottom && top < window.innerHeight) return step;
  }
  return null;
}

function findLandingFor(mode) {
  const beforeStart = mode === 'cook'
    ? recipe.querySelector('.before-start')
    : recipe.querySelector('.lead-notes:has(#lead-notes-heading)');
  return beforeStart ?? recipe.querySelector('.method');
}

// The marker sits where the row starts to stick, so it reaches the top of the window as the row does.
function isModeRowStuck() {
  return stuckMarker.getBoundingClientRect().top <= 0;
}

function switchMode(mode) {
  const isStuck = isModeRowStuck();
  const heldStep = isStuck ? findStepBeingRead() : null;
  const heldStepTop = heldStep?.getBoundingClientRect().top;

  runningTransition = changeWithTransition(() => {
    showMode(mode);
    if (heldStep) {
      window.scrollBy({ top: heldStep.getBoundingClientRect().top - heldStepTop, behavior: 'instant' });
    }
    if (isStuck && (!heldStep || !isModeRowStuck())) {
      findLandingFor(mode)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    saveState();
  });
}

function restoreChecks(checkedIds) {
  for (const checkbox of checkboxes) {
    checkbox.checked = checkedIds.includes(checkbox.dataset.check);
  }
}

const recipeAddress = document.querySelector('link[rel="canonical"]')?.href;
const recipeTitle = document.querySelector('meta[property="og:title"]')?.content;
const hasShareSheet = typeof navigator.share === 'function';
const isTouchFirst = window.matchMedia('(pointer: coarse)').matches;
const hasClipboard = Boolean(navigator.clipboard);
let linkCopiedToast = null;
let isLinkCopiedToastQueued = false;

async function showLinkCopiedToast() {
  if (isLinkCopiedToastQueued || linkCopiedToast?.isConnected) return;
  isLinkCopiedToastQueued = true;
  try {
    await customElements.whenDefined('wa-toast');
    await waitForViewTransitions();
    linkCopiedToast = await showToast('Link Copied', 2000);
  } finally {
    isLinkCopiedToastQueued = false;
  }
}

async function copyRecipeAddress() {
  try {
    await navigator.clipboard.writeText(recipeAddress);
  } catch {
    return;
  }
  await showLinkCopiedToast();
}

async function shareRecipe() {
  try {
    await navigator.share({ title: recipeTitle, url: recipeAddress });
  } catch (error) {
    if (error.name === 'AbortError') return;
    await copyRecipeAddress();
  }
}

function chooseShareAction() {
  if (hasShareSheet && isTouchFirst) return shareRecipe;
  if (hasClipboard) return copyRecipeAddress;
  return null;
}

function revealShareControls() {
  const shareOnClick = chooseShareAction();
  if (!shareOnClick) return;

  for (const shareControl of page.querySelectorAll('.share-control')) {
    shareControl.addEventListener('click', shareOnClick);
    shareControl.hidden = false;
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
revealShareControls();
modeRow.hidden = false;

modeSwitch.addEventListener('change', () => {
  if (page.dataset.mode === modeSwitch.value) return;
  switchMode(modeSwitch.value);
});

// A printed page can't be clicked back to, so each sheet's footer carries the address it came from.
// Only the browser knows the host, so the rule is written here; site.css styles the box.
const pageAddress = (location.host + location.pathname).replaceAll('\\', '').replaceAll('"', '');
const printAddressStyle = document.createElement('style');
printAddressStyle.textContent = `@page { @bottom-center { content: "${pageAddress}"; } }`;
document.head.append(printAddressStyle);

for (const printControl of page.querySelectorAll('.print-control')) {
  printControl.addEventListener('click', () => window.print());
}

recipe.addEventListener('change', event => {
  const checkbox = event.target;
  if (!checkboxes.includes(checkbox)) return;
  checkbox.classList.add('is-touched');
  saveState();
});
