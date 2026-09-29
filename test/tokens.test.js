import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest serves test files through Vite, so `import.meta.url` is not a file URL
// here. Vitest sets cwd to the project root.
const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

/**
 * Extracts the declarations of a top-level rule by brace matching, so nested
 * blocks and comments inside the rule do not truncate the match.
 */
function ruleBody(selector) {
  const start = CSS.indexOf(selector);
  if (start === -1) return null;

  const open = CSS.indexOf('{', start);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    else if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  return null;
}

function customPropsIn(body) {
  const names = new Set();
  const re = /(--[a-z0-9-]+)\s*:/gi;
  let match;
  while ((match = re.exec(body))) names.add(match[1]);
  return names;
}

const lightBody = ruleBody(':root,\n.force-light');
const darkBody = ruleBody('.dark {');

describe('token layer', () => {
  it('overrides the dark variant so a class can drive it', () => {
    // Without this, Tailwind v4 resolves `dark:` against prefers-color-scheme,
    // which cannot be toggled by the user.
    expect(CSS).toMatch(/@custom-variant\s+dark\s+\(&:where\(\.dark,\s*\.dark\s*\*\)\);/);
  });

  it('declares a light block shared with the force-light carve-out', () => {
    expect(lightBody).toBeTruthy();
    expect(CSS).toContain(':root,\n.force-light {');
  });

  it('declares light and dark blocks in an order that lets dark win', () => {
    expect(CSS.indexOf(':root,\n.force-light {')).toBeLessThan(CSS.indexOf('.dark {'));
  });

  it('gives every semantic token a dark counterpart', () => {
    const light = customPropsIn(lightBody);
    const dark = customPropsIn(darkBody);

    // Palette redefinitions (`--color-*`) only exist in the dark block by
    // design — they override Tailwind's own defaults rather than our tokens.
    const semantic = [...light].filter((name) => !name.startsWith('--color-'));
    const missing = semantic.filter((name) => !dark.has(name));

    expect(missing).toEqual([]);
  });

  it('does not redefine --color-white, which text-white depends on', () => {
    // 129 `text-white` uses sit on saturated buttons; inverting white would
    // turn that text dark and unreadable.
    expect(darkBody).not.toMatch(/--color-white\s*:/);
  });

  it('inverts the full gray ramp', () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(darkBody).toMatch(new RegExp(`--color-gray-${step}\\s*:`));
    }
  });

  it('no longer needs a bg-white compatibility bridge', () => {
    // The bridge rewrote `bg-white` to the surface token inside `.dark` while
    // pages were still being migrated. The sweep removed every `bg-white`, so
    // the bridge is gone; test/sweep.test.js keeps the utility from returning.
    expect(CSS).not.toMatch(/\.dark\s+\.bg-white\s*\{/);
    expect(CSS).not.toMatch(/\.dark\s+\.border-white\s*\{/);
    expect(CSS).not.toMatch(/\.dark\s+\.divide-white\s*>/);
  });

  it('defines both density steps plus a root font-size hook', () => {
    expect(CSS).toContain('[data-density="compact"]');
    expect(CSS).toContain('[data-density="comfortable"]');
    expect(CSS).toMatch(/html\s*\{\s*font-size:\s*var\(--density-root-fs/);

    const compact = customPropsIn(ruleBody('[data-density="compact"]'));
    for (const token of [
      '--control-h',
      '--control-pad-y',
      '--control-pad-x',
      '--control-fs',
      '--cell-pad-y',
      '--cell-pad-x',
      '--density-root-fs',
    ]) {
      expect(compact.has(token)).toBe(true);
    }
  });

  it('bumps the two smallest type steps', () => {
    // text-xs 12px -> 13px and text-sm 14px -> 15px, which lifts 2,223
    // existing occurrences without touching a single file.
    expect(CSS).toMatch(/--text-xs:\s*0\.8125rem/);
    expect(CSS).toMatch(/--text-sm:\s*0\.9375rem/);
    expect(CSS).toMatch(/--text-xs--line-height:/);
    expect(CSS).toMatch(/--text-sm--line-height:/);
  });

  it('defines a tint class for every tint family in both themes', () => {
    const families = ['gray', 'blue', 'cyan', 'green', 'red', 'amber', 'indigo', 'purple', 'yellow'];
    for (const family of families) {
      for (const part of ['bg', 'fg', 'border']) {
        expect(lightBody).toMatch(new RegExp(`--tint-${family}-${part}\\s*:`));
        expect(darkBody).toMatch(new RegExp(`--tint-${family}-${part}\\s*:`));
      }
      expect(CSS).toMatch(new RegExp(`\\.tint-${family}\\s*\\{`));
    }
  });

  it('exposes semantic tokens as Tailwind utilities', () => {
    const theme = ruleBody('@theme inline');
    for (const token of [
      '--color-surface',
      '--color-surface-raised',
      '--color-surface-hover',
      '--color-canvas',
      '--color-line',
      '--color-line-strong',
      '--color-fg',
      '--color-fg-muted',
      '--color-fg-subtle',
      '--color-link',
      '--color-accent',
    ]) {
      expect(theme).toContain(token);
    }
  });

  it('keeps the legacy var aliases that components still reference', () => {
    // e.g. `border-[var(--card-border)]` in Card.js and
    // `style={{ background: 'var(--background)' }}` in DashboardLayout.js
    for (const alias of ['--background', '--foreground', '--card-border', '--header-border', '--primary']) {
      expect(lightBody).toMatch(new RegExp(`${alias}\\s*:`));
    }
  });

  it('drives form control colours from tokens rather than hardcoded utilities', () => {
    const controls = CSS.slice(CSS.indexOf('.form-input, .form-select, .form-textarea'));
    expect(controls).toMatch(/background-color:\s*var\(--surface\)/);
    expect(controls).toMatch(/border:\s*1px solid var\(--border-strong\)/);
    expect(controls).toMatch(/color:\s*var\(--text-primary\)/);
    expect(controls).not.toMatch(/bg-white/);
    expect(controls).not.toMatch(/border-gray-300/);
  });
});
