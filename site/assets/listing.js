import { choosePick, chooseSurprise } from './pick.js';
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

const courseSections = [...document.querySelectorAll('.course')];
const courseScroller = document.querySelector('.course-bar wa-scroller');
let markedCourseLink = null;
let isSlideOwed = false;

function findCurrentCourse() {
  const shownSections = courseSections.filter(section => !section.hidden);
  // The last courses' headings may never scroll up to the line. At the bottom of the page, a course just followed
  // keeps its mark while its heading is on screen; otherwise the last course is current.
  if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 1) {
    const followedSection = shownSections.find(section => {
      const heading = section.querySelector('.section-head');
      return location.hash === `#${heading.id}` && heading.getBoundingClientRect().top >= 0;
    });
    return followedSection ?? shownSections.at(-1);
  }
  // Where a followed course link lands its heading, so a followed course is marked on arrival.
  const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart);
  return shownSections.findLast(section => {
    const heading = section.querySelector('.section-head');
    const landingLine = scrollPadding + parseFloat(getComputedStyle(heading).scrollMarginBlockStart);
    return heading.getBoundingClientRect().top <= landingLine + 1;
  });
}

// Only the scroller's own box moves, sideways: scrollIntoView would also scroll the page to clear its scroll padding.
function slideIntoView(link, isInstant) {
  const box = courseScroller.content;
  isSlideOwed = !box;
  if (!box) return;
  const behavior = isInstant || prefersReducedMotion.matches ? 'instant' : 'smooth';
  if (!link) {
    box.scrollTo({ left: 0, behavior });
    return;
  }
  const room = parseFloat(getComputedStyle(link.parentElement).paddingInlineStart);
  const linkRect = link.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (linkRect.left < boxRect.left) box.scrollBy({ left: linkRect.left - boxRect.left - room, behavior });
  else if (linkRect.right > boxRect.right) box.scrollBy({ left: linkRect.right - boxRect.right + room, behavior });
}

function markCurrentCourse() {
  const section = findCurrentCourse();
  const link = section ? document.querySelector(`.course-links [data-course="${section.dataset.course}"]`) : null;
  if (link === markedCourseLink && !isSlideOwed) return;
  // A smooth slide started while the page is still revealing gets cancelled, so the first mark after a load jumps.
  const isArriving = markedCourseLink === null || isSlideOwed;
  markedCourseLink?.removeAttribute('aria-current');
  link?.setAttribute('aria-current', 'true');
  markedCourseLink = link;
  slideIntoView(link, isArriving);
}

// A marker just above the course links going off the top is how the page knows they are stuck.
const courseBar = document.querySelector('.course-bar');
const stuckMarker = document.createElement('div');
stuckMarker.className = 'stuck-marker';

function markCourseBar() {
  courseBar.classList.toggle('is-stuck', stuckMarker.getBoundingClientRect().top < 0);
  markCurrentCourse();
}

if (courseBar) {
  courseBar.before(stuckMarker);
  addEventListener('scroll', markCourseBar, { passive: true });
  markCourseBar();
  // The page's reveal animation slides everything a few pixels after a load or a jump, with no scroll event, so check again once it ends.
  const page = document.querySelector('wa-page');
  page.addEventListener('animationend', event => {
    if (event.target === page) markCourseBar();
  });
}

const quickToggle = document.querySelector('.quick-toggle');
if (quickToggle) {
  const quickMinutes = 30;
  const recipeItems = [...document.querySelectorAll('.recipe-cards > li, .recipe-rows > li')];
  const courseLinks = document.querySelector('.course-links');
  const matchCount = document.querySelector('.match-count');
  const untimedNote = document.querySelector('.untimed-note');
  let hiddenItems = new Set();
  let untimedCount = 0;

  const pickEntries = [];
  for (const item of recipeItems) {
    if (!item.parentElement.classList.contains('recipe-cards')) continue;
    pickEntries.push({
      url: item.querySelector('a').getAttribute('href'),
      title: item.querySelector('.card-title').textContent.trim(),
      course: item.closest('.course').dataset.course,
      seasons: item.dataset.seasons.split(' ').filter(Boolean),
      icons: [...item.querySelectorAll('.recipe-icons wa-icon')],
    });
  }

  function choosePickForNow() {
    const now = new Date();
    const pick = choosePick({ entries: pickEntries, date: now });
    return pick && { ...pick, now };
  }

  // Season names are tag slugs, so "early-summer" has to become "Early Summer".
  function writeInTitleCase(slug) {
    const words = [];
    for (const word of slug.split('-')) words.push(word[0].toUpperCase() + word.slice(1));
    return words.join(' ');
  }

  function showPick(container, pick) {
    container.querySelector('wa-format-date').date = pick.now;
    container.querySelector('.pick-word').textContent = writeInTitleCase(pick.word);
    container.querySelector('.pick-season').textContent = pick.isInSeason ? writeInTitleCase(pick.season) : '';
    const link = container.querySelector('.pick-link');
    link.href = pick.entry.url;
    link.querySelector('.pick-title').textContent = pick.entry.title;

    const surprise = chooseSurprise({ entries: pickEntries, excludedUrl: pick.entry.url });
    const surpriseLink = container.querySelector('.pick-surprise');
    surpriseLink.hidden = surprise === null;
    if (surprise) surpriseLink.href = surprise.url;

    const icons = [];
    for (const icon of pick.entry.icons) icons.push(icon.cloneNode());
    const iconSet = container.querySelector('.pick-icons');
    iconSet.replaceChildren(...icons);
  }

  function isQuickOn() {
    return quickToggle.getAttribute('aria-pressed') === 'true';
  }

  function readMaxMinutes() {
    return isQuickOn() ? quickMinutes : null;
  }

  function isQuickEnough(item, maxMinutes) {
    if (maxMinutes === null) return true;
    return item.dataset.minutes !== '' && Number(item.dataset.minutes) <= maxMinutes;
  }

  // The time limit lives in the address too, so Back from a recipe returns to it and a link can carry it.
  function writeTimeToUrl() {
    const url = new URL(location.href);
    const maxMinutes = readMaxMinutes();
    if (maxMinutes !== null) url.searchParams.set('time', maxMinutes);
    else url.searchParams.delete('time');
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  }

  function showMatches({ isInstant = false } = {}) {
    const maxMinutes = readMaxMinutes();
    const itemsToHide = new Set();
    untimedCount = 0;
    for (const item of recipeItems) {
      if (!isQuickEnough(item, maxMinutes)) itemsToHide.add(item);
      // Every recipe is in the page twice, as a card and as a row, so only its card is counted.
      const isCard = item.parentElement.classList.contains('recipe-cards');
      if (isCard && maxMinutes !== null && item.dataset.minutes === '') untimedCount += 1;
    }
    writeTimeToUrl();

    const isSameListing = recipeItems.every(item => hiddenItems.has(item) === itemsToHide.has(item));
    if (isSameListing) return;

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

    matchCount.textContent = shownCount === 1 ? '1 recipe' : `${shownCount} recipes`;

    // A time limit can't judge a recipe with no time on it, so it leaves those out and says how many.
    untimedNote.hidden = untimedCount === 0;
    untimedNote.textContent =
      untimedCount === 1 ? '1 recipe has no time on it, so it is left out.' : `${untimedCount} recipes have no time on them, so they are left out.`;

    markCurrentCourse();
  }

  // Each opening is a fresh look at the clock, so a tab left open since lunch suggests dinner.
  for (const popover of document.querySelectorAll('.pick-popover')) {
    popover.addEventListener('wa-show', () => {
      const pick = choosePickForNow();
      if (pick) showPick(popover, pick);
    });
  }
  document.querySelector('#site-pick').hidden = false;

  quickToggle.hidden = false;
  quickToggle.addEventListener('click', () => {
    quickToggle.setAttribute('aria-pressed', String(!isQuickOn()));
    showMatches();
  });

  // A time limit that arrives in the address is applied before anything shows, without the settle.
  if (new URLSearchParams(location.search).get('time') === String(quickMinutes)) quickToggle.setAttribute('aria-pressed', 'true');
  showMatches({ isInstant: true });
}
