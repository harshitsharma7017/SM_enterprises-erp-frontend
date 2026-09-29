'use client';

import { useState, useEffect } from 'react';
import CompanyFilter from '@/components/company/CompanyFilter';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export const EMPTY_SOURCE_FILTERS = { search: '', company_id: '', supplier_id: '', po: '', grn: '', lot: '', status: '', date_from: '', date_to: '' };

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
    <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
      <div className="filter-bar-wide">
        <label className="block text-xs text-fg-subtle mb-1">Search</label>
        <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder={searchPlaceholder} className="form-input" />
      </div>
      <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
      {can('supplier.view') && (
        <div>
          <label className="block text-xs text-fg-subtle mb-1">Supplier</label>
          <select value={filters.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)} className="form-select">
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-fg-subtle mb-1">PO No.</label>
        <input type="text" value={filters.po} onChange={(e) => setFilter('po', e.target.value)} className="form-input" />
      </div>
      <div>
        <label className="block text-xs text-fg-subtle mb-1">GRN No.</label>
        <input type="text" value={filters.grn} onChange={(e) => setFilter('grn', e.target.value)} className="form-input" />
      </div>
      {showLot && (
        <div>
          <label className="block text-xs text-fg-subtle mb-1">Lot No.</label>
          <input type="text" value={filters.lot} onChange={(e) => setFilter('lot', e.target.value)} className="form-input" />
        </div>
      )}
      <div>
        <label className="block text-xs text-fg-subtle mb-1">Status</label>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
          <option value="">All</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-fg-subtle mb-1">From</label>
        <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className="form-input" />
      </div>
      <div>
        <label className="block text-xs text-fg-subtle mb-1">To</label>
        <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className="form-input" />
      </div>
      <button type="button" onClick={onReset} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
        Reset
      </button>
    </form>
  );
}
