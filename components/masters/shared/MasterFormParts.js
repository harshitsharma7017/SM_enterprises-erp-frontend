import FormSection from '@/components/ui/FormSection';

// Field styling used to live here as an `INPUT` class string shared by inputs,
// selects and textareas alike, which is why selects never got the
// `appearance: none` treatment they needed. Controls now use the
// `.form-input` / `.form-select` / `.form-textarea` primitives directly.

/** A dropdown list sent as an array of { id, name } or as an { id: name } map. */
export const toList = (v) => (Array.isArray(v) ? v : Object.entries(v || {}).map(([id, name]) => ({ id, name })));

/** A form section, laid out like the other master forms (FormSection + an 860px field column). */
export function Section({ title, subtitle, icon, children }) {
  return (
    <FormSection title={title} icon={icon} subtitle={subtitle}>
      <div className="max-w-[860px]">{children}</div>
    </FormSection>
  );
}

/** One field per line, label on the left — the original ERP's horizontal form line. */
export function Row({ label, required = false, htmlFor, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row mb-4">
      <label htmlFor={htmlFor} className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
        {label} {required && <span className="text-[var(--danger)] font-normal">*</span>}
      </label>
      <div className="sm:w-3/4">
        {children}
        {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}
