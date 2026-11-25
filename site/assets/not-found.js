import { choosePick } from './pick.js';

const specialLink = document.querySelector('.not-found-special');

async function showTodaysSpecial() {
  const response = await fetch('/search.json');
  if (!response.ok) return;
  const recipes = await response.json();
  const entries = recipes.map((recipe) => ({ url: recipe.url, course: recipe.course, seasons: recipe.tags }));
  const pick = choosePick({ entries, date: new Date() });
  if (!pick) return;
  specialLink.href = pick.entry.url;
  specialLink.hidden = false;
}

showTodaysSpecial().catch(() => {});
