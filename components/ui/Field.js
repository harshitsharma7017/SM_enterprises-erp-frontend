'use client';
import { Children, cloneElement, isValidElement, useId } from 'react';

/**
 * Label + control + hint/error, with the accessibility wiring done once.
 *
 * Replaces the hand-rolled `<label className="block text-xs ...">` pattern that
 * appears ~356 times, none of which connected the label to its control or
 * announced validation errors.
 *
 * Works with controlled inputs — this codebase talks to a REST backend through
 * value/onChange, not Server Actions.
 *
 * Accepts either a single element child, whose id and aria attributes are filled
 * in automatically:
 *
 *   <Field label="Buyer" error={errors.buyer}>
 *     <select value={v} onChange={onChange} />
 *   </Field>
 *
 * or a function child, when the control is nested or there are several:
 *
 *   <Field label="Range">
 *     {({ id, describedBy, invalid }) => ( ... )}
 *   </Field>
 */
export default function Field({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  className = '',
  labelClassName = '',
  children,
}) {
  const generatedId = useId();
  const controlId = htmlFor || generatedId;

  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  // Error last so screen readers reach the actionable part sooner.
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);

  let control;
  if (typeof children === 'function') {
    control = children({ id: controlId, describedBy, invalid });
  } else {
    const only = Children.count(children) === 1 ? Children.only(children) : null;
    control = isValidElement(only)
      ? cloneElement(only, {
          id: only.props.id || controlId,
          'aria-describedby': only.props['aria-describedby'] || describedBy,
          'aria-invalid': only.props['aria-invalid'] ?? (invalid ? 'true' : undefined),
        })
      : children;
  }

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={controlId}
          className={`block text-xs font-medium text-fg-muted mb-1 ${labelClassName}`}
        >
          {label}
          {required && (
            <span className="text-[var(--danger)]" aria-hidden="true"> *</span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      {control}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-fg-subtle">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
