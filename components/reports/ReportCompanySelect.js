'use client';

import { useCompanies } from '@/hooks/useCompanies';

/**
 * Company for a report — an explicit choice (reports never run until one is
 * made): one company, "All companies" (value 'all'; every row shows its
 * company) or, where legacy rows exist, "Unassigned".
 */
export default function ReportCompanySelect({ value, onChange, allowAll = true, allowUnassigned = false, className = 'w-48' }) {
  const companies = useCompanies();
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">Company *</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
        <option value="">— Select company —</option>
        {allowAll && <option value="all">All companies</option>}
        {companies.map((c) => <option key={c.id} value={c.id}>{c.short_name || c.name}</option>)}
        {allowUnassigned && <option value="unassigned">Unassigned (legacy)</option>}
      </select>
    </div>
  );
}
