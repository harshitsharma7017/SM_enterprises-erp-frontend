'use client';

import { useState } from 'react';

/**
 * Searchable multi-select (the original's TomSelect "searchable multiple"):
 * chosen items show as removable chips; a search box filters the list.
 * `options`: [{ id, name }]. `value`: array of ids (strings or numbers).
 */
export default function SearchMultiSelect({ options = [], value = [], onChange, placeholder = 'Search…', id }) {
  const [query, setQuery] = useState('');
  const selected = new Set(value.map(String));
  const toggle = (optionId) => {
    const key = String(optionId);
    onChange(selected.has(key) ? value.filter((v) => String(v) !== key) : [...value, optionId]);
  };
  const shown = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="border border-line-strong rounded" id={id}>
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-line">
          {options.filter((o) => selected.has(String(o.id))).map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1 bg-surface-raised border border-line rounded px-2 py-0.5 text-xs">
              {o.name}
              <button type="button" onClick={() => toggle(o.id)} className="text-fg-subtle hover:text-[var(--danger)]" aria-label={`Remove ${o.name}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
        className="form-input border-0 border-b" />
      <div className="max-h-40 overflow-y-auto">
        {shown.length === 0 ? <div className="px-3 py-2 text-xs text-fg-subtle">No matches.</div> : shown.map((o) => (
          <label key={o.id} className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-surface-hover cursor-pointer">
            <input type="checkbox" checked={selected.has(String(o.id))} onChange={() => toggle(o.id)} className="rounded border-line-strong" />
            {o.name}
          </label>
        ))}
      </div>
    </div>
  );
}
