'use client';

/**
 * A small group of mutually exclusive options rendered as one joined control.
 *
 * Uses toggle-button semantics (`aria-pressed`) inside a labelled group rather
 * than a radiogroup, so each option stays natively focusable and activates with
 * Enter or Space without custom key handling.
 */
export default function SegmentedControl({ label, value, options, onChange, className = '' }) {
  return (
    <div className={className}>
      <span className="block text-xs font-medium text-fg-subtle mb-1.5">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex w-full rounded-md border border-line-strong overflow-hidden"
      >
        {options.map((option, index) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              title={option.title || option.label}
              className={[
                'flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5',
                'text-xs font-medium transition-colors cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                'focus-visible:outline-[var(--focus-ring)]',
                isActive
                  ? 'bg-accent text-accent-fg'
                  : 'bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg',
                index > 0 ? 'border-l border-line-strong' : '',
              ].join(' ')}
            >
              {option.icon && <i className={`bi ${option.icon}`} aria-hidden="true" />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
