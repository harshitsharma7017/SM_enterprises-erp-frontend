// Ad-hoc inspector for the compiled Tailwind output. Not part of the test
// suite; run `npm run build` then `node test/verify-css.mjs`.
import { readdirSync, readFileSync } from 'node:fs';

// The build emits more than one CSS chunk (ours plus bootstrap-icons), so
// concatenate all of them rather than guessing which is which.
const dir = '.next/static/chunks';
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
const css = files.map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');

console.log(`files: ${files.join(', ')}  bytes: ${css.length}\n`);

/** Every top-level rule whose selector contains `needle`. */
function rulesContaining(needle) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].includes(needle)) out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

console.log('--- semantic utilities ---');
for (const u of [
  'bg-canvas',
  'bg-surface',
  'bg-surface-raised',
  'bg-surface-hover',
  'border-line',
  'border-line-strong',
  'text-fg',
  'text-fg-muted',
  'text-fg-subtle',
  'text-link',
  'bg-accent',
  'text-accent-fg',
]) {
  const needle = `.${u}{`;
  const at = css.indexOf(needle);
  console.log(
    at === -1
      ? `  MISS .${u}`
      : `  OK   .${u} -> ${css.slice(at + needle.length, css.indexOf('}', at))}`
  );
}

console.log('\n--- dark: variant (should be selector-based, not a media query) ---');
const darkUtilities = rulesContaining('dark\\:');
if (darkUtilities.length === 0) {
  console.log('  none found — add a dark: utility somewhere to exercise it');
}
for (const r of darkUtilities.slice(0, 6)) {
  console.log(`  ${r.selector} { ${r.body} }`);
}
console.log(
  `  prefers-color-scheme in output: ${
    css.includes('prefers-color-scheme') ? 'PRESENT (unexpected)' : 'absent (correct)'
  }`
);

console.log('\n--- tint classes ---');
const tints = [...css.matchAll(/\.tint-([a-z]+)\{/g)].map((m) => m[1]);
console.log(`  ${tints.length}: ${tints.join(', ')}`);

console.log('\n--- form control rules (all of them, in source order) ---');
for (const r of rulesContaining('form-input')) {
  console.log(`  ${r.selector}`);
  for (const decl of r.body.split(';').filter(Boolean)) {
    console.log(`      ${decl.trim()}`);
  }
}

console.log('\n--- token block sanity ---');
const darkRule = rulesContaining('.dark').find((r) => r.selector === '.dark');
if (darkRule) {
  const props = [...darkRule.body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  const grays = props.filter((p) => /^--color-gray-/.test(p));
  console.log(`  .dark declares ${props.length} custom properties`);
  console.log(`  gray ramp steps overridden: ${grays.length}`);
  console.log(`  --color-white overridden: ${props.includes('--color-white') ? 'YES (bug)' : 'no (correct)'}`);
}
for (const t of ['--text-xs', '--text-sm', '--control-h', '--density-root-fs']) {
  const values = [...css.matchAll(new RegExp(`${t}\\s*:\\s*([^;}]+)`, 'g'))].map((m) => m[1].trim());
  console.log(`  ${t}: ${[...new Set(values)].join(' | ')}`);
}
