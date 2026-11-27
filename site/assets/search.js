import { findMatches, prepareEntries, simplify } from './search-match.js';

const dialog = document.querySelector('.search-dialog');
const field = dialog.querySelector('.search-input');
const sizer = dialog.querySelector('.search-sizer');
const body = dialog.querySelector('.search-body');
const tryLine = dialog.querySelector('.search-try');
const results = dialog.querySelector('.search-results');
const glider = results.querySelector('.search-glider');
const emptyPanel = dialog.querySelector('.search-empty');
const matchCount = dialog.querySelector('.search-count');
const rowTemplate = dialog.querySelector('.search-row-template');
const searchButton = document.querySelector('#site-search');
const searchTooltip = document.querySelector('wa-tooltip[for="site-search"]');
const searchKey = searchTooltip?.querySelector('kbd');
// Apple keyboards say ⌘ where every other keyboard says Ctrl, and Ctrl on a Mac belongs to text editing.
const isApplePlatform = /Mac|iPhone|iPad/.test(navigator.platform);
const hueEnds = ['--hop-start', '--hop-end'];
const reportedEmptyQueries = new Set();

let preparedEntries = null;
let loadingEntries = null;
let items = [];
let selectedIndex = -1;
let emptySearchTimer = null;

function loadEntries() {
  loadingEntries ??= fetch('/search.json')
    .then(response => response.json())
    .then(entries => {
      preparedEntries = prepareEntries(entries);
      showResults();
    })
    // Without the data the dialog still opens and closes; it just finds nothing, and the next open tries again.
    .catch(() => {
      loadingEntries = null;
    });
  return loadingEntries;
}

function isCommandHeld(event) {
  return isApplePlatform ? event.metaKey : event.ctrlKey;
}

function readQuery() {
  return (field.value ?? '').trim();
}

function buildRow({ entry, reason }) {
  const item = rowTemplate.content.firstElementChild.cloneNode(true);
  item.id = `search-option-${entry.url.split('/').filter(Boolean).pop()}`;
  item.querySelector('.search-row').href = entry.url;
  item.querySelector('.search-name').textContent = entry.title;
  item.querySelector('.search-why').textContent = reason;
  if (entry.icon) item.querySelector('.search-icon').name = entry.icon;
  else item.querySelector('.search-icon-slot').remove();
  if (entry.time) item.querySelector('.search-time').textContent = entry.time;
  else item.querySelectorAll('.search-dots, .search-time').forEach(element => element.remove());
  return item;
}

// Hue Hop keeps a hue's two ends on its own element, so they are copied to whatever holds the links beside it.
function shareHue(hueHop, linkHolder) {
  const hueStyle = getComputedStyle(hueHop);
  for (const end of hueEnds) linkHolder.style.setProperty(end, hueStyle.getPropertyValue(end));
}

function tellNewJoke() {
  const jokes = emptyPanel.querySelector('.empty-jokes');
  // Before the kit loads there is nothing to shuffle yet.
  jokes.randomize?.();
  emptyPanel.querySelector('.empty-tags').randomize?.();

  const ornament = jokes.querySelector(':scope > :not([hidden]) hue-hop');
  const waysOut = emptyPanel.querySelector('.empty-ways-out');
  // Moon is all grays, too quiet to show a hover, so that joke's links keep the accent.
  const isGrey = ornament.getAttribute('hue') === 'moon';
  if (isGrey) for (const end of hueEnds) waysOut.style.removeProperty(end);
  else shareHue(ornament, waysOut);
}

function moveGlider(selected) {
  glider.hidden = !selected;
  if (!selected) return;
  glider.style.setProperty('--glider-top', `${selected.offsetTop}px`);
  glider.style.setProperty('--glider-size', `${selected.offsetHeight}px`);
}

function select(index, { isScrolledTo = true } = {}) {
  items[selectedIndex]?.setAttribute('aria-selected', 'false');
  selectedIndex = index;
  const selected = items[selectedIndex] ?? null;
  selected?.setAttribute('aria-selected', 'true');
  field.input.ariaActiveDescendantElement = selected;
  moveGlider(selected);
  if (selected && isScrolledTo) selected.scrollIntoView({ block: 'nearest' });
}

// The box holds its old height through a redraw, eases to the new one, then goes back to fitting its content,
// so fonts or icons that arrive later can still grow it.
function pinHeight() {
  const startHeight = sizer.offsetHeight;
  if (startHeight > 0) sizer.style.blockSize = `${startHeight}px`;
  return startHeight;
}

function easeHeightFrom(startHeight) {
  const endHeight = body.offsetHeight;
  const isEasing = getComputedStyle(sizer).transitionDuration !== '0s';
  if (startHeight === 0 || startHeight === endHeight || !isEasing) {
    sizer.style.blockSize = '';
    return;
  }
  sizer.style.blockSize = `${endHeight}px`;
}

function describeCount(count) {
  if (count === 0) return '';
  return count === 1 ? '1 recipe' : `${count} recipes`;
}

function writeQueryToUrl(query) {
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  if (url.href !== location.href) history.replaceState(history.state, '', url);
}

// Searches whose words match no recipe tell us which keywords are missing.
function reportEmptySearchSoon(isEmptySearch) {
  clearTimeout(emptySearchTimer);
  if (!isEmptySearch) return;
  emptySearchTimer = setTimeout(reportEmptySearch, 1000);
}

function reportEmptySearch() {
  const query = readQuery().slice(0, 100);
  const simplifiedQuery = simplify(query);
  if (reportedEmptyQueries.has(simplifiedQuery)) return;
  reportedEmptyQueries.add(simplifiedQuery);
  window.umami?.track('search-empty', { query });
}

function showResults() {
  const query = readQuery();
  const matches = preparedEntries ? findMatches(preparedEntries, query) : [];
  const isDeadEnd = preparedEntries !== null && query !== '' && matches.length === 0;
  const startHeight = pinHeight();

  items = matches.map(buildRow);
  glider.classList.remove('can-glide');
  results.replaceChildren(glider, ...items);
  results.hidden = items.length === 0;
  results.scrollTop = 0;
  tryLine.hidden = query !== '';
  // One joke per dead end: it stays put while the cook keeps typing, and changes the next time nothing matches.
  if (isDeadEnd && emptyPanel.hidden) tellNewJoke();
  emptyPanel.hidden = !isDeadEnd;
  for (const term of emptyPanel.querySelectorAll('.empty-term')) term.textContent = query;
  matchCount.textContent = describeCount(items.length);
  field.input.ariaExpanded = String(items.length > 0);

  selectedIndex = -1;
  select(items.length > 0 ? 0 : -1, { isScrolledTo: false });
  easeHeightFrom(startHeight);
  requestAnimationFrame(() => glider.classList.add('can-glide'));
  writeQueryToUrl(query);
  reportEmptySearchSoon(isDeadEnd);
}

async function openSearch() {
  loadEntries();
  searchTooltip?.hide();
  dialog.open = true;
  // The field can't take focus until the dialog has drawn itself open. Waiting only this long stays inside the tap, which is the one moment iOS will raise the keyboard.
  await dialog.updateComplete;
  field.focus();
}

function markFieldAsCombobox() {
  const input = field.input;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.ariaExpanded = 'false';
  input.ariaControlsElements = [results];
}

await Promise.all([customElements.whenDefined('wa-input'), customElements.whenDefined('wa-dialog')]);
await field.updateComplete;
markFieldAsCombobox();

if (!isApplePlatform) {
  if (searchKey) searchKey.textContent = 'Ctrl K';
  searchButton?.setAttribute('aria-keyshortcuts', 'Control+K');
}

searchButton?.addEventListener('pointerenter', loadEntries, { once: true });
searchButton?.addEventListener('click', openSearch);

// A tap also counts as a hover, so the tooltip's show timer is still running when the tap opens the dialog.
searchTooltip?.addEventListener('wa-show', event => {
  if (dialog.open) event.preventDefault();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'k' || !isCommandHeld(event)) return;
  event.preventDefault();
  openSearch();
});

field.addEventListener('input', showResults);

// Rows change height when the sheet changes width, so the highlight follows its row.
new ResizeObserver(() => moveGlider(items[selectedIndex] ?? null)).observe(results);

sizer.addEventListener('transitionend', event => {
  if (event.target === sizer) sizer.style.blockSize = '';
});

field.addEventListener('keydown', event => {
  if (items.length === 0 || event.isComposing) return;
  const lastIndex = items.length - 1;
  const moves = {
    ArrowDown: Math.min(selectedIndex + 1, lastIndex),
    ArrowUp: Math.max(selectedIndex - 1, 0),
    Home: 0,
    End: lastIndex,
  };
  if (event.key in moves) {
    event.preventDefault();
    select(moves[event.key]);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const link = items[selectedIndex].querySelector('a');
    if (isCommandHeld(event)) window.open(link.href, '_blank', 'noopener');
    else link.click();
  }
});

function selectRowUnder(event) {
  const index = items.indexOf(event.target.closest('.search-option'));
  if (index !== -1 && index !== selectedIndex) select(index, { isScrolledTo: false });
}

results.addEventListener('focusin', selectRowUnder);
results.addEventListener('pointermove', selectRowUnder);

dialog.addEventListener('click', event => {
  const suggestion = event.target.closest('[data-search]');
  if (!suggestion) return;
  field.value = suggestion.dataset.search;
  field.focus();
  showResults();
});

dialog.addEventListener('wa-show', event => {
  if (event.target === dialog) searchButton?.setAttribute('aria-expanded', 'true');
});

dialog.addEventListener('wa-hide', event => {
  if (event.target === dialog) searchButton?.setAttribute('aria-expanded', 'false');
});

dialog.addEventListener('wa-after-hide', event => {
  if (event.target !== dialog) return;
  dialog.classList.remove('is-arriving');
  field.value = '';
  showResults();
});

const arrivingQuery = new URLSearchParams(location.search).get('q');
if (arrivingQuery) {
  dialog.classList.add('is-arriving');
  field.value = arrivingQuery;
  openSearch();
  showResults();
}
