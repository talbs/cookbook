import { changeWithTransition } from './transition.js';

const schemeButton = document.querySelector('#site-scheme');
const schemeTooltip = document.querySelector('wa-tooltip[for="site-scheme"]');

// darkScheme, schemeStorageKey, systemScheme and showColorScheme come from the head script in base.njk, which sets the scheme before first paint.
function currentScheme() {
  return document.documentElement.classList.contains('wa-dark')
    ? 'dark'
    : 'light';
}

function labelButton() {
  const isDark = currentScheme() === 'dark';
  schemeButton.setAttribute(
    'aria-label',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );
  schemeTooltip.textContent = isDark ? 'Sunny Side Up' : 'Night Shift';
}

function saveScheme(scheme) {
  try {
    if (scheme === systemScheme()) {
      localStorage.removeItem(schemeStorageKey);
    } else {
      localStorage.setItem(schemeStorageKey, scheme);
    }
  } catch {
    // Private windows can refuse storage; the choice then lasts for this page only.
  }
}

if (schemeButton) {
  labelButton();
  darkScheme.addEventListener('change', labelButton);

  schemeButton.addEventListener('click', () => {
    const nextScheme = currentScheme() === 'dark' ? 'light' : 'dark';
    saveScheme(nextScheme);
    changeWithTransition(() => {
      showColorScheme(nextScheme);
      labelButton();
    }, ['scheme']);
  });
}
