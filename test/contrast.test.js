import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrast audit over the token layer, in both themes.
 *
 * This checks the token *pairings the design system promises* — body text on a
 * surface, a badge's foreground on its own tint, white on a saturated button.
 * It cannot tell you whether a particular screen honours those pairings, and it
 * says nothing about focus order, screen-reader output or zoom behaviour. Full
 * accessibility validation still needs manual testing with assistive
 * technology and expert review.
 *
 * Thresholds are WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and for
 * non-text UI boundaries such as borders.
 */

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const AA_UI = 3;

/** Custom properties declared in a top-level rule, by brace matching. */
function tokensIn(selector) {
  const start = CSS.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);

  const open = CSS.indexOf('{', start);
  let depth = 0;
  let close = open;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    else if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }

  const body = CSS.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = {};
  for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const LIGHT = tokensIn(':root,\n.force-light');
const DARK = { ...LIGHT, ...tokensIn('.dark {') };

function parseHex(value) {
  const match = String(value).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** Resolves a token to an RGB triple, following `var()` indirection. */
function resolve0(tokens, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);

  const raw = tokens[name];
  if (!raw) return null;

  const direct = parseHex(raw);
  if (direct) return direct;

  const ref = raw.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (ref) return resolve0(tokens, ref[1], seen);

  return null;
}

/** Relative luminance, per WCAG. */
function luminance([r, g, b]) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast of one token against another, in a given theme. */
function contrast(tokens, fgToken, bgToken) {
  const fg = resolve0(tokens, fgToken);
  const bg = resolve0(tokens, bgToken);
  if (!fg || !bg) return null;
  return ratio(fg, bg);
}

const THEMES = [
  ['light', LIGHT],
  ['dark', DARK],
];

// Text that must be readable, and the surface it sits on.
const TEXT_PAIRS = [
  ['--text-primary', '--surface'],
  ['--text-primary', '--canvas'],
  ['--text-primary', '--surface-raised'],
  ['--text-secondary', '--surface'],
  ['--text-secondary', '--canvas'],
  ['--text-secondary', '--surface-raised'],
  ['--text-muted', '--surface'],
  ['--text-muted', '--canvas'],
  ['--link', '--surface'],
  ['--link', '--canvas'],
  ['--accent-fg', '--accent'],
  ['--btn-neutral-fg', '--btn-neutral-bg'],
];

const TINT_FAMILIES = ['gray', 'blue', 'cyan', 'green', 'red', 'amber', 'indigo', 'purple', 'yellow'];

// Non-text boundaries: a border has to be discernible against what it separates.
const UI_PAIRS = [
  ['--border-strong', '--surface'],
  ['--focus-ring', '--surface'],
  ['--focus-ring', '--canvas'],
];

describe('token contrast', () => {
  it('resolves every token used in the audit', () => {
    const missing = [];
    for (const [theme, tokens] of THEMES) {
      for (const [fg, bg] of [...TEXT_PAIRS, ...UI_PAIRS]) {
        if (!resolve0(tokens, fg)) missing.push(`${theme}: ${fg}`);
        if (!resolve0(tokens, bg)) missing.push(`${theme}: ${bg}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  describe.each(THEMES)('%s theme', (theme, tokens) => {
    it.each(TEXT_PAIRS)('%s on %s meets AA for normal text', (fg, bg) => {
      const value = contrast(tokens, fg, bg);
      expect(value, `${theme}: ${fg} on ${bg} = ${value?.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    });

    it.each(TINT_FAMILIES)('tint-%s foreground meets AA on its own background', (family) => {
      const value = contrast(tokens, `--tint-${family}-fg`, `--tint-${family}-bg`);
      expect(
        value,
        `${theme}: tint-${family} = ${value?.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });

    it.each(UI_PAIRS)('%s against %s meets AA for a UI boundary', (fg, bg) => {
      const value = contrast(tokens, fg, bg);
      expect(value, `${theme}: ${fg} on ${bg} = ${value?.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        AA_UI
      );
    });

    it('disabled control text stays legible enough to read', () => {
      // Disabled text is exempt from AA, but it still has to be readable rather
      // than invisible — the old `text-gray-300` inverted to roughly 1.5:1.
      const value = contrast(tokens, '--control-fg-disabled', '--control-bg-disabled');
      expect(value, `${theme}: disabled = ${value?.toFixed(2)}:1`).toBeGreaterThanOrEqual(2);
    });

    it('keeps the danger colour readable on a surface', () => {
      const value = contrast(tokens, '--danger', '--surface');
      expect(value, `${theme}: danger = ${value?.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_LARGE);
    });
  });
});

describe('contrast report', () => {
  it('prints the measured ratios', () => {
    const lines = [];
    for (const [theme, tokens] of THEMES) {
      lines.push(`\n  ${theme}:`);
      for (const [fg, bg] of TEXT_PAIRS) {
        const value = contrast(tokens, fg, bg);
        lines.push(`    ${String(value?.toFixed(2)).padStart(6)}:1  ${fg} on ${bg}`);
      }
      for (const family of TINT_FAMILIES) {
        const value = contrast(tokens, `--tint-${family}-fg`, `--tint-${family}-bg`);
        lines.push(`    ${String(value?.toFixed(2)).padStart(6)}:1  tint-${family}`);
      }
    }
    // Surfaced in the test output so the numbers are reviewable, not just pass/fail.
    console.log(lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  });
});
