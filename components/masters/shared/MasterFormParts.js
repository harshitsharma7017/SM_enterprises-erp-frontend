import FormSection from '@/components/ui/FormSection';

// Same field styling as the other master forms (Brand, Material Type, UOM).
export const INPUT = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

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
      <label htmlFor={htmlFor} className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
        {label} {required && <span className="text-red-500 font-normal">*</span>}
      </label>
      <div className="sm:w-3/4">
        {children}
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}
