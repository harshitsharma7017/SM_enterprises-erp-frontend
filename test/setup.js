import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Captured before any test can replace it — `breakLocalStorage` swaps in a
// throwing stub and we need the real one back afterwards.
const realLocalStorage = window.localStorage;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: realLocalStorage,
  });

  // Reset anything the theme layer writes to the document between tests.
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-density');
  try {
    window.localStorage.clear();
  } catch {
    /* storage may still be stubbed out */
  }
});

// jsdom does not implement ResizeObserver, which the kitchen sink's height probe
// uses to re-measure controls when the layout changes.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom does not implement matchMedia, which the theme provider depends on.
// Individual tests override this to simulate an OS-level dark preference.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
