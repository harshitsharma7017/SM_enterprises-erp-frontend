/**
 * Compact company tag for list rows and headers, e.g. [SM Enterprises].
 * The company name is always shown as text — colour is never the only cue.
 *
 * `emptyLabel` covers rows with no company: "Shared" for buyers/suppliers
 * (usable by both companies) or "Unassigned" for legacy transactions/products
 * created before multi-company support.
 */
export default function CompanyBadge({ label, code, emptyLabel = 'Unassigned' }) {
  if (!label) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-500 whitespace-nowrap"
        title={emptyLabel === 'Shared' ? 'Shared by both companies' : 'No company assigned yet'}
      >
        <i className="bi bi-building" aria-hidden="true"></i>
        {emptyLabel}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800 whitespace-nowrap"
      title={code ? `${label} (${code})` : label}
    >
      <i className="bi bi-building" aria-hidden="true"></i>
      {label}
    </span>
  );
}
