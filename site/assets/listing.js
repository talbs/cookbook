import { choosePick } from './pick.js';
import { changeWithTransition, prefersReducedMotion } from './transition.js';

const viewRest = document.querySelector('.view-rest');
const viewSwitch = viewRest.querySelector('.view-switch');
const storageKey = 'listing-view';

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
const stuckMarker = document.createElement('div');
stuckMarker.className = 'stuck-marker';
const isPhoneWidth = matchMedia('(width < 48rem)');
const isTouchScreen = matchMedia('(pointer: coarse)');

// On a phone the toolbar counts as stuck within 1px of the top, because closing the keyboard can leave it a fraction of a pixel down.
// While typing it sits at the top only because the page top is hidden, so that doesn't count.
function markWhetherStuck() {
  const isStuck = isPhoneWidth.matches
    ? stickyToolbar.getBoundingClientRect().top < 1 && !stickyToolbar.closest('.is-typing')
    : stuckMarker.getBoundingClientRect().top < 0;
  stickyToolbar.classList.toggle('is-stuck', isStuck);
}

if (stickyToolbar) {
  stickyToolbar.before(stuckMarker);
  addEventListener('scroll', markWhetherStuck, { passive: true });
  markWhetherStuck();
  // The page's reveal animation slides everything a few pixels after a load or a jump, with no scroll event, so check again once it ends.
  const page = document.querySelector('wa-page');
  page.addEventListener('animationend', event => {
    if (event.target === page) markWhetherStuck();
  });

  const footerWatcher = new IntersectionObserver(([entry]) => {
    stickyToolbar.classList.toggle('is-at-footer', entry.isIntersecting);
  });
  footerWatcher.observe(document.querySelector('.site-footer'));
}

const searchInput = document.querySelector('.recipe-search');
if (searchInput) {
  const recipeItems = [...document.querySelectorAll('.recipe-cards > li, .recipe-rows > li')];
  const courseSections = [...document.querySelectorAll('.course')];
  const courseLinks = document.querySelector('.course-links');
  const courseScroller = courseLinks.closest('wa-scroller');
  const emptyNote = document.querySelector('.search-empty');
  const timeSelect = document.querySelector('.time-select');
  const matchCount = document.querySelector('.match-count');
  const untimedNote = document.querySelector('.untimed-note');
  const urlByItem = new Map();
  const searchTextByItem = new Map();
  const listing = document.querySelector('main.listing');
  let hiddenItems = new Set();
  let isSearching = false;
  let isTyping = false;
  let scrollYBeforeTyping = 0;
  let untimedCount = 0;
  let hasStartedLoading = false;
  let hasSearchTextLoaded = false;
  let emptySearchTimer = null;
  const reportedEmptyQueries = new Set();

  // Lowercase with accents removed, so "jalapeno" finds "Jalapeños".
  function simplify(text) {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  }

  // Until search.json arrives, or if it never does, a recipe matches on the words in its own card. They are read once, here.
  const pickEntries = [];
  for (const item of recipeItems) {
    urlByItem.set(item, item.querySelector('a').getAttribute('href'));
    searchTextByItem.set(item, simplify(item.textContent));
    if (!item.parentElement.classList.contains('recipe-cards')) continue;
    pickEntries.push({
      url: urlByItem.get(item),
      title: item.querySelector('.card-title').textContent.trim(),
      course: item.closest('.course').dataset.course,
      seasons: item.dataset.seasons.split(' ').filter(Boolean),
      icons: [...item.querySelectorAll('.recipe-icons wa-icon')],
    });
  }

  function choosePickForNow(excludedUrl = null) {
    const now = new Date();
    const pick = choosePick({ entries: pickEntries, hour: now.getHours(), monthIndex: now.getMonth(), excludedUrl });
    return pick && { ...pick, now };
  }

  // Season names are tag slugs, so "early-summer" has to become "Early Summer".
  function writeInTitleCase(slug) {
    const words = [];
    for (const word of slug.split('-')) words.push(word[0].toUpperCase() + word.slice(1));
    return words.join(' ');
  }

  const hueByCourse = { breakfast: 'honey', condiment: 'fern', dessert: 'guava', drink: 'honey', main: 'ember', side: 'fern' };

  function showPick(container, pick) {
    container.querySelector('wa-format-date').date = pick.now;
    container.querySelector('.pick-word').textContent = writeInTitleCase(pick.word);
    container.querySelector('.pick-season').textContent = pick.isInSeason ? writeInTitleCase(pick.season) : '';
    const link = container.querySelector('.pick-link');
    link.href = pick.entry.url;
    link.querySelector('.pick-title').textContent = pick.entry.title;

    const icons = [];
    for (const icon of pick.entry.icons) icons.push(icon.cloneNode());
    const iconSet = container.querySelector('.pick-icons');
    iconSet.setAttribute('hue', hueByCourse[pick.entry.course]);
    iconSet.replaceChildren(...icons);
    shareHue(iconSet, container);
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
    hasSearchTextLoaded = true;
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

  const hueEnds = ['--hop-start', '--hop-end'];

  // Hue Hop keeps a hue's two ends on its own element, so they are copied to whatever holds the links beside it.
  function shareHue(hueHop, linkHolder) {
    const hueStyle = getComputedStyle(hueHop);
    for (const end of hueEnds) linkHolder.style.setProperty(end, hueStyle.getPropertyValue(end));
  }

  // Before the kit loads there is nothing to shuffle yet.
  function tellNewJoke() {
    const jokes = emptyNote.querySelector('.empty-jokes');
    jokes.randomize?.();
    emptyNote.querySelector('.empty-tags').randomize?.();

    const ornament = jokes.querySelector(':scope > :not([hidden]) hue-hop');
    // Moon is all greys, too quiet to show a hover, so that joke's links keep the accent.
    const isGrey = ornament.getAttribute('hue') === 'moon';
    if (isGrey) for (const end of hueEnds) emptyNote.style.removeProperty(end);
    else shareHue(ornament, emptyNote);
  }

  function showMatches({ isInstant = false } = {}) {
    const terms = simplify(readQuery()).split(/\s+/).filter(Boolean);
    const maxMinutes = readMaxMinutes();
    const itemsToHide = new Set();
    const isSearchingNow = readQuery().trim() !== '';
    untimedCount = 0;
    let hasTextMatch = false;
    for (const item of recipeItems) {
      const searchText = searchTextByItem.get(item);
      const hasEveryTerm = terms.every(term => searchText.includes(term));
      if (hasEveryTerm) hasTextMatch = true;
      if (!hasEveryTerm || !isQuickEnough(item, maxMinutes)) itemsToHide.add(item);
      // Every recipe is in the page twice, as a card and as a row, so only its card is counted.
      const isCard = item.parentElement.classList.contains('recipe-cards');
      if (isCard && hasEveryTerm && maxMinutes !== null && item.dataset.minutes === '') untimedCount += 1;
    }

    for (const term of emptyNote.querySelectorAll('.empty-term')) {
      term.textContent = describeSearch();
    }
    writeSearchToUrl();
    reportEmptySearchSoon(terms.length > 0 && !hasTextMatch);

    // Typing a letter that leaves the same recipes showing changes nothing, so nothing moves.
    const isSameListing = recipeItems.every(item => hiddenItems.has(item) === itemsToHide.has(item));
    if (isSameListing && isSearchingNow === isSearching) return;

    // The change itself runs a frame later, so it reads the newest result then, not the one from when it was asked for.
    hiddenItems = itemsToHide;
    isSearching = isSearchingNow;
    // While a crossfade runs, every tap lands on the page root. With the keyboard up the next tap is usually a result, so the swap is instant.
    if (isInstant || isTyping) showHiddenItems();
    else changeWithTransition(showHiddenItems);
  }

  // Searches whose words match no recipe tell us which keywords are missing. A dead end caused only by the time limit isn't one of those.
  function reportEmptySearchSoon(isEmptySearch) {
    clearTimeout(emptySearchTimer);
    if (!isEmptySearch) return;
    emptySearchTimer = setTimeout(reportEmptySearch, 1000);
  }

  function reportEmptySearch() {
    if (!hasSearchTextLoaded) return;
    const query = readQuery().trim().slice(0, 100);
    const simplifiedQuery = simplify(query);
    if (reportedEmptyQueries.has(simplifiedQuery)) return;
    reportedEmptyQueries.add(simplifiedQuery);
    window.umami?.track('search-empty', { query });
  }

  function showCourseLinksWhenBrowsing() {
    courseScroller.hidden = isSearching || isTyping || !emptyNote.hidden;
  }

  function showHiddenItems() {
    listing.classList.toggle('is-searching', isSearching);
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
    showCourseLinksWhenBrowsing();
  }

  function servePicksFrom(popover) {
    const panel = popover.querySelector('.pick');
    const dish = popover.querySelector('.pick-link');
    let shownPick = null;
    let isSendingBack = false;

    const triggerIcon = document.getElementById(popover.getAttribute('for')).querySelector('hue-hop');

    function showPickInPopover(pick) {
      shownPick = pick;
      showPick(popover, pick);
      triggerIcon?.setAttribute('hue', hueByCourse[pick.entry.course]);
    }

    // The panel fits its title, so its width glides between the two instead of jumping.
    async function slideInPick(pick) {
      const tokens = getComputedStyle(document.documentElement);
      const settle = parseFloat(tokens.getPropertyValue('--settle'));
      const easeSettle = tokens.getPropertyValue('--ease-settle').trim();
      const leaving = dish.animate(
        [{ translate: '0', opacity: 1 }, { translate: '-1.5rem 0', opacity: 0 }],
        { duration: parseFloat(tokens.getPropertyValue('--press')), easing: 'ease-in', fill: 'forwards' }
      );
      await leaving.finished;

      const oldWidth = panel.getBoundingClientRect().width;
      showPickInPopover(pick);
      const newWidth = panel.getBoundingClientRect().width;
      leaving.cancel();

      // The new title is laid out at its final width from the start, so it never rewraps while the panel grows.
      dish.style.inlineSize = `${newWidth}px`;
      // The settle easing dips past its target, and a panel narrower than its foot would wrap the occasion line.
      panel.style.minInlineSize = `${Math.min(oldWidth, newWidth)}px`;
      panel.style.overflow = 'clip';
      const growing = panel.animate([{ inlineSize: `${oldWidth}px` }, { inlineSize: `${newWidth}px` }], { duration: settle, easing: easeSettle });
      const arriving = dish.animate([{ translate: '1.5rem 0', opacity: 0 }, { translate: '0', opacity: 1 }], { duration: settle, easing: easeSettle });
      await Promise.all([growing.finished, arriving.finished]);
      dish.style.inlineSize = '';
      panel.style.minInlineSize = '';
      panel.style.overflow = '';
    }

    async function sendBack() {
      const pick = choosePickForNow(shownPick?.entry.url ?? null);
      if (!pick || isSendingBack) return;
      isSendingBack = true;
      if (prefersReducedMotion.matches) showPickInPopover(pick);
      else await slideInPick(pick);
      popover.querySelector('.pick-status').textContent = pick.entry.title;
      isSendingBack = false;
    }

    // Each opening is a fresh look at the clock, so a tab left open since lunch suggests dinner.
    popover.addEventListener('wa-show', () => {
      const pick = choosePickForNow();
      if (pick) showPickInPopover(pick);
    });
    popover.querySelector('.pick-again').addEventListener('click', sendBack);
  }

  for (const popover of document.querySelectorAll('.pick-popover')) servePicksFrom(popover);
  document.querySelector('#site-pick').hidden = false;

  const filtersToggle = document.querySelector('.filters-toggle');
  const listingFilters = document.querySelector('.listing-filters');

  function showFilters(isOpen) {
    listingFilters.inert = isPhoneWidth.matches && !isOpen;
    filtersToggle.setAttribute('aria-expanded', String(isOpen));
  }

  // On a phone the tap on the field is caught first, so the page top is gone and the page is at its top before the keyboard opens.
  // This order is what kept Safari from sliding the screen past the toolbar; it was found by trial, so it stays as it is.
  const listingControls = document.querySelector('.listing-controls');
  const searchField = searchInput.closest('.search-field');
  const stuckTap = searchField.querySelector('.stuck-tap');
  let isPressInToolbar = false;
  let clickWaitTimer = null;
  const clickWaitMs = 100;

  function markTyping(isOn) {
    isTyping = isOn;
    listing.classList.toggle('is-typing', isOn);
    showCourseLinksWhenBrowsing();
  }

  function startTyping(event) {
    if (searchField.matches(':focus-within')) return;
    event.preventDefault();
    if (!isTyping) scrollYBeforeTyping = scrollY;
    markTyping(true);
    scrollTo({ top: 0, behavior: 'instant' });
    searchInput.focus();
    isPressInToolbar = false;
    // Safari sometimes turns the tap down, for one that lands as a scroll stops. Typing mode without a keyboard would leave the page top missing.
    if (!searchField.matches(':focus-within')) stopTyping();
  }

  // With a search in the field the reader stays on the same results; an empty field puts them back where they were before the tap.
  function stopTyping() {
    if (!isTyping) return;
    if (readQuery().trim()) {
      const markerTopBefore = stuckMarker.getBoundingClientRect().top;
      markTyping(false);
      scrollBy({ top: stuckMarker.getBoundingClientRect().top - markerTopBefore, behavior: 'instant' });
      markWhetherStuck();
    } else {
      changeWithTransition(() => {
        markTyping(false);
        scrollTo({ top: scrollYBeforeTyping, behavior: 'instant' });
        markWhetherStuck();
      });
    }
  }

  stuckTap.addEventListener('touchend', startTyping);
  stuckTap.addEventListener('click', startTyping);
  document.addEventListener('pointerdown', event => (isPressInToolbar = listingControls.contains(event.target)), {
    capture: true
  });
  // A press that never blurs the field, like the clear button, mustn't count for a later blur from the keyboard's Done.
  for (const type of ['click', 'pointercancel']) {
    document.addEventListener(type, () => setTimeout(() => (isPressInToolbar = false)), { capture: true });
  }

  // iOS blurs the field just before a tap's click, then aims the click where the tap was before any scroll.
  // So the page top comes back once the click has landed, or after a short wait when none comes (the keyboard's Done, a link preview).
  function waitForClickThenStopTyping() {
    clearTimeout(clickWaitTimer);
    clickWaitTimer = setTimeout(stopTypingAfterClickWait, clickWaitMs);
  }

  function cancelClickWait() {
    clearTimeout(clickWaitTimer);
    clickWaitTimer = null;
  }

  function stopTypingAfterClickWait() {
    cancelClickWait();
    if (!searchField.matches(':focus-within')) stopTyping();
  }

  searchInput.addEventListener('blur', () => {
    if (isTyping && !isPressInToolbar) waitForClickThenStopTyping();
  });
  // With the field already blurred by a press in the toolbar, iOS sends a tap's mousedown on release, just before its click.
  document.addEventListener(
    'mousedown',
    event => {
      const isFieldFocused = searchField.matches(':focus-within');
      if (isTyping && !isFieldFocused && !listingControls.contains(event.target)) waitForClickThenStopTyping();
    },
    { capture: true }
  );
  document.addEventListener('click', () => {
    if (clickWaitTimer !== null) stopTypingAfterClickWait();
  });
  // A drag scrolls the page, and the toolbar can't stick while typing, so a drag ends typing. A tap that wobbles a few pixels doesn't.
  let touchStartY = 0;
  document.addEventListener('touchstart', event => (touchStartY = event.touches[0].clientY), { passive: true });
  document.addEventListener(
    'touchmove',
    event => {
      if (!isTyping || Math.abs(event.touches[0].clientY - touchStartY) < 10) return;
      isPressInToolbar = false;
      searchInput.blur();
      cancelClickWait();
      stopTyping();
    },
    { passive: true }
  );

  filtersToggle.addEventListener('click', () => showFilters(listingFilters.inert));
  isPhoneWidth.addEventListener('change', () => showFilters(false));
  isTouchScreen.addEventListener('change', stopTyping);

  searchField.hidden = false;
  timeSelect.hidden = false;

  searchInput.addEventListener('focus', loadSearchTextOnce);
  searchInput.addEventListener('input', () => {
    loadSearchTextOnce();
    showMatches();
  });
  timeSelect.addEventListener('change', () => showMatches());
  emptyNote.querySelector('.empty-tags').addEventListener('click', event => {
    const suggestion = event.target.closest('[data-search]');
    if (!suggestion) return;
    timeSelect.value = 'any';
    search(suggestion.dataset.search);
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

  // Dropping the hash lets the search icon work a second time and keeps a reload from grabbing focus again.
  // The kit defines wa-input before it draws the inner field that focus() needs, so this waits for both.
  async function focusSearchWhenAsked() {
    if (location.hash !== '#search') return;
    await customElements.whenDefined('wa-input');
    await searchInput.updateComplete;
    // A phone only opens the keyboard for a tap, so there the field is only brought into view.
    if (isPhoneWidth.matches) {
      scrollBy({ top: listingControls.getBoundingClientRect().top, behavior: 'instant' });
    } else {
      searchInput.scrollIntoView({ block: 'center' });
      searchInput.focus();
    }
    history.replaceState(history.state, '', location.pathname + location.search);
  }

  focusSearchWhenAsked();
  addEventListener('hashchange', focusSearchWhenAsked);
}
