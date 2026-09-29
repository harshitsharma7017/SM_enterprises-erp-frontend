// Counts sweep targets in a set of directories.
//   node test/scan-module.mjs app/masters components/masters
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS = [
  ['<input', /<input/g],
  ['<select', /<select/g],
  ['<textarea', /<textarea/g],
  ['form-input', /form-input/g],
  ['form-select', /form-select/g],
  ['form-textarea', /form-textarea/g],
  ['<table', /<table/g],
  ['<th', /<th[\s>]/g],
  ['<td', /<td[\s>]/g],
  ['bg-white', /bg-white/g],
  ['text-blue-600', /text-blue-600/g],
  ['bg-blue-600', /bg-blue-600/g],
  ['px-4 py-2 (cells)', /px-4 py-2/g],
  ['py-1.5', /py-1\.5/g],
  ['md:grid-cols', /md:grid-cols/g],
  ['flex flex-wrap items-end', /flex flex-wrap items-end/g],
  ['label block text-xs', /block text-xs/g],
  ['border-gray-300', /border-gray-300/g],
  ['divide-gray-200', /divide-gray-200/g],
  ['hover:bg-gray-50', /hover:bg-gray-50/g],
  ['text-gray-500', /text-gray-500/g],
  ['text-gray-700', /text-gray-700/g],
  ['focus:ring-blue-500', /focus:ring-blue-500/g],
  ['<Card', /<Card/g],
  ['<Field', /<Field/g],
  ['data-table', /data-table/g],
  ['form-grid', /form-grid/g],
  ['filter-bar', /filter-bar/g],
];

function jsFiles(dir) {
  const out = [];
  (function walk(current) {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith('.js')) out.push(path);
    }
  })(dir);
  return out;
}

const dirs = process.argv.slice(2);
const files = dirs.flatMap(jsFiles);
const sources = files.map((f) => readFileSync(f, 'utf8'));

console.log(`${files.length} files, ${sources.reduce((n, s) => n + s.split('\n').length, 0)} lines\n`);

for (const [label, re] of PATTERNS) {
  const total = sources.reduce((n, s) => n + (s.match(re) || []).length, 0);
  const inFiles = sources.filter((s) => re.test(s) || s.match(re)).length;
  console.log(`  ${label.padEnd(26)} ${String(total).padStart(5)}   (${inFiles} files)`);
}
