'use client';
import { useCompanies } from '../../hooks/useCompanies';

/**
 * Company <select> for create/edit forms of company-owned records.
 * Inactive companies are listed only when already selected (an existing
 * record keeps its owner even after the company is deactivated).
 *
 * `emptyLabel` — when set, a blank option with this text is offered
 * (e.g. "Shared (both companies)" for buyers/suppliers). Otherwise the
 * blank option is a "Select company" placeholder.
 */
export default function CompanySelect({ value, onChange, name = 'company_id', required = false, disabled = false, emptyLabel = null, className = '' }) {
  const companies = useCompanies();
  const selected = value === null || value === undefined ? '' : String(value);

  return (
    <select
      name={name}
      value={selected}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={className || 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500'}
    >
      <option value="">{emptyLabel || 'Select company'}</option>
      {companies
        .filter((c) => c.is_active || String(c.id) === selected)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.is_active ? '' : ' (inactive)'}
          </option>
        ))}
    </select>
  );
}
