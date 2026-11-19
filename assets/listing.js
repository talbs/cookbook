const viewRest = document.querySelector('.view-rest');
const viewSwitch = viewRest.querySelector('.view-switch');
const storageKey = 'listing-view';

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// A page nobody is looking at has no frames to animate in, and a transition started there holds the change back until it times out.
function changeWithTransition(change) {
  const canAnimate = document.startViewTransition && document.visibilityState === 'visible' && document.hasFocus();
  if (!canAnimate || prefersReducedMotion.matches) {
    change();
    return;
  }
  document.startViewTransition(change);
}

function showView(view) {
  document.documentElement.dataset.view = view;
  viewSwitch.value = view;
}

function saveView(view) {
  try {
    localStorage.setItem(storageKey, view);
  } catch {
    // Private windows can refuse storage; the choice then lasts for this page only.
  }
}

showView(document.documentElement.dataset.view === 'list' ? 'list' : 'cards');
viewRest.hidden = false;

viewSwitch.addEventListener('change', () => {
  const view = viewSwitch.value;
  changeWithTransition(() => showView(view));
  saveView(view);
});

// A marker just above the toolbar going off the top is how the page knows the toolbar is stuck.
const stickyToolbar = document.querySelector('.listing-controls.can-stick');
if (stickyToolbar) {
  const stuckMarker = document.createElement('div');
  stuckMarker.className = 'stuck-marker';
  stickyToolbar.before(stuckMarker);

  function markWhetherStuck() {
    stickyToolbar.classList.toggle('is-stuck', stuckMarker.getBoundingClientRect().top < 0);
  }

  addEventListener('scroll', markWhetherStuck, { passive: true });
  markWhetherStuck();
}

const searchInput = document.querySelector('.recipe-search');
if (searchInput) {
  const recipeItems = [...document.querySelectorAll('.recipe-cards > li, .recipe-rows > li')];
  const courseSections = [...document.querySelectorAll('.course')];
  const courseLinks = document.querySelector('.course-links');
  const emptyNote = document.querySelector('.search-empty');
  const timeSelect = document.querySelector('.time-select');
  const matchCount = document.querySelector('.match-count');
  const untimedNote = document.querySelector('.untimed-note');
  const urlByItem = new Map();
  const searchTextByItem = new Map();
  let hiddenItems = new Set();
  let untimedCount = 0;
  let hasStartedLoading = false;

  // Lowercase with accents removed, so "jalapeno" finds "Jalapeños".
  function simplify(text) {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Until search.json arrives, or if it never does, a recipe matches on the words in its own card. They are read once, here.
  for (const item of recipeItems) {
    urlByItem.set(item, item.querySelector('a').getAttribute('href'));
    searchTextByItem.set(item, simplify(item.textContent));
  }

  async function loadSearchText() {
    const response = await fetch('/search.json');
    const entries = await response.json();
    const searchTextByUrl = new Map();
    for (const entry of entries) {
      const words = [entry.title, entry.description, entry.course, ...entry.tags, ...entry.ingredients];
      searchTextByUrl.set(entry.url, simplify(words.join(' ')));
    }
    for (const item of recipeItems) {
      const fullerText = searchTextByUrl.get(urlByItem.get(item));
      if (fullerText) searchTextByItem.set(item, fullerText);
    }
  }

  // The first sign of interest fetches the ingredient lists, whether that is a click into the field or text arriving in it.
  function loadSearchTextOnce() {
    if (hasStartedLoading) return;
    hasStartedLoading = true;
    loadSearchText().then(showMatches, () => {});
  }

  // wa-input's value is null until someone types in it.
  function readQuery() {
    return searchInput.value ?? '';
  }

  // "any", or before the kit loads nothing at all, means no limit.
  function readMaxMinutes() {
    const minutes = Number(timeSelect.value);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  }

  function isQuickEnough(item, maxMinutes) {
    if (maxMinutes === null) return true;
    return item.dataset.minutes !== '' && Number(item.dataset.minutes) <= maxMinutes;
  }

  // The search lives in the address too, so Back from a recipe returns to it and a search can be sent to someone.
  function writeSearchToUrl() {
    const url = new URL(location.href);
    const query = readQuery().trim();
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    const maxMinutes = readMaxMinutes();
    if (maxMinutes !== null) url.searchParams.set('time', maxMinutes);
    else url.searchParams.delete('time');
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  }

  function describeSearch() {
    const query = readQuery().trim();
    if (query) return query;
    const chosenTime = timeSelect.querySelector(`wa-option[value="${readMaxMinutes() ?? 'any'}"]`);
    return chosenTime.textContent.trim().toLowerCase();
  }

  function search(text) {
    searchInput.value = text;
    showMatches();
    searchInput.focus();
  }

  // Before the kit loads there is nothing to shuffle yet.
  function tellNewJoke() {
    emptyNote.querySelector('.empty-jokes').randomize?.();
    emptyNote.querySelector('.empty-tags').randomize?.();
    emptyNote.querySelector('.empty-random').href = urlByItem.get(pickRandom(recipeItems));
  }

  function showMatches({ isInstant = false } = {}) {
    const terms = simplify(readQuery()).split(/\s+/).filter(Boolean);
    const maxMinutes = readMaxMinutes();
    const itemsToHide = new Set();
    untimedCount = 0;
    for (const item of recipeItems) {
      const searchText = searchTextByItem.get(item);
      const hasEveryTerm = terms.every(term => searchText.includes(term));
      if (!hasEveryTerm || !isQuickEnough(item, maxMinutes)) itemsToHide.add(item);
      // Every recipe is in the page twice, as a card and as a row, so only its card is counted.
      const isCard = item.parentElement.classList.contains('recipe-cards');
      if (isCard && hasEveryTerm && maxMinutes !== null && item.dataset.minutes === '') untimedCount += 1;
    }

    for (const term of emptyNote.querySelectorAll('.empty-term')) {
      term.textContent = describeSearch();
    }
    writeSearchToUrl();

    // Typing a letter that leaves the same recipes showing changes nothing, so nothing moves.
    const isSameListing = recipeItems.every(item => hiddenItems.has(item) === itemsToHide.has(item));
    if (isSameListing) return;

    // The change itself runs a frame later, so it reads the newest result then, not the one from when it was asked for.
    hiddenItems = itemsToHide;
    if (isInstant) showHiddenItems();
    else changeWithTransition(showHiddenItems);
  }

  function showHiddenItems() {
    for (const item of recipeItems) {
      item.hidden = hiddenItems.has(item);
    }

    let shownCount = 0;
    for (const section of courseSections) {
      const courseCount = section.querySelectorAll('.recipe-cards > li:not([hidden])').length;
      const courseLink = courseLinks.querySelector(`[data-course="${section.dataset.course}"]`);
      section.hidden = courseCount === 0;
      courseLink.hidden = courseCount === 0;
      courseLink.querySelector('.course-count').textContent = courseCount;
      shownCount += courseCount;
    }
    const hasMatch = shownCount > 0;

    // A screen reader hears how many recipes are left. At none, the no-results panel does the talking.
    matchCount.textContent = shownCount === 0 ? '' : `${shownCount} ${shownCount === 1 ? 'recipe' : 'recipes'}`;

    // A time limit can't judge a recipe with no time on it, so it leaves those out and says how many.
    untimedNote.hidden = untimedCount === 0;
    untimedNote.textContent =
      untimedCount === 1 ? '1 recipe has no time on it, so it is left out.' : `${untimedCount} recipes have no time on them, so they are left out.`;

    // One joke per dead end: it stays put while the cook keeps typing, and changes the next time nothing matches.
    if (!hasMatch && emptyNote.hidden) tellNewJoke();
    emptyNote.hidden = hasMatch;
    viewRest.hidden = !hasMatch;
    courseLinks.hidden = !hasMatch;
  }

  searchInput.closest('.search-field').hidden = false;
  timeSelect.hidden = false;

  searchInput.addEventListener('focus', loadSearchTextOnce);
  searchInput.addEventListener('input', () => {
    loadSearchTextOnce();
    showMatches();
  });
  timeSelect.addEventListener('change', () => showMatches());
  emptyNote.querySelector('.empty-clear').addEventListener('click', () => {
    timeSelect.value = 'any';
    search('');
  });
  emptyNote.querySelector('.empty-tags').addEventListener('click', event => {
    const suggestion = event.target.closest('[data-search]');
    if (suggestion) search(suggestion.dataset.search);
  });

  // A search or time limit that arrives in the address is applied before anything shows, without the settle.
  const arrivingSearch = new URLSearchParams(location.search);
  const arrivingTime = arrivingSearch.get('time');
  if (timeSelect.querySelector(`wa-option[value="${CSS.escape(arrivingTime ?? '')}"]`)) timeSelect.value = arrivingTime;
  if (arrivingSearch.get('q')) {
    searchInput.value = arrivingSearch.get('q');
    loadSearchTextOnce();
  }
  showMatches({ isInstant: true });
}
