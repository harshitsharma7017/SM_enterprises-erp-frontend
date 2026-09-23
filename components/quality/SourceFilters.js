'use client';

import { useState, useEffect } from 'react';
import CompanyFilter from '@/components/company/CompanyFilter';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export const EMPTY_SOURCE_FILTERS = { search: '', company_id: '', supplier_id: '', po: '', grn: '', lot: '', status: '', date_from: '', date_to: '' };

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

/**
 * List filters shared by Quality Control, Supplier Returns and Debit Notes:
 * search, company, supplier, PO / GRN / lot number, status and date range.
 * Filtering happens on the server; `statuses` is [[value, label], ...].
 */
export default function SourceFilters({ filters, setFilter, onReset, statuses, searchPlaceholder, showLot = true }) {
  const { can } = useAuth(true);
  const [suppliers, setSuppliers] = useState([]);

  // Supplier filter options need supplier.view; without it the filter is hidden.
  useEffect(() => {
    if (!can('supplier.view')) return;
    apiClient.get('/masters/suppliers?party_type=supplier&limit=1000')
      .then((res) => setSuppliers(res.data?.data || []))
      .catch(() => setSuppliers([]));
  }, [can]);

  return (
    <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-gray-500 mb-1">Search</label>
        <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder={searchPlaceholder} className={INPUT} />
      </div>
      <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-48" />
      {can('supplier.view') && (
        <div className="w-48">
          <label className="block text-xs text-gray-500 mb-1">Supplier</label>
          <select value={filters.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)} className={INPUT}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
        </div>
      )}
      <div className="w-36">
        <label className="block text-xs text-gray-500 mb-1">PO No.</label>
        <input type="text" value={filters.po} onChange={(e) => setFilter('po', e.target.value)} className={INPUT} />
      </div>
      <div className="w-36">
        <label className="block text-xs text-gray-500 mb-1">GRN No.</label>
        <input type="text" value={filters.grn} onChange={(e) => setFilter('grn', e.target.value)} className={INPUT} />
      </div>
      {showLot && (
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Lot No.</label>
          <input type="text" value={filters.lot} onChange={(e) => setFilter('lot', e.target.value)} className={INPUT} />
        </div>
      )}
      <div className="w-40">
        <label className="block text-xs text-gray-500 mb-1">Status</label>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
          <option value="">All</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="w-36">
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
      </div>
      <div className="w-36">
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
      </div>
      <button type="button" onClick={onReset} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
        Reset
      </button>
    </form>
  );
}
