#!/usr/bin/env node
/**
 * Migrates pages and feature components onto the design-system primitives.
 *
 *   node scripts/codemod-design-system.mjs --dry app/masters components/masters
 *   node scripts/codemod-design-system.mjs app/masters components/masters
 *
 * Only mechanical, reviewable transforms live here. Anything needing judgement
 * — which column identifies a row, how a form should be laid out, whether a
 * table suits the stacked fallback — is left for a human.
 *
 * Never touches the design system itself, the app shell, or printable documents.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const EXCLUDED = [
  // The design system itself, migrated by hand.
  'components/ui/',
  'components/layout/',
  'components/providers/',
  // The kitchen sink deliberately keeps legacy markup for side-by-side comparison.
  'app/dev/',
];

// `components/export-documents/` is NOT excluded. It was originally assumed to
// render printable output, but those components are editors — the PDFs are
// produced server-side and downloaded through `apiClient.download`, so there is
// no client-rendered document to keep white. The one genuine print view,
// `app/barcode/codes/[id]/label/page.js`, pins its sticker sheet with
// `.force-light` instead.

/* -------------------------------------------------------------------------- */
/* Colour and token swaps                                                     */
/* -------------------------------------------------------------------------- */

// Order matters: longer, more specific patterns first.
const COLOUR_SWAPS = [
  // Surfaces. `print:bg-white` is left alone — printed output goes on white
  // paper whatever the on-screen theme is.
  [/(?<!print:)\bbg-white\b/g, 'bg-surface'],
  [/\bhover:bg-gray-50\b/g, 'hover:bg-surface-hover'],
  [/\bhover:bg-gray-100\b/g, 'hover:bg-surface-hover'],
  [/\bbg-gray-50\b/g, 'bg-surface-raised'],
  [/\bbg-gray-100\b/g, 'bg-surface-raised'],

  // Borders and dividers
  [/\bdivide-gray-200\b/g, 'divide-line'],
  [/\bborder-gray-100\b/g, 'border-line'],
  [/\bborder-gray-200\b/g, 'border-line'],
  [/\bborder-gray-300\b/g, 'border-line-strong'],
  [/\bborder-gray-400\b/g, 'border-line-strong'],

  // Text, in descending emphasis
  [/\bhover:text-gray-900\b/g, 'hover:text-fg'],
  [/\btext-gray-900\b/g, 'text-fg'],
  [/\btext-gray-800\b/g, 'text-fg'],
  [/\bhover:text-gray-600\b/g, 'hover:text-fg-muted'],
  [/\btext-gray-700\b/g, 'text-fg-muted'],
  [/\btext-gray-600\b/g, 'text-fg-muted'],
  [/\btext-gray-500\b/g, 'text-fg-subtle'],
  [/\btext-gray-400\b/g, 'text-fg-subtle'],

  // Links and the accent. This is what closes the dark-mode contrast gap:
  // blue-600 had to stay saturated for buttons, so link text moves to its own
  // token instead.
  [/\bhover:text-blue-800\b/g, 'hover:text-link-hover'],
  [/\bhover:text-blue-700\b/g, 'hover:text-link-hover'],
  [/\bhover:text-blue-600\b/g, 'hover:text-link'],
  [/\btext-blue-700\b/g, 'text-link'],
  [/\btext-blue-600\b/g, 'text-link'],
  [/\bhover:bg-blue-700\b/g, 'hover:bg-accent-hover'],
  [/\bbg-blue-600\b/g, 'bg-accent'],
  [/\bhover:bg-blue-50\b/g, 'hover:bg-surface-hover'],
  [/\bborder-blue-300\b/g, 'border-line-strong'],

  // Danger
  [/\btext-red-600\b/g, 'text-[var(--danger)]'],
  [/\btext-red-500\b/g, 'text-[var(--danger)]'],
  [/\bhover:text-red-700\b/g, 'hover:text-[var(--danger)]'],
  [/\bborder-red-300\b/g, 'border-line-strong'],

  // Disabled text. `text-gray-300` inverts to a near-invisible dark grey, so it
  // moves to the token that already means "disabled control text".
  [/\btext-gray-300\b/g, 'text-[var(--control-fg-disabled)]'],

  // Focus rings on buttons and links. Controls style their own focus, so what
  // is left here belongs to other interactive elements.
  [/\bfocus:ring-blue-500\b/g, 'focus:ring-[var(--focus-ring)]'],
  [/\bfocus:border-blue-500\b/g, 'focus:border-[var(--focus-ring)]'],
  [/\bfocus-visible:outline-blue-600\b/g, 'focus-visible:outline-[var(--focus-ring)]'],
];

/**
 * Idioms replaced wholesale rather than token by token.
 *
 * Applied before the colour swaps, so they match the original class strings.
 */
const IDIOM_SWAPS = [
  // Inline error banners -> the alert component. `.alert` already supplies the
  // bottom margin, so a trailing `mb-4` is dropped.
  [
    /className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm"/g,
    'className="alert alert-danger"',
  ],
  [/className="bg-red-50 text-red-600 p-3 rounded mb-4"/g, 'className="alert alert-danger"'],
  [/className="bg-red-50 text-red-600 p-3 rounded"/g, 'className="alert alert-danger"'],
  [/className="bg-red-50 text-red-600 p-2 rounded"/g, 'className="alert alert-danger"'],
  [
    /className="bg-green-50 text-green-700 p-3 rounded mb-4"/g,
    'className="alert alert-success"',
  ],

  // Solid grey buttons -> the neutral button component.
  [/\bbg-gray-600 hover:bg-gray-700 text-white\b/g, 'btn-neutral'],
  [/\bbg-gray-700 hover:bg-gray-800 text-white\b/g, 'btn-neutral'],
];

/* -------------------------------------------------------------------------- */
/* Form controls                                                              */
/* -------------------------------------------------------------------------- */

// Classes the primitive now owns. Stripping them is what lets the primitive
// actually govern — utilities sit in a later layer and would otherwise win.
const CONTROL_DECORATION = [
  /^w-full$/,
  /^block$/,
  /^inline-block$/,
  /^px-\d+(\.\d+)?$/,
  /^py-\d+(\.\d+)?$/,
  /^p-\d+(\.\d+)?$/,
  /^text-(xs|sm|base)$/,
  /^sm:text-(xs|sm|base)$/,
  /^border$/,
  /^border-line$/,
  /^border-line-strong$/,
  /^rounded$/,
  /^rounded-md$/,
  /^shadow-sm$/,
  /^focus:outline-none$/,
  /^focus:ring-\d+$/,
  /^focus:ring-blue-\d+$/,
  /^focus:border-blue-\d+$/,
  /^focus:ring-offset-\d+$/,
  /^bg-surface$/,
  /^bg-surface-raised$/,
  /^text-fg$/,
  /^text-fg-muted$/,
  /^text-fg-subtle$/,
  /^appearance-none$/,
  // Not listed, deliberately: `min-h-[...]` is real layout on a
  // `<select multiple>`, and `max-w-*` / `flex-1` / `font-mono` are the caller's
  // intent rather than decoration the primitive replaces.
];

// Types that are not text-like and must keep their native rendering.
const NON_TEXT_INPUT = /type=\{?["']?(checkbox|radio|file|hidden|range|color|submit|button|image|reset)["']?\}?/;

function splitClasses(value) {
  return value.split(/\s+/).filter(Boolean);
}

/** Rewrites one control's class list onto the primitive. */
function rewriteControlClasses(value, primitive) {
  const kept = splitClasses(value).filter(
    (cls) => !CONTROL_DECORATION.some((re) => re.test(cls))
  );
  // Drop a primitive that is already present, so it is not duplicated.
  const withoutPrimitive = kept.filter((cls) => cls !== primitive);
  return [primitive, ...withoutPrimitive].join(' ');
}

/**
 * Finds the full opening tag for each occurrence of an element.
 *
 * A regex cannot do this: JSX attributes routinely contain `>` inside an
 * expression — `onChange={(e) => ...}` being the common one — so matching up to
 * the first `>` truncates the tag and hides any attribute that follows. This
 * walks the source tracking brace depth and quote state instead.
 */
function findOpenTags(source, tagName) {
  const ranges = [];
  const needle = `<${tagName}`;
  let from = 0;

  while (true) {
    const start = source.indexOf(needle, from);
    if (start === -1) break;

    // Must be followed by whitespace, `>` or `/`, so `<input` does not match
    // `<inputGroup`.
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

      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
      } else if (ch === '>' && depth === 0) {
        end = i + 1;
        break;
      }
    }

    if (end === -1) break;
    ranges.push([start, end]);
    from = end;
  }

  return ranges;
}

// Shared class-name constants these modules use, e.g. `className={INPUT}`.
//
// These cannot be fixed by redefining the constant, because the same `INPUT` is
// applied to inputs, selects AND textareas — 22 selects and 10 textareas in the
// masters module alone. Pointing it at `form-input` would cost those selects the
// `appearance: none` chevron fix and those textareas their taller height. So the
// reference is replaced per element instead.
const CLASS_CONSTANTS = /^(INPUT|SELECT|TEXTAREA|FIELD|CONTROL)$/;

/**
 * Applies a transform to the className of every matching JSX element.
 *
 * Handles a plain string literal, and a bare reference to one of the shared
 * class constants. A template literal or any other expression means conditional
 * classes, which is exactly the case that needs a human — those are counted and
 * reported rather than rewritten.
 */
function transformElementClasses(source, tagName, transform, guard, report, addWhenMissing) {
  const ranges = findOpenTags(source, tagName);
  if (ranges.length === 0) return source;

  let out = '';
  let cursor = 0;

  for (const [start, end] of ranges) {
    const tag = source.slice(start, end);
    out += source.slice(cursor, start);

    if (guard && !guard(tag)) {
      out += tag;
      cursor = end;
      continue;
    }

    const stringClass = tag.match(/className="([^"]*)"/);
    const constantClass = tag.match(/className=\{([A-Za-z_][A-Za-z0-9_]*)\}/);
    // e.g. className={`${INPUT} font-mono ${cond ? 'a' : 'b'}`}
    const interpolatedConstant = tag.match(
      /className=\{`[^`]*\$\{(INPUT|SELECT|TEXTAREA|FIELD|CONTROL)\}/
    );

    if (stringClass) {
      out += tag.replace(/className="([^"]*)"/, (classAttr, value) => {
        const next = transform(value);
        return next === value ? classAttr : `className="${next}"`;
      });
    } else if (constantClass && CLASS_CONSTANTS.test(constantClass[1])) {
      // Replace the indirection with the primitive for this element type.
      out += tag.replace(/className=\{[A-Za-z_][A-Za-z0-9_]*\}/, `className="${transform('')}"`);
      if (report) report.constants.push(constantClass[1]);
    } else if (/className=\{`[^`]*`\}/.test(tag)) {
      // A template literal. Handled in one place so the outcome is the same
      // whether the decoration arrived through a class constant or inline —
      // otherwise a second run of the codemod would keep changing the file.
      //
      // Only the static text between interpolations is rewritten, so
      // conditional expressions keep working untouched.
      const primitive = transform('');

      out += tag.replace(/className=\{`([^`]*)`\}/, (attr, template) => {
        const rewritten = template
          .split(/(\$\{[^}]*\})/)
          .map((segment) => {
            // Swap a class-constant interpolation for the primitive.
            if (segment.startsWith('${')) {
              const name = segment.slice(2, -1).trim();
              return CLASS_CONSTANTS.test(name) ? primitive : segment;
            }
            return splitClasses(segment)
              .filter((cls) => !CONTROL_DECORATION.some((re) => re.test(cls)))
              .join(' ');
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        const withPrimitive = splitClasses(rewritten).includes(primitive)
          ? rewritten
          : `${primitive} ${rewritten}`.trim();

        return withPrimitive === template ? attr : `className={\`${withPrimitive}\`}`;
      });

      if (report) report.constants.push('template');
    } else if (addWhenMissing && !/className=/.test(tag)) {
      // A control with no className at all was rendering with browser defaults,
      // so give it the primitive. Inserted just before the tag's closing
      // bracket, preserving a self-closing slash.
      const primitive = transform('');
      out += tag.replace(/(\s*)(\/?)>$/, (_m, space, slash) =>
        `${space || ' '}className="${primitive}"${slash ? ' /' : ''}>`
      );
      if (report) report.added.push(tagName);
    } else {
      out += tag;
      if (report && /className=/.test(tag)) report.manual.push(`${tagName}`);
      else if (report) report.noClass.push(`${tagName}`);
    }

    cursor = end;
  }

  out += source.slice(cursor);
  return out;
}

/**
 * Removes a class constant that is no longer referenced, and prunes it from any
 * import it came in through.
 */
function pruneUnusedClassConstants(source) {
  let out = source;

  for (const name of ['INPUT', 'SELECT', 'TEXTAREA']) {
    // An exported constant cannot be judged from one file — another module may
    // still import it. Removing it here is how the build broke the first time.
    if (new RegExp(`export\\s+const\\s+${name}\\s*=`).test(out)) continue;

    // Count references outside its own definition or import.
    const references = (out.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    const definitions = (out.match(new RegExp(`const\\s+${name}\\s*=`, 'g')) || []).length;
    const imports = (out.match(new RegExp(`import[^;]*\\b${name}\\b[^;]*;`, 'g')) || []).length;

    if (references > definitions + imports) continue;

    // Drop a whole-line definition.
    out = out.replace(new RegExp(`^\\s*const\\s+${name}\\s*=[^\\n]*\\n`, 'gm'), '');

    // Drop it from a named import, removing the import entirely if it was alone.
    out = out.replace(/import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"]);?\n/g, (match, specifiers, from) => {
      const kept = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== name);
      if (kept.length === specifiers.split(',').map((s) => s.trim()).filter(Boolean).length) {
        return match;
      }
      return kept.length === 0 ? '' : `import { ${kept.join(', ')} } from ${from};\n`;
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

const TABLE_CELL_DECORATION = [
  /^px-\d+(\.\d+)?$/,
  /^py-\d+(\.\d+)?$/,
  /^font-medium$/,
  /^text-fg-subtle$/, // body cells already default to secondary
  /^text-left$/,
  /^text-(xs|sm)$/, // the table sets its own size
];

// Classes `.data-table` now owns. Matched token by token rather than as a fixed
// string, because the same classes appear in several orders and combinations
// across the codebase.
const TABLE_DECORATION = [
  /^min-w-full$/,
  /^w-full$/,
  /^divide-y$/,
  /^divide-line$/,
  /^divide-gray-\d+$/,
  /^text-(xs|sm)$/,
  /^text-left$/,
  /^bg-surface$/,
  /^bg-surface-raised$/,
  /^text-fg-muted$/,
  /^text-fg-subtle$/,
  /^hover:bg-surface-hover$/,
  /^hover:bg-gray-50$/,
];

const WRAPPER_DECORATION = [
  /^overflow-x-auto$/,
  /^border$/,
  /^border-line$/,
  /^rounded-md$/,
  /^rounded-lg$/,
];

function rewriteTableWrapper(source) {
  let out = source;

  // Scroll container -> .table-wrap, keeping any spacing the caller added.
  out = out.replace(/className="([^"]*overflow-x-auto[^"]*)"/g, (match, value) => {
    const classes = splitClasses(value);
    if (!classes.includes('overflow-x-auto')) return match;
    // A padded scroller is doing something else; leave it alone.
    if (classes.some((c) => /^p-\d/.test(c))) return match;

    const kept = classes.filter((cls) => !WRAPPER_DECORATION.some((re) => re.test(cls)));
    return `className="${['table-wrap', ...kept].join(' ')}"`;
  });

  // <table> -> .data-table
  out = transformElementClasses(out, 'table', (value) => {
    const kept = splitClasses(value)
      .filter((cls) => !TABLE_DECORATION.some((re) => re.test(cls)))
      .filter((cls) => cls !== 'data-table');
    return ['data-table', ...kept].join(' ');
  });

  // The primitive styles thead, tbody and row hover itself. `<tr>` needs the
  // element transform rather than a string match because a row in a list
  // usually carries a `key` before its className.
  for (const tag of ['thead', 'tbody', 'tr']) {
    out = transformElementClasses(out, tag, (value) =>
      splitClasses(value)
        .filter((cls) => !TABLE_DECORATION.some((re) => re.test(cls)))
        .join(' ')
    );
  }

  return out;
}

function rewriteCells(source) {
  let out = source;

  for (const tag of ['th', 'td']) {
    out = transformElementClasses(out, tag, (value) => {
      let classes = splitClasses(value);

      // Body cells default to secondary under `.data-table`, so an explicit
      // primary colour on a cell means "this column identifies the row". Both
      // idioms in use — `font-semibold text-fg` and a bare `text-fg` — become
      // the emphasis class, which also gives the colour-only variant weight.
      if (tag === 'td' && classes.includes('text-fg')) {
        classes = classes.filter((c) => c !== 'font-semibold' && c !== 'text-fg');
        classes.push('cell-strong');
      }

      classes = classes.filter((cls) => !TABLE_CELL_DECORATION.some((re) => re.test(cls)));
      // Guard against a duplicate if the codemod runs twice.
      return [...new Set(classes)].join(' ');
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Filter bars                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Converts filter bars to the grid pattern.
 *
 * Scoped to `<form>` elements on purpose. The same
 * `flex flex-wrap items-end gap-3` idiom is also used for repeating item rows in
 * the editors — ProductForm's variant row, AgentForm's commission row — and
 * converting those to a filter grid changes a layout that was correct.
 */
function rewriteFilterBar(source) {
  let out = transformElementClasses(source, 'form', (value) => {
    const classes = splitClasses(value);
    const isFilterBar =
      classes.includes('flex') &&
      classes.includes('flex-wrap') &&
      classes.includes('items-end');
    if (!isFilterBar) return value;

    const kept = classes.filter(
      (cls) => !['flex', 'flex-wrap', 'items-end', 'gap-3', 'gap-2', 'gap-4'].includes(cls)
    );
    return ['filter-bar', ...kept].join(' ');
  });

  // Only meaningful once a filter bar exists in this file.
  if (out.includes('className="filter-bar')) {
    out = out.replace(/className="flex-1 min-w-\[2[0-9]0px\]"/g, 'className="filter-bar-wide"');
  }

  return out;
}

/**
 * Inside a filter bar, strips the fixed widths its cells used to need.
 *
 * The bar is a grid now, so a leftover `w-48` makes a cell narrower than its
 * column instead of filling it. This cannot be fixed in CSS — a width utility
 * sits in a later layer than the component class and wins — so the utility has
 * to go.
 *
 * Scoped to the region between the filter form's opening tag and its matching
 * `</form>`, to avoid touching fixed widths that are deliberate elsewhere.
 */
function stripFilterCellWidths(source) {
  let out = source;
  let searchFrom = 0;

  while (true) {
    const open = out.indexOf('className="filter-bar', searchFrom);
    if (open === -1) break;

    // `.filter-bar` only ever lands on a <form>, so that bounds the region.
    const close = out.indexOf('</form>', open);
    if (close === -1) break;

    const head = out.slice(0, open);
    let region = out.slice(open, close);
    const tail = out.slice(close);

    region = region
      .replace(/className="(w-\d+)"/g, 'className=""')
      .replace(/className="(w-\d+) /g, 'className="')
      .replace(/ (w-\d+)"/g, '"')
      // The action button wrapper becomes the dedicated class.
      .replace(/className="flex gap-2"/g, 'className="filter-bar-actions"')
      .replace(/className="flex items-end gap-2"/g, 'className="filter-bar-actions"');

    out = head + region + tail;
    searchFrom = head.length + region.length;
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Driver                                                                     */
/* -------------------------------------------------------------------------- */

function transform(source) {
  const counts = {};
  const bump = (key, n = 1) => {
    if (n > 0) counts[key] = (counts[key] || 0) + n;
  };

  let out = source;

  // 0. Whole-idiom replacements, before the per-token swaps rewrite the strings
  // they match against.
  for (const [re, replacement] of IDIOM_SWAPS) {
    const hits = (out.match(re) || []).length;
    if (hits) {
      bump(`idiom:${replacement.slice(0, 40)}`, hits);
      out = out.replace(re, replacement);
    }
  }

  // 1. Colour and token swaps.
  for (const [re, replacement] of COLOUR_SWAPS) {
    const hits = (out.match(re) || []).length;
    if (hits) {
      bump(`colour:${replacement}`, hits);
      out = out.replace(re, replacement);
    }
  }

  // 2. Form controls onto the primitives.
  const report = { constants: [], manual: [], noClass: [], added: [] };

  out = transformElementClasses(
    out,
    'input',
    (value) => rewriteControlClasses(value, 'form-input'),
    (tag) => !NON_TEXT_INPUT.test(tag),
    report,
    true
  );
  out = transformElementClasses(
    out,
    'select',
    (value) => rewriteControlClasses(value, 'form-select'),
    null,
    report,
    true
  );
  out = transformElementClasses(
    out,
    'textarea',
    (value) => rewriteControlClasses(value, 'form-textarea'),
    null,
    report,
    true
  );

  out = pruneUnusedClassConstants(out);

  bump('controls', (out.match(/className="form-(input|select|textarea)/g) || []).length);
  bump('constants-inlined', report.constants.length);
  bump('primitive-added', report.added.length);
  bump('needs-manual-review', report.manual.length);

  // 3. Tables.
  const beforeTable = out;
  out = rewriteTableWrapper(out);
  out = rewriteCells(out);
  if (out !== beforeTable) bump('tables', 1);

  // 4. Filter bars.
  const beforeFilter = out;
  out = rewriteFilterBar(out);
  out = stripFilterCellWidths(out);
  if (out !== beforeFilter) bump('filter-bars', 1);

  // 5. Normalise whitespace inside className strings, scoped to the attribute
  // value so nothing else in the file can be touched.
  out = out.replace(/className="([^"]*)"/g, (match, value) => {
    const tidy = value.trim().replace(/\s+/g, ' ');
    return `className="${tidy}"`;
  });

  // Drop classNames the swaps emptied, taking the whitespace in front of them so
  // no gap or stray indentation is left behind.
  out = out.replace(/\s*className=""/g, '');

  // A tag whose only attribute was that className is left as `<td >`.
  out = out.replace(/<([a-zA-Z][\w.]*)\s+>/g, '<$1>');

  return { code: out, counts };
}

function jsFiles(dir) {
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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const targets = args.filter((a) => !a.startsWith('--'));

if (targets.length === 0) {
  console.error('Usage: node scripts/codemod-design-system.mjs [--dry] <dir> [dir...]');
  process.exit(1);
}

const files = targets
  .flatMap((t) => jsFiles(join(ROOT, t)))
  .filter((file) => {
    const rel = relative(ROOT, file);
    return !EXCLUDED.some((prefix) => rel.startsWith(prefix));
  });

const totals = {};
let changed = 0;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const { code, counts } = transform(source);

  if (code === source) continue;
  changed += 1;

  for (const [key, n] of Object.entries(counts)) {
    totals[key] = (totals[key] || 0) + n;
  }

  if (!dryRun) writeFileSync(file, code);
}

console.log(`${dryRun ? '[dry run] ' : ''}${changed} of ${files.length} files changed\n`);

const grouped = { colour: 0, controls: 0, tables: 0, 'filter-bars': 0 };
for (const [key, n] of Object.entries(totals)) {
  if (key.startsWith('colour:')) grouped.colour += n;
  else grouped[key] = n;
}

for (const [key, n] of Object.entries(grouped)) {
  console.log(`  ${key.padEnd(14)} ${n}`);
}

console.log('\n  top colour swaps:');
Object.entries(totals)
  .filter(([k]) => k.startsWith('colour:'))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([k, n]) => console.log(`    ${String(n).padStart(4)}  ${k.replace('colour:', '')}`));
