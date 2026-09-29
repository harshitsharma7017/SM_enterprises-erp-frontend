import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '@/components/layout/Header';
import {
  DENSITY_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '@/components/providers/ThemeProvider';
import { renderWithProviders, stubMatchMedia } from './helpers';

const HEADER_SOURCE = readFileSync(resolve(process.cwd(), 'components/layout/Header.js'), 'utf8');

const user = { name: 'Harshit Sharma', created_at: '2023-04-11T00:00:00Z' };
const html = () => document.documentElement;

function renderHeader(overrides = {}) {
  const props = {
    user,
    onLogout: vi.fn(),
    onToggleSidebar: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<Header {...props} />);
  return props;
}

async function openDropdown(ui) {
  await ui.click(screen.getByRole('button', { expanded: false }));
}

describe('Header', () => {
  it('renders the user name and a locally drawn avatar', () => {
    stubMatchMedia(false);
    renderHeader();

    expect(screen.getByText('Harshit Sharma')).toBeInTheDocument();
    // Initials from the first and last word.
    expect(screen.getByText('HS')).toBeInTheDocument();
  });

  it('sends no request to a third-party avatar service', () => {
    // The old implementation put the user's name in a ui-avatars.com URL.
    expect(HEADER_SOURCE).not.toContain('ui-avatars.com');
    stubMatchMedia(false);
    const { container } = renderWithProviders(
      <Header user={user} onLogout={vi.fn()} onToggleSidebar={vi.fn()} />
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('uses semantic tokens rather than hardcoded light-mode colours', () => {
    for (const banned of [
      'bg-white',
      'text-gray-500',
      'text-gray-600',
      'text-gray-700',
      'text-gray-900',
      'border-gray-100',
      'border-gray-200',
      'hover:bg-gray-100',
      'hover:bg-gray-50',
      'bg-blue-600',
    ]) {
      expect(HEADER_SOURCE).not.toContain(banned);
    }
    expect(HEADER_SOURCE).toContain('bg-surface');
    expect(HEADER_SOURCE).toContain('border-line');
  });

  it('toggles the sidebar', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    const props = renderHeader();

    await ui.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(props.onToggleSidebar).toHaveBeenCalledOnce();
  });

  it('opens and closes the account dropdown', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    renderHeader();

    expect(screen.queryByRole('group', { name: 'Theme' })).not.toBeInTheDocument();

    await openDropdown(ui);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();

    await ui.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('signs out', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    const props = renderHeader();

    await openDropdown(ui);
    await ui.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(props.onLogout).toHaveBeenCalledOnce();
  });
});

describe('Header appearance controls', () => {
  it('exposes theme and density groups with the current option pressed', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    renderHeader();
    await openDropdown(ui);

    const themeGroup = screen.getByRole('group', { name: 'Theme' });
    const densityGroup = screen.getByRole('group', { name: 'Density' });

    // Defaults: system theme, comfortable density.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Auto/ })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: /Comfortable/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Light/ })).toHaveAttribute('aria-pressed', 'false');

    expect(themeGroup).toBeInTheDocument();
    expect(densityGroup).toBeInTheDocument();
  });

  it('switches to dark and updates the document and storage', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    renderHeader();
    await openDropdown(ui);

    await ui.click(screen.getByRole('button', { name: /Dark/ }));

    expect(html().classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: /Dark/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Auto/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches back to light', async () => {
    stubMatchMedia(true);
    const ui = userEvent.setup();
    renderHeader();
    await openDropdown(ui);

    await ui.click(screen.getByRole('button', { name: /^Light/ }));

    expect(html().classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('switches density and updates the document and storage', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    renderHeader();
    await openDropdown(ui);

    await ui.click(screen.getByRole('button', { name: /Compact/ }));

    expect(html()).toHaveAttribute('data-density', 'compact');
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact');
    expect(screen.getByRole('button', { name: /Compact/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is reachable and operable from the keyboard', async () => {
    stubMatchMedia(false);
    const ui = userEvent.setup();
    renderHeader();
    await openDropdown(ui);

    const darkButton = screen.getByRole('button', { name: /Dark/ });
    darkButton.focus();
    expect(darkButton).toHaveFocus();

    await ui.keyboard('{Enter}');
    expect(html().classList.contains('dark')).toBe(true);
  });
});
