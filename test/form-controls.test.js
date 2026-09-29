import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

/** Declarations of the first rule whose selector matches exactly. */
function declarationsOf(selector) {
  const re = new RegExp(
    `(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`
  );
  const match = CSS.match(re);
  if (!match) return null;

  // Comments have to go first, otherwise one sitting above a declaration ends up
  // glued to the front of the property name.
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

const shared = declarationsOf('.form-input, .form-select, .form-textarea');
const select = declarationsOf('.form-select');
const textarea = declarationsOf('.form-textarea');

describe('form control primitives', () => {
  it('declares all three control types in a single shared rule', () => {
    // One rule is what makes height parity structural rather than coincidental.
    expect(shared).toBeTruthy();
  });

  it('gives every control type the same box model', () => {
    // jsdom cannot resolve var() in computed styles, so parity is proven
    // structurally: identical min-height, padding, font-size, line-height and
    // border on one shared rule means the three cannot diverge. Actual pixel
    // parity is confirmed in a browser by the height probe on /dev/ui.
    expect(shared['min-height']).toBe('var(--control-h)');
    expect(shared.padding).toBe('var(--control-pad-y) var(--control-pad-x)');
    expect(shared['font-size']).toBe('var(--control-fs)');
    expect(shared['line-height']).toBe('1.25rem');
    expect(shared.border).toBe('1px solid var(--border-strong)');
    expect(shared.width).toBe('100%');
    expect(shared.display).toBe('block');
  });

  it('clears the native select chrome, which is the actual cause of the mismatch', () => {
    // A select sizes itself from its own chrome unless appearance is cleared, so
    // matching padding alone never made it agree with a sibling input.
    expect(select.appearance).toBe('none');
    expect(select['-webkit-appearance']).toBe('none');
  });

  it('replaces the native arrow with a themed background image', () => {
    // A select with appearance:none cannot reliably carry a pseudo-element.
    expect(select['background-image']).toBe('var(--select-chevron)');
    expect(select['background-repeat']).toBe('no-repeat');
    expect(select['background-position']).toContain('var(--control-pad-x)');
  });

  it('reserves room for the arrow so long option text cannot run under it', () => {
    expect(select['padding-inline-end']).toBe('calc(var(--control-pad-x) * 2 + 0.8rem)');
  });

  it('does not let the select override any shared sizing property', () => {
    // Anything here beyond the arrow and its padding would break parity.
    const sizingProps = ['min-height', 'padding', 'font-size', 'line-height', 'border', 'width'];
    for (const property of sizingProps) {
      expect(select[property]).toBeUndefined();
    }
  });

  it('makes the textarea taller on purpose, and resizable only vertically', () => {
    expect(textarea['min-height']).toBe('calc(var(--control-h) * 2.5)');
    expect(textarea.resize).toBe('vertical');
  });

  it('drives every size from the density tokens', () => {
    for (const token of ['--control-h', '--control-pad-y', '--control-pad-x', '--control-fs']) {
      expect(CSS).toContain(`var(${token})`);
    }
  });

  it('uses no @apply in the control rules, so sizing is not split across layers', () => {
    const block = CSS.slice(CSS.indexOf('.form-input, .form-select, .form-textarea'));
    expect(block).not.toContain('@apply');
  });

  it('has a visible focus-visible ring distinct from the hover border', () => {
    expect(CSS).toMatch(/\.form-input:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--focus-ring\)/);
    expect(CSS).toMatch(/\.form-input:focus[^-][^{]*\{[^}]*outline:\s*none/);
  });

  it('styles disabled, readonly and invalid states', () => {
    expect(CSS).toMatch(/\.form-input:disabled[^{]*\{[^}]*background-color:\s*var\(--control-bg-disabled\)/);
    expect(CSS).toMatch(/\.form-input:disabled[^{]*\{[^}]*cursor:\s*not-allowed/);
    // [readonly] rather than :read-only, which also matches non-editable elements.
    expect(CSS).toMatch(/\.form-input\[readonly\]/);
    expect(CSS).not.toMatch(/\.form-input:read-only/);
    expect(CSS).toMatch(/\[aria-invalid="true"\][^{]*\{[^}]*border-color:\s*var\(--danger\)/);
  });

  it('themes the placeholder rather than leaving it at the browser default', () => {
    expect(CSS).toMatch(/\.form-input::placeholder[^{]*\{[^}]*color:\s*var\(--control-placeholder\)/);
  });

  it('gives the select chevron and control state colours a dark counterpart', () => {
    const darkStart = CSS.indexOf('.dark {');
    const darkBody = CSS.slice(darkStart, CSS.indexOf('\n}', darkStart));
    for (const token of [
      '--select-chevron',
      '--control-bg-disabled',
      '--control-fg-disabled',
      '--control-bg-readonly',
      '--control-shadow',
      '--control-placeholder',
      '--danger',
    ]) {
      expect(darkBody).toContain(token);
    }
    // The stroke colour is baked into the SVG, so the two variants must differ.
    const chevrons = [...CSS.matchAll(/--select-chevron:\s*url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(chevrons).toHaveLength(2);
    expect(chevrons[0]).not.toBe(chevrons[1]);
  });
});
