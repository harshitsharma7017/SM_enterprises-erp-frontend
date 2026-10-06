import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '@/components/layout/Sidebar';
import { renderWithProviders, stubMatchMedia } from './helpers';

// usePathname is the only Next navigation hook the sidebar uses.
let currentPath = '/dashboard';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}));

const SHELL_FILES = [
  'components/layout/Sidebar.js',
  'components/layout/DashboardLayout.js',
  'components/layout/AppShell.js',
  'components/layout/Header.js',
];

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

const allowAll = () => true;
const denyAll = () => false;

function renderSidebar({ can = allowAll, canAny = allowAll, collapsed = false, onToggleCollapse = vi.fn() } = {}) {
  stubMatchMedia(false);
  renderWithProviders(
    <Sidebar can={can} canAny={canAny} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
  );
}

describe('app shell has no hardcoded colours left', () => {
  it.each(SHELL_FILES)('%s contains no hex literals', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    // Catches both `#2563eb` in a style object and `text-[#9aa4b2]` in a class.
    const hex = source.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(hex).toEqual([]);
  });

  it.each(SHELL_FILES)('%s uses no rgb()/rgba() literals', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/rgba?\(/);
  });

  it.each(SHELL_FILES)('%s has no light-mode-only grey utilities', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const banned of [
      'bg-white',
      'bg-gray-50',
      'bg-gray-100',
      'text-gray-400',
      'text-gray-500',
      'text-gray-600',
      'text-gray-700',
      'text-gray-900',
      'border-gray-200',
      'border-gray-300',
      'border-blue-600',
    ]) {
      expect(source, `${file} still uses ${banned}`).not.toContain(banned);
    }
  });

  it('drives the sidebar logo and brand from tokens that have dark values', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/layout/Sidebar.js'), 'utf8');
    for (const token of [
      '--sidebar-logo-from',
      '--sidebar-logo-to',
      '--sidebar-logo-shadow',
      '--sidebar-brand-color',
      '--sidebar-brand-subtitle',
      '--sidebar-icon-color',
      '--sidebar-link-hover-bg',
    ]) {
      expect(source, `Sidebar should reference ${token}`).toContain(token);
    }

    const darkStart = CSS.indexOf('.dark {');
    const darkBody = CSS.slice(darkStart, CSS.indexOf('\n}', darkStart));
    for (const token of [
      '--sidebar-logo-from',
      '--sidebar-logo-to',
      '--sidebar-logo-shadow',
      '--sidebar-brand-color',
      '--sidebar-brand-subtitle',
    ]) {
      expect(darkBody, `.dark should override ${token}`).toContain(token);
    }
  });

  it('keeps the active-link indicator driven by a token', () => {
    // A hardcoded indicator colour would be invisible against the dark sidebar.
    expect(CSS).toMatch(/\.sidebar-link\.active\s*\{[^}]*box-shadow:\s*inset 3px 0 0 var\(--primary\)/);
  });

  it('themes the sidebar scrollbar', () => {
    expect(CSS).toMatch(/scrollbar-thumb\s*\{\s*background:\s*var\(--scrollbar-thumb\)/);
  });
});

describe('Sidebar', () => {
  beforeEach(() => {
    currentPath = '/dashboard';
  });

  it('renders the brand and dashboard link', () => {
    renderSidebar();
    expect(screen.getByText('SM Enterprises')).toBeInTheDocument();
    expect(screen.getByText('Export ERP')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
  });

  it('marks the current route active', () => {
    currentPath = '/masters/categories';
    renderSidebar();
    const link = screen.getByRole('link', { name: 'Categories' });
    expect(link.className).toContain('active');
  });

  it('hides every gated section when the user can do nothing', () => {
    renderSidebar({ can: denyAll, canAny: denyAll });

    // Dashboard is ungated and must survive.
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    for (const section of ['Masters', 'Sales', 'Planning', 'Procurement', 'Finance', 'Administration']) {
      expect(screen.queryByText(section)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('gates individual items on their own permission', () => {
    // Section visible because canAny passes, but only one item is permitted.
    renderSidebar({ can: (p) => p === 'category.view', canAny: allowAll });

    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('shows section headers only when expanded', () => {
    renderSidebar({ collapsed: false });
    expect(screen.getByText('Masters')).toBeInTheDocument();
  });

  it('hides labels and headers when collapsed', () => {
    renderSidebar({ collapsed: true });
    expect(screen.queryByText('Masters')).not.toBeInTheDocument();
    expect(screen.queryByText('SM Enterprises')).not.toBeInTheDocument();
  });

  it('keeps every nav item named when collapsed to an icon', () => {
    // Icon-only links would otherwise have no accessible name at all.
    renderSidebar({ collapsed: true });

    for (const name of ['Dashboard', 'Categories', 'Products', 'Invoices']) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('aria-label', name);
      // A tooltip gives sighted users the same information.
      expect(link).toHaveAttribute('title', name);
    }

    const unnamed = screen
      .getAllByRole('link')
      .filter((link) => !link.getAttribute('aria-label') && !link.textContent.trim());
    expect(unnamed).toEqual([]);
  });

  it('marks the active link for assistive tech, not just visually', () => {
    currentPath = '/masters/categories';
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
  });

  it('toggles collapse', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();
    renderSidebar({ onToggleCollapse });

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it('labels the collapse button for its current state', () => {
    renderSidebar({ collapsed: true });
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('expands and collapses the user management tree', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const toggle = screen.getByRole('button', { name: /User Management/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Roles' })).toBeInTheDocument();
  });

  it('opens the user management tree when already on one of its routes', () => {
    currentPath = '/user-management/roles';
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Roles' })).toBeInTheDocument();
  });

  it('only lists a report when every permission it needs is held', () => {
    // Supplier History needs four module permissions plus report.view.
    renderSidebar({
      can: (p) => ['report.view', 'purchase-order.view'].includes(p),
      canAny: allowAll,
    });

    expect(screen.getByRole('link', { name: 'PO Report' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Supplier History' })).not.toBeInTheDocument();
  });

  it('shows Jobbers for either jobber or supplier permission', () => {
    renderSidebar({ can: (p) => p === 'supplier.view', canAny: allowAll });
    expect(screen.getByRole('link', { name: 'Jobbers' })).toBeInTheDocument();
  });
});
