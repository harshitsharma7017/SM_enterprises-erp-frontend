'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const THEME_STORAGE_KEY = 'erp-theme';
export const DENSITY_STORAGE_KEY = 'erp-density';

export const THEMES = ['light', 'dark', 'system'];
export const DENSITIES = ['comfortable', 'compact'];

const DEFAULT_THEME = 'system';
const DEFAULT_DENSITY = 'comfortable';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Runs in the document head before first paint, so the correct theme is on
 * <html> before anything renders. Without it the page paints light and then
 * snaps to dark once React hydrates.
 *
 * Kept dependency-free and defensive: localStorage throws in some privacy
 * modes, and a failure here must not block the app from rendering.
 *
 * Exported so a test can assert the script and the provider agree on keys and
 * defaults.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='light'&&t!=='dark'&&t!=='system')t='${DEFAULT_THEME}';
var dark=t==='dark'||(t==='system'&&window.matchMedia('${DARK_QUERY}').matches);
d.classList.toggle('dark',dark);
var n=localStorage.getItem('${DENSITY_STORAGE_KEY}');
if(n!=='comfortable'&&n!=='compact')n='${DEFAULT_DENSITY}';
d.setAttribute('data-density',n);
}catch(e){}})();`;

const ThemeContext = createContext(null);

function readStored(key, allowed, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage unavailable — the preference just will not persist. */
  }
}

function systemPrefersDark() {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/** Applies a theme choice to <html> and reports what it resolved to. */
function applyTheme(theme) {
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
  return isDark ? 'dark' : 'light';
}

function applyDensity(density) {
  document.documentElement.setAttribute('data-density', density);
}

export function ThemeProvider({ children }) {
  // Server render and first client render both start at the defaults, which
  // keeps hydration consistent. THEME_INIT_SCRIPT has already applied the real
  // values to the DOM; the effect below brings React state in line.
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [density, setDensityState] = useState(DEFAULT_DENSITY);
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    // Deferred rather than set synchronously: a synchronous setState in an
    // effect body triggers cascading renders and is rejected by lint. Mirrors
    // the localStorage restore in DashboardLayout.
    queueMicrotask(() => {
      const storedTheme = readStored(THEME_STORAGE_KEY, THEMES, DEFAULT_THEME);
      const storedDensity = readStored(DENSITY_STORAGE_KEY, DENSITIES, DEFAULT_DENSITY);

      setThemeState(storedTheme);
      setDensityState(storedDensity);
      setResolvedTheme(applyTheme(storedTheme));
      applyDensity(storedDensity);
    });
  }, []);

  // While following the OS, react to the OS changing under us.
  useEffect(() => {
    if (theme !== 'system') return undefined;

    let query;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      return undefined;
    }

    const handleChange = () => setResolvedTheme(applyTheme('system'));
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    setThemeState(next);
    setResolvedTheme(applyTheme(next));
    writeStored(THEME_STORAGE_KEY, next);
  }, []);

  const setDensity = useCallback((next) => {
    if (!DENSITIES.includes(next)) return;
    setDensityState(next);
    applyDensity(next);
    writeStored(DENSITY_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, density, setDensity }),
    [theme, setTheme, resolvedTheme, density, setDensity]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
