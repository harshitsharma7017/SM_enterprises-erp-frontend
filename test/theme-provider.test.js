import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DENSITIES,
  DENSITY_STORAGE_KEY,
  THEMES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from '@/components/providers/ThemeProvider';
import { breakLocalStorage, renderWithProviders, stubMatchMedia } from './helpers';

const html = () => document.documentElement;

/** Surfaces the context so assertions can read it, plus buttons to drive it. */
function Probe() {
  const { theme, resolvedTheme, density, setTheme, setDensity } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="density">{density}</span>
      {THEMES.map((t) => (
        <button key={t} type="button" onClick={() => setTheme(t)}>
          {`set-${t}`}
        </button>
      ))}
      {DENSITIES.map((d) => (
        <button key={d} type="button" onClick={() => setDensity(d)}>
          {`set-${d}`}
        </button>
      ))}
      <button type="button" onClick={() => setTheme('bogus')}>
        set-bogus-theme
      </button>
      <button type="button" onClick={() => setDensity('bogus')}>
        set-bogus-density
      </button>
    </div>
  );
}

async function mountProbe() {
  const user = userEvent.setup();
  renderWithProviders(<Probe />);
  // The mount sync is deferred through a microtask.
  await waitFor(() => expect(screen.getByTestId('density')).toBeInTheDocument());
  return user;
}

describe('ThemeProvider', () => {
  it('defaults to following the system theme at comfortable density', async () => {
    stubMatchMedia(false);
    await mountProbe();

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
    });
    expect(html()).toHaveAttribute('data-density', 'comfortable');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('applies dark and persists the choice', async () => {
    stubMatchMedia(false);
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-dark' }));

    expect(html().classList.contains('dark')).toBe(true);
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('applies light and persists the choice', async () => {
    stubMatchMedia(true);
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-light' }));

    expect(html().classList.contains('dark')).toBe(false);
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('resolves system to dark when the OS prefers dark', async () => {
    stubMatchMedia(true);
    await mountProbe();

    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('follows the OS preference changing while set to system', async () => {
    const setPrefersDark = stubMatchMedia(false);
    await mountProbe();

    await waitFor(() => expect(screen.getByTestId('resolved')).toHaveTextContent('light'));

    setPrefersDark(true);

    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
      expect(html().classList.contains('dark')).toBe(true);
    });
  });

  it('stops following the OS once an explicit choice is made', async () => {
    const setPrefersDark = stubMatchMedia(false);
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-light' }));
    setPrefersDark(true);

    // An explicit light choice must survive the OS flipping to dark.
    expect(html().classList.contains('dark')).toBe(false);
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('restores a stored theme on mount', async () => {
    stubMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    await mountProbe();

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(html().classList.contains('dark')).toBe(true);
    });
  });

  it('restores a stored density on mount', async () => {
    stubMatchMedia(false);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact');

    await mountProbe();

    await waitFor(() => {
      expect(screen.getByTestId('density')).toHaveTextContent('compact');
      expect(html()).toHaveAttribute('data-density', 'compact');
    });
  });

  it('switches density and persists it', async () => {
    stubMatchMedia(false);
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-compact' }));

    expect(html()).toHaveAttribute('data-density', 'compact');
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact');

    await user.click(screen.getByRole('button', { name: 'set-comfortable' }));

    expect(html()).toHaveAttribute('data-density', 'comfortable');
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('comfortable');
  });

  it('ignores values outside the allowed sets', async () => {
    stubMatchMedia(false);
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-bogus-theme' }));
    await user.click(screen.getByRole('button', { name: 'set-bogus-density' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('ignores a stored value that is not recognised', async () => {
    stubMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solarized');
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'roomy');

    await mountProbe();

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
    });
  });

  it('still works when localStorage throws', async () => {
    stubMatchMedia(false);
    breakLocalStorage();

    const user = await mountProbe();
    await user.click(screen.getByRole('button', { name: 'set-dark' }));

    // The preference cannot persist, but the theme must still apply.
    expect(html().classList.contains('dark')).toBe(true);
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('still works when matchMedia is unavailable', async () => {
    delete window.matchMedia;
    const user = await mountProbe();

    await user.click(screen.getByRole('button', { name: 'set-dark' }));
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('requires a provider', () => {
    // Guards against a component being rendered outside the provider and
    // silently getting no theme.
    expect(() => render(<Probe />)).toThrow(/within a ThemeProvider/);
  });
});

describe('THEME_INIT_SCRIPT', () => {
  it('applies a stored dark theme before React runs', () => {
    stubMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact');

    // eslint-disable-next-line no-new-func
    new Function(THEME_INIT_SCRIPT)();

    expect(html().classList.contains('dark')).toBe(true);
    expect(html()).toHaveAttribute('data-density', 'compact');
  });

  it('resolves system against the OS preference', () => {
    stubMatchMedia(true);

    // eslint-disable-next-line no-new-func
    new Function(THEME_INIT_SCRIPT)();

    expect(html().classList.contains('dark')).toBe(true);
    expect(html()).toHaveAttribute('data-density', 'comfortable');
  });

  it('falls back to comfortable light when nothing is stored', () => {
    stubMatchMedia(false);

    // eslint-disable-next-line no-new-func
    new Function(THEME_INIT_SCRIPT)();

    expect(html().classList.contains('dark')).toBe(false);
    expect(html()).toHaveAttribute('data-density', 'comfortable');
  });

  it('does not throw when storage is unavailable', () => {
    stubMatchMedia(false);
    breakLocalStorage();

    // eslint-disable-next-line no-new-func
    expect(() => new Function(THEME_INIT_SCRIPT)()).not.toThrow();
  });

  it('uses the same keys and defaults as the provider', () => {
    // The script is a separate implementation of the same logic, so it can
    // drift. Pin the shared contract.
    expect(THEME_INIT_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_INIT_SCRIPT).toContain(DENSITY_STORAGE_KEY);
    expect(THEME_INIT_SCRIPT).toContain('prefers-color-scheme: dark');
    expect(THEME_INIT_SCRIPT).toContain("d.setAttribute('data-density'");
    expect(THEME_INIT_SCRIPT).toContain("d.classList.toggle('dark'");
  });
});
