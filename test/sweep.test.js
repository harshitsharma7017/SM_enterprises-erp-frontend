import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Repo-wide guard for the design-system sweep.
 *
 * Every page and feature component is expected to be on the token layer and the
 * shared primitives. Two places are exempt, both deliberately:
 *
 *   app/globals.css   the single source of raw colour values
 *   app/dev/ui/       the kitchen sink, which keeps legacy markup on purpose so
 *                     the old and new patterns can be compared side by side
 */

const EXEMPT = ['app/globals.css', 'app/dev/'];

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
  })(resolve(process.cwd(), dir));
  return out;
}

const FILES = ['app', 'components']
  .flatMap(jsFilesUnder)
  .map((file) => ({ path: file.replace(`${process.cwd()}/`, ''), source: readFileSync(file, 'utf8') }))
  .filter(({ path }) => !EXEMPT.some((prefix) => path.startsWith(prefix)));

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

// Utilities that only work in light mode.
const BANNED_UTILITIES = [
  'bg-white',
  'bg-gray-50',
  'bg-gray-100',
  'bg-gray-600',
  'bg-gray-700',
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
  'hover:bg-gray-100',
  'text-blue-600',
  'text-blue-700',
  'bg-blue-600',
  'hover:bg-blue-700',
  'focus:ring-blue-500',
  'focus:border-blue-500',
];

describe('sweep: the token layer is used everywhere', () => {
  it('covers the whole app', () => {
    // Guards against the file discovery silently matching nothing.
    expect(FILES.length).toBeGreaterThan(200);
  });

  it.each(BANNED_UTILITIES)('no file uses %s', (utility) => {
    const offenders = FILES.filter(({ source }) => {
      // `print:bg-white` is correct and deliberate: printed output goes on white
      // paper whatever the on-screen theme is.
      const scrubbed = source.replace(/print:bg-white/g, '');
      return scrubbed.includes(utility);
    }).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('leaves no raw hex or rgb colour in a component', () => {
    // A barcode has to be pure black on pure white to be scannable, so its SVG
    // is exempt — theming it would break the thing it exists to do.
    const EXEMPT_FILES = ['components/barcode/code128.js'];

    const offenders = [];
    for (const { path, source } of FILES) {
      if (EXEMPT_FILES.includes(path)) continue;
      // Colours inside a data-URI are part of an encoded image, not styling.
      const scrubbed = source.replace(/data:image\/svg\+xml[^"'`)]*/g, '');
      const hex = scrubbed.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      if (hex.length) offenders.push(`${path}: ${hex.slice(0, 3).join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('sweep: form controls', () => {
  it('every text-like control uses a primitive', () => {
    const offenders = [];

    for (const { path, source } of FILES) {
      for (const [tag, primitive] of [
        ['input', 'form-input'],
        ['select', 'form-select'],
        ['textarea', 'form-textarea'],
      ]) {
        for (const openTag of findOpenTags(source, tag)) {
          if (tag === 'input' && NON_TEXT_INPUT.test(openTag)) continue;
          if (!/className=/.test(openTag)) continue;
          if (openTag.includes(primitive)) continue;
          offenders.push(`${path}: <${tag}>`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('never applies the input primitive to a select or textarea', () => {
    // The shared `INPUT` class constants were applied to all three element
    // types, which is why selects never got their appearance reset.
    const offenders = [];
    for (const { path, source } of FILES) {
      for (const tag of ['select', 'textarea']) {
        for (const openTag of findOpenTags(source, tag)) {
          if (/\bform-input\b/.test(openTag)) offenders.push(`${path}: <${tag}> has form-input`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no control re-declares the sizing its primitive owns', () => {
    // A leftover `py-1.5` or `text-sm` outranks the primitive and undoes both
    // the height parity and the density tokens.
    const REDECLARED = /\b(px-\d|py-\d|text-sm|text-xs|sm:text-sm|rounded-md|shadow-sm|w-full|border-line-strong)\b/;
    const offenders = [];

    for (const { path, source } of FILES) {
      for (const tag of ['input', 'select', 'textarea']) {
        for (const openTag of findOpenTags(source, tag)) {
          if (tag === 'input' && NON_TEXT_INPUT.test(openTag)) continue;
          if (!/\bform-(input|select|textarea)\b/.test(openTag)) continue;

          const className = openTag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
          if (!className) continue;
          const value = className[1] ?? className[2];
          const statik = value.replace(/\$\{[^}]*\}/g, ' ');
          const hit = statik.match(REDECLARED);
          if (hit) offenders.push(`${path}: <${tag}> re-declares ${hit[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('has no shared class constants left', () => {
    const offenders = FILES.filter(({ source }) =>
      /(export\s+)?const\s+(INPUT|SELECT|TEXTAREA)\s*=\s*['"`]/.test(source)
    ).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe('sweep: tables', () => {
  it('every table uses the primitive', () => {
    const offenders = [];
    for (const { path, source } of FILES) {
      if (source.includes('min-w-full divide-y')) offenders.push(`${path}: legacy table classes`);
      for (const openTag of findOpenTags(source, 'table')) {
        if (/className=/.test(openTag) && !openTag.includes('data-table')) {
          offenders.push(`${path}: <table> without .data-table`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no cell re-declares the padding density controls', () => {
    // Only horizontal padding and the small vertical steps compete with
    // `--cell-pad-*`. A large `py-8`/`py-12` on a full-width empty or loading row
    // is deliberate breathing room, not cell density, so it is allowed.
    const DENSITY_PADDING = /\bpx-\d|\bpy-[0-6]\b/;
    const offenders = [];

    for (const { path, source } of FILES) {
      for (const tag of ['th', 'td']) {
        for (const openTag of findOpenTags(source, tag)) {
          if (DENSITY_PADDING.test(openTag)) {
            offenders.push(`${path}: <${tag}> has padding utility`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('sweep: the print view stays light', () => {
  const LABEL_PAGE = 'app/barcode/codes/[id]/label/page.js';

  it('pins the sticker sheet with force-light', () => {
    // A label is printed on white stock, so it must stay dark-on-white even
    // while the app is in dark mode.
    const source = readFileSync(resolve(process.cwd(), LABEL_PAGE), 'utf8');
    expect(source).toMatch(/className="label-sheet force-light/);
  });

  it('defines the carve-out without duplicating the light palette', () => {
    const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain(':root,\n.force-light {');
  });
});

describe('sweep: coverage', () => {
  it('reports what the sweep produced', () => {
    const totals = { primitives: 0, dataTables: 0, filterBars: 0, alerts: 0, btnNeutral: 0, links: 0 };

    for (const { source } of FILES) {
      totals.primitives += (source.match(/\bform-(input|select|textarea)\b/g) || []).length;
      totals.dataTables += (source.match(/className="data-table/g) || []).length;
      totals.filterBars += (source.match(/className="filter-bar[" ]/g) || []).length;
      totals.alerts += (source.match(/alert alert-/g) || []).length;
      totals.btnNeutral += (source.match(/btn-neutral/g) || []).length;
      totals.links += (source.match(/\btext-link\b/g) || []).length;
    }

    // Floors just below the measured totals, so a regression that quietly
    // reverts the sweep fails here rather than going unnoticed.
    expect(totals.primitives).toBeGreaterThanOrEqual(550);
    expect(totals.dataTables).toBeGreaterThanOrEqual(110);
    expect(totals.filterBars).toBeGreaterThanOrEqual(30);
    expect(totals.alerts).toBeGreaterThanOrEqual(80);
    expect(totals.links).toBeGreaterThanOrEqual(150);
  });
});
