import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@/components/ui/Card';
import FormSection from '@/components/ui/FormSection';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import * as BadgeModule from '@/components/ui/Badge';

const { StatusBadge, StandardBadge, WorkflowBadge, WORKFLOW_TINTS, workflowTint } = BadgeModule;

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

const SHARED_COMPONENTS = [
  'components/ui/Card.js',
  'components/ui/FormSection.js',
  'components/ui/Badge.js',
  'components/ui/Pagination.js',
  'components/ui/EmptyState.js',
];

// Light-mode-only utilities that must not survive in a shared component. Colour
// families used as saturated accents (blue-600 borders and so on) are fine.
const BANNED_UTILITIES = [
  'bg-white',
  'bg-gray-50',
  'bg-gray-100',
  'text-gray-400',
  'text-gray-500',
  'text-gray-600',
  'text-gray-700',
  'text-gray-800',
  'text-gray-900',
  'border-gray-100',
  'border-gray-200',
  'border-gray-300',
  'ring-gray-300',
  'hover:bg-gray-50',
  'bg-green-100',
  'bg-blue-50',
  'text-blue-600',
];

/** Every exported `*_BADGES` config map, discovered rather than hand-listed. */
const BADGE_MAPS = Object.entries(BadgeModule).filter(
  ([name, value]) => name.endsWith('_BADGES') && value && typeof value === 'object'
);

function renderInTable(ui) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
}

describe('shared components use the token layer', () => {
  it.each(SHARED_COMPONENTS)('%s has no light-mode-only colour utilities', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    const found = BANNED_UTILITIES.filter((utility) => source.includes(utility));
    expect(found).toEqual([]);
  });
});

describe('Card', () => {
  it('renders its title, actions and children', () => {
    render(
      <Card title="Categories" actions={<button type="button">Add</button>}>
        <p>Body</p>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('supplies a themed surface', () => {
    const { container } = render(<Card title="T">x</Card>);
    const root = container.querySelector('.card');
    expect(root.className).toContain('bg-surface');
  });

  it('keeps a distinct accent stripe per variant, and falls back for unknown ones', () => {
    for (const [variant, expected] of [
      ['primary', 'border-blue-600'],
      ['success', 'border-green-600'],
      ['info', 'border-cyan-500'],
      ['warning', 'border-yellow-500'],
      ['danger', 'border-red-600'],
      ['dark', 'border-gray-800'],
      ['nonsense', 'border-blue-600'],
    ]) {
      const { container, unmount } = render(<Card title="T" variant={variant}>x</Card>);
      expect(container.querySelector('.card').className).toContain(expected);
      unmount();
    }
  });
});

describe('FormSection', () => {
  it('renders its title, subtitle, icon and children', () => {
    render(
      <FormSection title="Buyer details" subtitle="Who the order is for" icon="bi-person">
        <p>Fields</p>
      </FormSection>
    );

    expect(screen.getByRole('heading', { name: 'Buyer details' })).toBeInTheDocument();
    expect(screen.getByText('Who the order is for')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });

  it('carries the form-section class the surface styling hangs off', () => {
    const { container } = render(<FormSection title="T" icon="bi-x">x</FormSection>);
    expect(container.querySelector('.form-section')).toBeTruthy();
  });

  it('gets a surface of its own, so it no longer sits on the bare page background', () => {
    // The 8 components that use FormSection without a Card depend on this.
    expect(CSS).toMatch(/\.form-section\s*\{[^}]*background:\s*var\(--surface\)/);
    expect(CSS).toMatch(/\.form-section\s*\{[^}]*border:\s*1px solid var\(--border-subtle\)/);
  });

  it('drops that surface when nested in a Card, to avoid boxing twice', () => {
    expect(CSS).toMatch(/\.card \.form-section\s*\{[^}]*background:\s*transparent/);
    expect(CSS).toMatch(/\.card \.form-section\s*\{[^}]*padding:\s*0/);
  });
});

describe('Badge', () => {
  it('covers every colour any status map refers to', () => {
    // This is the regression guard for the bug where four badges rendered with no
    // background because their colour was missing from the lookup table.
    const referenced = new Set();
    for (const [, map] of BADGE_MAPS) {
      for (const entry of Object.values(map)) referenced.add(entry.color);
    }

    const missing = [...referenced].filter((color) => !WORKFLOW_TINTS[color]);
    expect(missing).toEqual([]);
    // The colours that were previously absent.
    for (const color of ['indigo', 'purple', 'yellow']) {
      expect(WORKFLOW_TINTS[color]).toBeTruthy();
    }
  });

  it('resolves every entry of every map to a real tint class', () => {
    expect(BADGE_MAPS.length).toBeGreaterThan(20);

    for (const [name, map] of BADGE_MAPS) {
      for (const [status, entry] of Object.entries(map)) {
        const tint = workflowTint(entry.color);
        expect(tint, `${name}.${status}`).toMatch(/^tint-[a-z]+$/);
        // Every tint class must actually be defined in the stylesheet.
        expect(CSS, `${name}.${status} -> .${tint}`).toContain(`.${tint} {`);
      }
    }
  });

  it('never renders a badge without a tint', () => {
    for (const [name, map] of BADGE_MAPS) {
      for (const status of Object.keys(map)) {
        const { container, unmount } = render(<WorkflowBadge status={status} config={map} />);
        const className = container.firstChild.className;
        expect(className, `${name}.${status}`).not.toContain('undefined');
        expect(className, `${name}.${status}`).toMatch(/tint-[a-z]+/);
        unmount();
      }
    }
  });

  it('falls back to gray for an unknown status', () => {
    const { container } = render(<WorkflowBadge status="__nope__" config={{}} />);
    expect(container.firstChild.className).toContain('tint-gray');
    expect(container.firstChild).toHaveTextContent('__nope__');
  });

  it('falls back to gray for an unknown colour', () => {
    expect(workflowTint('chartreuse')).toBe('tint-gray');
    const { container } = render(
      <WorkflowBadge status="x" config={{ x: { label: 'X', color: 'chartreuse' } }} />
    );
    expect(container.firstChild.className).toContain('tint-gray');
    expect(container.firstChild.className).not.toContain('undefined');
  });

  it('shows active and inactive status distinctly', () => {
    const { container: active } = render(<StatusBadge status="active" />);
    expect(active.firstChild).toHaveTextContent('Active');
    expect(active.firstChild.className).toContain('tint-green');

    const { container: inactive } = render(<StatusBadge status="inactive" />);
    expect(inactive.firstChild).toHaveTextContent('Inactive');
    expect(inactive.firstChild.className).toContain('tint-gray');
  });

  it('becomes a button when given a click handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<StatusBadge status="active" onClick={onClick} />);

    const badge = screen.getByRole('button', { name: 'Active' });
    await user.click(badge);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stays a span without a click handler', () => {
    render(<StatusBadge status="active" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a caller override StandardBadge styling', () => {
    const { container } = render(<StandardBadge className="font-mono">CAT-001</StandardBadge>);
    expect(container.firstChild).toHaveTextContent('CAT-001');
    expect(container.firstChild.className).toContain('font-mono');
    expect(container.firstChild.className).toContain('tint-gray');
  });
});

describe('Pagination', () => {
  const pagination = { current_page: 3, last_page: 9, from: 31, to: 45, total: 131 };

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination pagination={{ ...pagination, last_page: 1 }} onPageChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing without pagination data', () => {
    const { container } = render(<Pagination pagination={null} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reports the current range', () => {
    render(<Pagination pagination={pagination} onPageChange={vi.fn()} />);
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('131')).toBeInTheDocument();
  });

  it('marks the current page for assistive tech', () => {
    render(<Pagination pagination={pagination} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '4' })).not.toHaveAttribute('aria-current');
  });

  it('changes page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: '5' }));
    expect(onPageChange).toHaveBeenCalledWith(5);

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables the step buttons at the ends', () => {
    const { unmount } = render(
      <Pagination pagination={{ ...pagination, current_page: 1 }} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    unmount();

    render(<Pagination pagination={{ ...pagination, current_page: 9 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('EmptyState', () => {
  it('renders as a table row spanning the given columns', () => {
    const { container } = renderInTable(
      <EmptyState colspan={7} icon="bi-tags" title="No categories yet" message="Add the first one." />
    );

    expect(screen.getByRole('heading', { name: 'No categories yet' })).toBeInTheDocument();
    expect(screen.getByText('Add the first one.')).toBeInTheDocument();
    expect(container.querySelector('td')).toHaveAttribute('colspan', '7');
  });

  it('hides its decorative icon from assistive tech', () => {
    const { container } = renderInTable(
      <EmptyState colspan={1} icon="bi-tags" title="T" message="M" />
    );
    expect(container.querySelector('i')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('alerts', () => {
  it('draw their colours from the tint families', () => {
    for (const [variant, family] of [
      ['success', 'green'],
      ['danger', 'red'],
      ['warning', 'amber'],
      ['info', 'blue'],
    ]) {
      const re = new RegExp(
        `\\.alert-${variant}\\s*\\{[^}]*background:\\s*var\\(--tint-${family}-bg\\)[^}]*color:\\s*var\\(--tint-${family}-fg\\)`
      );
      expect(CSS).toMatch(re);
    }
  });

  it('no longer hardcodes hex colours', () => {
    const block = CSS.slice(CSS.indexOf('.alert-success'), CSS.indexOf('.form-section'));
    expect(block).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
