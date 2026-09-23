'use client';
import { useCompanies } from '../../hooks/useCompanies';

/**
 * "Company: All Companies ▼" list filter. The value is sent as `company_id`
 * ('' = all companies). `emptyOptionLabel` adds an option for rows with no
 * company ("Unassigned" / "Shared only"), sent as `company_id=unassigned`.
 */
export default function CompanyFilter({ value, onChange, name = 'company_id', emptyOptionLabel = 'Unassigned', className = 'w-56' }) {
  const companies = useCompanies();

  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">Company</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Companies</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.short_name || c.name}</option>
        ))}
        {emptyOptionLabel && <option value="unassigned">{emptyOptionLabel}</option>}
      </select>
    </div>
  );
}
