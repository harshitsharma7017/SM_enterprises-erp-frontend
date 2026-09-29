import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

// Comments have to go before any rule parsing, or they end up glued to the
// front of a selector.
const CLEAN_CSS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Flattens the stylesheet into `{ selectors, declarations, media }` entries by
 * matching braces, which handles the nested media blocks a regex alone does not.
 */
function flattenRules(css, media = null) {
  const rules = [];
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;

    // Match to the closing brace of this block.
    let depth = 0;
    let close = open;
    for (let j = open; j < css.length; j += 1) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }

    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, close);

    if (prelude.startsWith('@media')) {
      rules.push(...flattenRules(body, prelude.replace(/^@media\s*/, '')));
    } else if (prelude) {
      rules.push({
        selectors: prelude.split(',').map((s) => s.trim()),
        declarations: body,
        media,
      });
    }

    i = close + 1;
  }

  return rules;
}

const RULES = flattenRules(CLEAN_CSS);

/** Does a media condition apply at the given viewport width, in rem? */
function mediaApplies(condition, widthRem) {
  if (!condition) return true;
  const min = condition.match(/min-width:\s*([\d.]+)rem/);
  const max = condition.match(/max-width:\s*([\d.]+)rem/);
  if (min && widthRem < parseFloat(min[1])) return false;
  if (max && widthRem > parseFloat(max[1])) return false;
  return true;
}

/**
 * Grid template for a selector at a given viewport, by replaying the cascade in
 * source order.
 */
function columnsAt(selector, widthRem) {
  let columns = null;

  for (const rule of RULES) {
    if (!rule.selectors.includes(selector)) continue;
    if (!mediaApplies(rule.media, widthRem)) continue;

    const decl = rule.declarations.match(/grid-template-columns:\s*([^;}]+)/);
    if (decl) columns = decl[1].trim();
  }

  return columns;
}

function countColumns(template) {
  if (!template) return null;
  const repeat = template.match(/repeat\((\d+),/);
  if (repeat) return Number(repeat[1]);
  return template.split(/\s+(?![^(]*\))/).length;
}

function jsFilesUnder(dir) {
  const out = [];
  (function walk(current) {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        if (['node_modules', '.next', '.git'].includes(entry)) continue;
        walk(path);
      } else if (entry.endsWith('.js')) {
        out.push(path);
      }
    }
  })(dir);
  return out;
}

describe('form grid ladder', () => {
  it('starts at one column on a phone', () => {
    for (const selector of ['.form-grid', '.form-grid-3', '.form-grid-4']) {
      expect(countColumns(columnsAt(selector, 20)), selector).toBe(1);
    }
  });

  it('adds an intermediate step instead of jumping straight to four', () => {
    // 48rem (768px) is where the old single `md:` breakpoint went 1 -> 4.
    expect(countColumns(columnsAt('.form-grid-4', 48))).toBe(2);
    expect(countColumns(columnsAt('.form-grid-4', 70))).toBe(3);
    expect(countColumns(columnsAt('.form-grid-4', 90))).toBe(4);
  });

  it('caps each variant at its own column count', () => {
    expect(countColumns(columnsAt('.form-grid', 90))).toBe(2);
    expect(countColumns(columnsAt('.form-grid-3', 90))).toBe(3);
    expect(countColumns(columnsAt('.form-grid-4', 90))).toBe(4);
  });

  it('never decreases columns as the viewport grows', () => {
    for (const selector of ['.form-grid', '.form-grid-3', '.form-grid-4']) {
      const counts = [20, 40, 48, 64, 80, 100].map((w) => countColumns(columnsAt(selector, w)));
      for (let i = 1; i < counts.length; i += 1) {
        expect(counts[i], `${selector} at step ${i}`).toBeGreaterThanOrEqual(counts[i - 1]);
      }
    }
  });

  it('uses minmax(0, 1fr) so long content cannot blow out a column', () => {
    expect(CSS).toMatch(/\.form-grid-4\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(CSS).toContain('repeat(4, minmax(0, 1fr))');
  });

  it('collapses a two-column span on a single-column layout', () => {
    // Spanning 2 of 1 column would overflow.
    expect(CSS).toMatch(/@media \(max-width: 39\.999rem\)\s*\{\s*\.form-grid-span-2\s*\{\s*grid-column:\s*auto/);
  });

  it('offers a full-width cell', () => {
    expect(CSS).toMatch(/\.form-grid-full\s*\{\s*grid-column:\s*1 \/ -1/);
  });

  it('mirrors Tailwind breakpoints so the two stay in step', () => {
    for (const bound of ['40rem', '64rem', '80rem']) {
      expect(CSS).toContain(`min-width: ${bound}`);
    }
  });
});

describe('filter bar', () => {
  it('is a grid rather than a ragged flex wrap', () => {
    expect(CSS).toMatch(/\.filter-bar\s*\{[^}]*display:\s*grid/);
    expect(CSS).toMatch(/\.filter-bar\s*\{[^}]*align-items:\s*end/);
  });

  it('ladders from one to four columns', () => {
    expect(countColumns(columnsAt('.filter-bar', 20))).toBe(1);
    expect(countColumns(columnsAt('.filter-bar', 48))).toBe(2);
    expect(countColumns(columnsAt('.filter-bar', 70))).toBe(4);
  });

  it('lets the search field take more width once there is room', () => {
    expect(CSS).toMatch(/@media \(min-width: 40rem\)\s*\{\s*\.filter-bar-wide\s*\{\s*grid-column:\s*span 2/);
  });

  it('keeps the action buttons on one line', () => {
    expect(CSS).toMatch(/\.filter-bar-actions\s*\{[^}]*display:\s*flex/);
  });
});

describe('stacked table fallback', () => {
  it('only applies below the sm breakpoint', () => {
    const stackBlock = CSS.slice(CSS.indexOf('.data-table-stack'));
    expect(CSS).toMatch(/@media \(max-width: 39\.999rem\)[\s\S]*\.data-table-stack thead\s*\{\s*display:\s*none/);
    expect(stackBlock).toBeTruthy();
  });

  it('is opt-in, so existing tables keep their semantics', () => {
    // `.data-table` on its own must never stack.
    const stackRules = [...CSS.matchAll(/([^{}]*\.data-table-stack[^{}]*)\{/g)];
    expect(stackRules.length).toBeGreaterThan(4);
    expect(CSS).not.toMatch(/\.data-table thead\s*\{[^}]*display:\s*none/);
  });

  it('labels each cell from its data-label attribute', () => {
    expect(CSS).toMatch(/\.data-table-stack tbody td\[data-label\]::before\s*\{\s*content:\s*attr\(data-label\)/);
  });

  it('turns rows into cards with a themed surface', () => {
    expect(CSS).toMatch(/\.data-table-stack tbody tr\s*\{[^}]*background:\s*var\(--surface\)/);
    expect(CSS).toMatch(/\.data-table-stack tbody tr\s*\{[^}]*border:\s*1px solid var\(--border-subtle\)/);
  });

  it('left-aligns numeric cells once the column header is gone', () => {
    expect(CSS).toMatch(/\.data-table-stack tbody td\.cell-num[\s\S]{0,80}text-align:\s*left/);
  });
});

/**
 * A grid is non-responsive only if it pins a column count with no breakpoint
 * modifier anywhere in the same class string.
 *
 * `grid-cols-2 md:grid-cols-4` is responsive — it just starts at two columns,
 * which is a reasonable base for short label/value pairs. `grid grid-cols-2`
 * on its own is not.
 */
function findFixedGrids() {
  const offenders = [];

  for (const dir of ['app', 'components']) {
    for (const file of jsFilesUnder(resolve(process.cwd(), dir))) {
      const relative = file.replace(`${process.cwd()}/`, '');
      const source = readFileSync(file, 'utf8');

      for (const match of source.matchAll(/className=\{?["'`]([^"'`]*\bgrid\b[^"'`]*)["'`]/g)) {
        const classes = match[1];
        const pinsColumns = /(?:^|\s)grid-cols-[2-9]/.test(classes);
        const hasBreakpoint = /(?:sm|md|lg|xl|2xl):grid-cols-/.test(classes);
        if (pinsColumns && !hasBreakpoint) {
          offenders.push({ file: relative, classes: classes.trim() });
        }
      }
    }
  }

  return offenders;
}

describe('no unresponsive grids remain', () => {
  // The single grid in the codebase with a pinned column count and no
  // breakpoints at all. Scheduled for the final punch list.
  const KNOWN_EXCEPTIONS = ['app/barcode/codes/[id]/page.js'];

  it('no grid pins a column count without any breakpoint', () => {
    const unexpected = findFixedGrids()
      .filter((entry) => !KNOWN_EXCEPTIONS.includes(entry.file))
      .map((entry) => `${entry.file}: ${entry.classes}`);

    expect(unexpected).toEqual([]);
  });

  it('keeps the exception list honest', () => {
    // Fails once an exception is fixed, prompting its removal from the list.
    const offending = new Set(findFixedGrids().map((entry) => entry.file));
    for (const file of KNOWN_EXCEPTIONS) {
      expect(offending.has(file), `${file} is fixed — remove it from KNOWN_EXCEPTIONS`).toBe(true);
    }
  });
});
