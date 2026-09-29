import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Verifies the masters module against the design system.
 *
 * These are source-level assertions rather than render tests: every masters page
 * mounts DashboardLayout, which calls `useAuth(true)` and talks to the REST
 * backend, so rendering one would test the network layer rather than the
 * styling. The primitives themselves already have behavioural tests.
 */

const MASTERS_DIRS = ['app/masters', 'components/masters'];

function jsFilesUnder(dir) {
  const out = [];
  (function walk(current) {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith('.js')) out.push(path);
    }
  })(resolve(process.cwd(), dir));
  return out;
}

const FILES = MASTERS_DIRS.flatMap(jsFilesUnder).map((file) => ({
  path: file.replace(`${process.cwd()}/`, ''),
  source: readFileSync(file, 'utf8'),
}));

/** Opening tags for an element, brace-aware so `onChange={(e) => …}` is handled. */
function findOpenTags(source, tagName) {
  const ranges = [];
  const needle = `<${tagName}`;
  let from = 0;

  while (true) {
    const start = source.indexOf(needle, from);
    if (start === -1) break;
    const after = source[start + needle.length];
    if (after && !/[\s/>]/.test(after)) {
      from = start + needle.length;
      continue;
    }

    let depth = 0;
    let quote = null;
    let end = -1;
    for (let i = start + needle.length; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === quote && source[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      else if (ch === '>' && depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end === -1) break;
    ranges.push(source.slice(start, end));
    from = end;
  }

  return ranges;
}

const NON_TEXT_INPUT = /type=\{?["']?(checkbox|radio|file|hidden|range|color|submit|button|image|reset)["']?\}?/;

describe('masters: light-mode-only colours are gone', () => {
  const BANNED = [
    'bg-white',
    'bg-gray-50',
    'bg-gray-100',
    'bg-gray-600',
    'text-gray-300',
    'text-gray-400',
    'text-gray-500',
    'text-gray-600',
    'text-gray-700',
    'text-gray-800',
    'text-gray-900',
    'border-gray-200',
    'border-gray-300',
    'border-gray-400',
    'divide-gray-200',
    'hover:bg-gray-50',
    'text-blue-600',
    'bg-blue-600',
  ];

  it.each(BANNED)('no masters file uses %s', (utility) => {
    const offenders = FILES.filter((f) => f.source.includes(utility)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe('masters: form controls use the primitives', () => {
  it('every text-like control carries a primitive class', () => {
    const offenders = [];

    for (const { path, source } of FILES) {
      const checks = [
        ['input', 'form-input'],
        ['select', 'form-select'],
        ['textarea', 'form-textarea'],
      ];

      for (const [tag, primitive] of checks) {
        for (const openTag of findOpenTags(source, tag)) {
          if (tag === 'input' && NON_TEXT_INPUT.test(openTag)) continue;
          if (!/className=/.test(openTag)) continue;
          if (openTag.includes(primitive)) continue;
          offenders.push(`${path}: <${tag}> missing ${primitive}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('a select never gets the input primitive', () => {
    // The shared `INPUT` constant used to be applied to inputs, selects and
    // textareas alike, which cost the selects their appearance reset.
    const offenders = [];
    for (const { path, source } of FILES) {
      for (const openTag of findOpenTags(source, 'select')) {
        if (/\bform-input\b/.test(openTag)) offenders.push(`${path}: <select> has form-input`);
      }
      for (const openTag of findOpenTags(source, 'textarea')) {
        if (/\bform-input\b/.test(openTag)) offenders.push(`${path}: <textarea> has form-input`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no control re-declares sizing the primitive owns', () => {
    // A leftover `py-1.5` or `text-sm` would outrank the primitive and undo
    // both the height parity and the density tokens.
    const REDECLARED = /\b(px-\d|py-\d|text-sm|text-xs|sm:text-sm|border-line-strong|rounded-md|shadow-sm|w-full)\b/;
    const offenders = [];

    for (const { path, source } of FILES) {
      for (const tag of ['input', 'select', 'textarea']) {
        for (const openTag of findOpenTags(source, tag)) {
          if (tag === 'input' && NON_TEXT_INPUT.test(openTag)) continue;
          if (!/\bform-(input|select|textarea)\b/.test(openTag)) continue;

          const className = openTag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
          if (!className) continue;
          const value = className[1] ?? className[2];
          // Only the static text matters; interpolations are conditional.
          const statik = value.replace(/\$\{[^}]*\}/g, ' ');
          const hit = statik.match(REDECLARED);
          if (hit) offenders.push(`${path}: <${tag}> re-declares ${hit[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the shared class constants are gone', () => {
    const offenders = FILES.filter(({ source }) =>
      /(export\s+)?const\s+(INPUT|SELECT|TEXTAREA)\s*=/.test(source)
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe('masters: tables use the primitive', () => {
  it('no hand-rolled table markup remains', () => {
    const offenders = [];
    for (const { path, source } of FILES) {
      if (source.includes('min-w-full divide-y')) offenders.push(`${path}: legacy table classes`);
      if (/<table className="(?!data-table)/.test(source)) offenders.push(`${path}: table without .data-table`);
    }
    expect(offenders).toEqual([]);
  });

  it('every table is wrapped in .table-wrap', () => {
    const offenders = [];
    for (const { path, source } of FILES) {
      const tables = (source.match(/<table/g) || []).length;
      if (tables === 0) continue;
      const wraps = (source.match(/table-wrap/g) || []).length;
      if (wraps < tables) offenders.push(`${path}: ${tables} tables, ${wraps} wrappers`);
    }
    expect(offenders).toEqual([]);
  });

  it('no cell re-declares the padding density controls', () => {
    const offenders = [];
    for (const { path, source } of FILES) {
      for (const tag of ['th', 'td']) {
        for (const openTag of findOpenTags(source, tag)) {
          if (/\bp[xy]-\d/.test(openTag)) offenders.push(`${path}: <${tag}> has padding utility`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('uses the emphasis tier on identifier columns', () => {
    // Every list page must mark its identifying column so a row is scannable.
    // Two shapes are both valid: `cell-strong` on the cell, or an emphasised
    // element inside a cell that stacks a name over a muted subtitle — there,
    // bolding the whole cell would wrongly bold the subtitle too.
    const listPages = FILES.filter(
      (f) => f.path.startsWith('app/masters') && f.source.includes('<table')
    );
    expect(listPages.length).toBeGreaterThan(8);

    const missing = listPages
      .filter(
        (f) =>
          !f.source.includes('cell-strong') && !/font-semibold text-fg\b/.test(f.source)
      )
      .map((f) => f.path);
    expect(missing).toEqual([]);
  });
});

describe('masters: responsive and surface patterns', () => {
  // The same `flex flex-wrap items-end` idiom is also used for repeating rows in
  // the editors (a product variant row, an agent commission row), where the flex
  // layout is correct and a filter grid would be wrong. Only list pages, which
  // is where filter bars live, are checked.
  const LIST_PAGES = FILES.filter(
    (f) => f.path.startsWith('app/masters') && f.source.includes('<table')
  );

  it('list-page filter bars use the grid pattern', () => {
    const offenders = LIST_PAGES.filter(({ source }) =>
      source.includes('flex flex-wrap items-end')
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('every list page has a filter bar', () => {
    const missing = LIST_PAGES.filter(({ source }) => !source.includes('filter-bar')).map(
      (f) => f.path
    );
    expect(missing).toEqual([]);
  });

  it('no fixed-width cells survive inside a filter bar', () => {
    const offenders = [];
    for (const { path, source } of FILES) {
      const start = source.indexOf('className="filter-bar');
      if (start === -1) continue;
      const end = source.indexOf('</form>', start);
      const region = source.slice(start, end === -1 ? undefined : end);
      if (/className="w-\d+"/.test(region)) offenders.push(`${path}: fixed-width filter cell`);
    }
    expect(offenders).toEqual([]);
  });

  it('error banners use the alert component', () => {
    const offenders = FILES.filter(({ source }) => /bg-red-50 text-\[var\(--danger\)\] p-\d/.test(source)).map(
      (f) => f.path
    );
    expect(offenders).toEqual([]);
  });
});

describe('masters: sweep coverage', () => {
  it('reports what the sweep touched', () => {
    const totals = {
      files: FILES.length,
      primitives: 0,
      dataTables: 0,
      filterBars: 0,
      cellStrong: 0,
      alerts: 0,
    };

    for (const { source } of FILES) {
      totals.primitives += (source.match(/\bform-(input|select|textarea)\b/g) || []).length;
      totals.dataTables += (source.match(/className="data-table/g) || []).length;
      totals.filterBars += (source.match(/className="filter-bar[" ]/g) || []).length;
      totals.cellStrong += (source.match(/cell-strong/g) || []).length;
      totals.alerts += (source.match(/alert alert-/g) || []).length;
    }

    // Measured after the sweep: 181 primitives, 17 tables, 11 filter bars,
    // 10 identifier cells, 13 alerts across 55 files. Floors sit just below, so
    // a future change that quietly reverts the sweep fails here.
    expect(totals.files).toBe(55);
    expect(totals.primitives).toBeGreaterThanOrEqual(175);
    expect(totals.dataTables).toBeGreaterThanOrEqual(17);
    expect(totals.filterBars).toBeGreaterThanOrEqual(11);
    expect(totals.cellStrong).toBeGreaterThanOrEqual(10);
    expect(totals.alerts).toBeGreaterThanOrEqual(13);
  });
});
