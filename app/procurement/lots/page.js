'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, LOT_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', status: '' };
const QC_STATE_LABELS = { not_inspected: 'Not inspected', partially_inspected: 'Partly inspected', inspected: 'Inspected' };

export default function LotsPage() {
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/procurement/lots?${params.toString()}`);
      if (res.success) {
        setRows(res.data.data || []);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch lots');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageHeading title="Lots" breadcrumbs={[{ label: 'Procurement' }, { label: 'Lots' }]} />

      <Card title="Received lots (created when a goods receipt is posted)" variant="primary">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Lot, mill lot, material, PO or GRN" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-52" />
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Reset
          </button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Lot No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                <th className="px-4 py-2 font-medium text-right">Width (inch)</th>
                <th className="px-4 py-2 font-medium">Mill Lot</th>
                <th className="px-4 py-2 font-medium">GRN / PO</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">QC</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-8 text-gray-500">Loading lots...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={11} icon="bi-stack" title="No lots yet" message="Lots are created when a goods receipt is posted." />
              ) : rows.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2"><Link href={`/procurement/lots/${l.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{l.lot_no}</Link></td>
                  <td className="px-4 py-2"><CompanyBadge label={l.company_label} code={l.company_code} /></td>
                  <td className="px-4 py-2 text-gray-900">{l.product_name}</td>
                  <td className="px-4 py-2 text-right font-medium whitespace-nowrap">{formatQuantity(l.quantity, l.uom_decimal_places)} {l.unit}</td>
                  <td className="px-4 py-2 text-right">{formatQuantity(l.width_inch, 3)}</td>
                  <td className="px-4 py-2 text-gray-600">{l.supplier_lot_no || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">
                    <Link href={`/procurement/grn/${l.inward_entry_id}`} className="hover:text-blue-600">{l.inward_no}</Link>
                    <div>{l.po_num}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{l.supplier_name}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(l.received_date)}</td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap">
                    <div className="text-gray-700">{QC_STATE_LABELS[l.qc_state]}</div>
                    {Number(l.qc_inspected_quantity) > 0 && (
                      <div className="text-gray-500"><span className="text-green-700">{formatQuantity(l.qc_accepted_quantity, l.uom_decimal_places)}</span> / <span className="text-red-700">{formatQuantity(l.qc_rejected_quantity, l.uom_decimal_places)}</span></div>
                    )}
                  </td>
                  <td className="px-4 py-2"><WorkflowBadge status={l.status} config={LOT_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
