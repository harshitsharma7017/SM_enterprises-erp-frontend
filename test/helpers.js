import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

/**
 * Renders inside the app's providers. `useTheme` throws without a
 * ThemeProvider, which is deliberate, so anything touching theme or density
 * needs this rather than a bare `render`.
 */
export function renderWithProviders(ui, options) {
  return render(ui, { wrapper: ThemeProvider, ...options });
}

/**
 * Replaces window.matchMedia so a test can simulate the OS colour preference.
 * Returns a function that fires a `change` event at registered listeners, for
 * testing that `theme: 'system'` follows the OS live.
 */
export function stubMatchMedia(prefersDark) {
  const listeners = new Set();
  let matches = prefersDark;

  window.matchMedia = (query) => ({
    get matches() {
      return query.includes('prefers-color-scheme: dark') ? matches : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_event, handler) => listeners.add(handler),
    removeEventListener: (_event, handler) => listeners.delete(handler),
    addListener: (handler) => listeners.add(handler),
    removeListener: (handler) => listeners.delete(handler),
    dispatchEvent: () => false,
  });

  return function setPrefersDark(next) {
    matches = next;
    for (const handler of listeners) handler({ matches: next });
  };
}

/** Makes localStorage throw, as it does in some privacy modes. */
export function breakLocalStorage() {
  const failing = {
    getItem() {
      throw new Error('storage disabled');
    },
    setItem() {
      throw new Error('storage disabled');
    },
    removeItem() {
      throw new Error('storage disabled');
    },
    clear() {
      throw new Error('storage disabled');
    },
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: failing,
  });
}
