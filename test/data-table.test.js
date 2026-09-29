import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

/** Declarations of the first rule whose selector matches exactly. */
function declarationsOf(selector) {
  const re = new RegExp(
    `(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`
  );
  const match = CSS.match(re);
  if (!match) return null;

  const body = match[2].replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = {};
  for (const part of body.split(';')) {
    const at = part.indexOf(':');
    if (at === -1) continue;
    const property = part.slice(0, at).trim();
    if (!property) continue;
    declarations[property] = part.slice(at + 1).trim();
  }
  return declarations;
}

/** Minimal table using the primitive, for structural assertions. */
function SampleTable() {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th className="cell-num">Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="cell-muted">1</td>
            <td className="cell-strong">Knitted Tops</td>
            <td className="cell-num">128</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

describe('.data-table primitive', () => {
  it('drives cell padding from the density tokens', () => {
    // This is what makes the compact setting buy rows per screen rather than
    // only shrinking text.
    const th = declarationsOf('.data-table thead th');
    const td = declarationsOf('.data-table tbody td');

    expect(th.padding).toBe('var(--cell-pad-y) var(--cell-pad-x)');
    expect(td.padding).toBe('var(--cell-pad-y) var(--cell-pad-x)');
  });

  it('uses token colours for the header, body and dividers', () => {
    const th = declarationsOf('.data-table thead th');
    expect(th.background).toBe('var(--surface-raised)');
    expect(th.color).toBe('var(--text-secondary)');
    expect(th['border-bottom']).toBe('1px solid var(--border-subtle)');

    const td = declarationsOf('.data-table tbody td');
    expect(td.color).toBe('var(--text-secondary)');

    const divider = declarationsOf('.data-table tbody tr + tr td');
    expect(divider['border-top']).toBe('1px solid var(--border-subtle)');
  });

  it('separates rows only, so the header border is not doubled', () => {
    // A plain `tbody td { border-top }` would stack against the header's own
    // border-bottom on the first row.
    expect(CSS).toContain('.data-table tbody tr + tr td');
    expect(declarationsOf('.data-table tbody td')['border-top']).toBeUndefined();
  });

  it('keeps borders visible under a sticky header', () => {
    // A collapsed border disappears beneath a sticky element.
    const table = declarationsOf('.data-table');
    expect(table['border-collapse']).toBe('separate');
    expect(table['border-spacing']).toBe('0');
  });

  it('makes the sticky header opt-in', () => {
    // Sticking by default would pin headers to the viewport on pages that scroll
    // as a whole, overlapping the app header.
    expect(CSS).toMatch(/\.data-table-sticky thead th\s*\{[^}]*position:\s*sticky/);
    expect(declarationsOf('.data-table thead th').position).toBeUndefined();
  });

  it('pairs the sticky modifier with a scrollable wrapper', () => {
    const scroll = declarationsOf('.table-wrap-scroll');
    expect(scroll['overflow-y']).toBe('auto');
    expect(scroll['max-height']).toBeTruthy();
  });

  it('gives the wrapper a themed surface and horizontal scroll', () => {
    const wrap = declarationsOf('.table-wrap');
    expect(wrap['overflow-x']).toBe('auto');
    expect(wrap.background).toBe('var(--surface)');
    expect(wrap.border).toBe('1px solid var(--border-subtle)');
  });

  it('hovers the row rather than a single cell', () => {
    expect(CSS).toMatch(/\.data-table tbody tr:hover td\s*\{[^}]*background:\s*var\(--surface-hover\)/);
  });
});

describe('emphasis tier', () => {
  it('defaults body cells to secondary so an identifier can stand out', () => {
    expect(declarationsOf('.data-table tbody td').color).toBe('var(--text-secondary)');
    expect(declarationsOf('.data-table .cell-strong').color).toBe('var(--text-primary)');
    expect(declarationsOf('.data-table .cell-strong')['font-weight']).toBe('600');
  });

  it('offers a further-recessed step', () => {
    expect(declarationsOf('.data-table .cell-muted').color).toBe('var(--text-muted)');
  });

  it('aligns figures digit-for-digit', () => {
    const num = declarationsOf('.data-table .cell-num');
    expect(num['font-variant-numeric']).toBe('tabular-nums');
    expect(num['text-align']).toBe('right');
  });

  it('gives headers weight without relying on colour alone', () => {
    expect(declarationsOf('.data-table thead th')['font-weight']).toBe('600');
  });

  it('provides three distinct emphasis levels', () => {
    const levels = new Set([
      declarationsOf('.data-table .cell-strong').color,
      declarationsOf('.data-table tbody td').color,
      declarationsOf('.data-table .cell-muted').color,
    ]);
    expect(levels.size).toBe(3);
  });
});

describe('table markup', () => {
  it('renders a semantic table with the emphasis classes applied', () => {
    render(<SampleTable />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: 'Knitted Tops' })).toHaveClass('cell-strong');
    expect(screen.getByRole('cell', { name: '128' })).toHaveClass('cell-num');
  });

  it('needs no per-cell padding utilities', () => {
    const { container } = render(<SampleTable />);
    // Padding comes from the primitive; a per-cell utility would defeat density.
    for (const cell of container.querySelectorAll('th, td')) {
      expect(cell.className).not.toMatch(/\bp[xy]?-\d/);
    }
  });
});
