// Theme toggle module — persists preference in localStorage

const STORAGE_KEY = 'python-playground-theme';
let currentTheme = 'dark';
let themeChangeCallback = null;

/**
 * Initialize the theme system.
 * Reads saved preference from localStorage (defaults to 'dark'),
 * applies the data-theme attribute, and stores the callback for future toggles.
 * @param {function} onThemeChange - callback invoked with the new theme name on toggle
 */
export function initTheme(onThemeChange) {
  themeChangeCallback = onThemeChange;
  currentTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
}

/**
 * Toggle between 'dark' and 'light' themes.
 * Saves the new preference to localStorage, updates the data-theme attribute,
 * and calls the onThemeChange callback.
 */
export function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, currentTheme);
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeChangeCallback) {
    themeChangeCallback(currentTheme);
  }
}

/**
 * Get the current theme name.
 * @returns {'dark' | 'light'} The current theme
 */
export function getTheme() {
  return currentTheme;
}

