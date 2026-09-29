'use client';
import { useEffect, useState } from 'react';

const COLOUR_LIKE = /^(#|rgb|hsl|oklch|color\()/i;

/**
 * Discovers the CSS custom properties declared on `:root` by walking the loaded
 * stylesheets, then reports each one's computed value.
 *
 * Auto-discovery rather than a hardcoded list, so tokens added later appear here
 * without touching this file.
 */
function discoverRootTokens() {
  const names = new Set();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet — not readable, and not ours.
      continue;
    }
    if (!rules) continue;

    const visit = (ruleList) => {
      for (const rule of Array.from(ruleList)) {
        if (rule.cssRules) visit(rule.cssRules);
        if (rule.style && typeof rule.selectorText === 'string') {
          if (!/(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) continue;
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith('--')) names.add(prop);
          }
        }
      }
    };

    visit(rules);
  }

  return [...names].sort();
}

export default function TokenSwatches() {
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    let frame = 0;
    let attempts = 0;

    // Deferred rather than read synchronously in the effect body: stylesheets are
    // not guaranteed to be parsed on first commit, and a synchronous setState
    // here would trigger a cascading render.
    const read = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const discovered = discoverRootTokens().map((name) => ({
        name,
        value: rootStyle.getPropertyValue(name).trim(),
      }));

      // Retry briefly if the stylesheet has not landed yet.
      if (discovered.length === 0 && attempts < 5) {
        attempts += 1;
        frame = requestAnimationFrame(read);
        return;
      }

      setTokens(discovered);
    };

    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (tokens.length === 0) {
    return <p className="text-sm text-gray-500">No custom properties found on :root.</p>;
  }

  const colours = tokens.filter((t) => COLOUR_LIKE.test(t.value));
  const others = tokens.filter((t) => !COLOUR_LIKE.test(t.value));

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        {tokens.length} custom properties on :root — {colours.length} colour, {others.length} other.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-6">
        {colours.map((token) => (
          <div key={token.name} className="flex items-center gap-2 border border-gray-200 rounded-md p-2 bg-white">
            <span
              className="w-8 h-8 shrink-0 rounded border border-gray-300"
              style={{ background: token.value }}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <code className="block text-xs text-gray-700 truncate">{token.name}</code>
              <code className="block text-xs text-gray-500">{token.value}</code>
            </span>
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          {others.map((token) => (
            <div key={token.name} className="flex items-baseline justify-between gap-3 text-xs border-b border-gray-100 py-1">
              <code className="text-gray-700 truncate">{token.name}</code>
              <code className="text-gray-500 shrink-0">{token.value || '—'}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
