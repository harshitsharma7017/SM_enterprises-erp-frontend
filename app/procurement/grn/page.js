'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, GRN_STATUS_BADGES, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', supplier_id: '', receipt_status: '', entry_type: '', date_from: '', date_to: '' };

// Legacy integer inward entries stay readable on their original page (with their QC history).
const detailHref = (row) => (row.entry_type === 'legacy_inward' ? `/procurement/inward-entries/${row.id}` : `/procurement/grn/${row.id}`);

export default function GrnListPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/procurement/inward-entries?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch goods receipts');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // Supplier filter options need supplier.view; without it the filter is hidden.
  useEffect(() => {
    if (!can('supplier.view')) return;
    apiClient.get('/masters/suppliers?party_type=supplier&limit=1000')
      .then((res) => setSuppliers(res.data?.data || []))
      .catch(() => setSuppliers([]));
  }, [can]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const Actions = can('inward-entry.create') ? (
    <Link href="/procurement/grn/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New GRN
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Goods Receipts (GRN)" breadcrumbs={[{ label: 'Procurement' }, { label: 'Goods Receipts' }]} />

      <Card title="Material received against purchase orders" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="GRN, PO, challan or lot no." className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel="Unassigned" className="w-52" />
          {can('supplier.view') && (
            <div className="w-52">
              <label className="block text-xs text-gray-500 mb-1">Supplier</label>
              <select value={filters.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">All Suppliers</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
          )}
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.receipt_status} onChange={(e) => setFilter('receipt_status', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={filters.entry_type} onChange={(e) => setFilter('entry_type', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              <option value="grn">GRN</option>
              <option value="legacy_inward">Legacy inward</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Reset
          </button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">GRN No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Purchase Order</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Challan</th>
                <th className="px-4 py-2 font-medium text-center">Lots</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading goods receipts...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={8} icon="bi-box-arrow-in-down" title="No goods receipts" message="Record material received against a confirmed purchase order." />
              ) : rows.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={detailHref(g)} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{g.inward_no}</Link>
                    {g.entry_type === 'legacy_inward' && <div className="text-xs text-gray-500">Legacy inward</div>}
                  </td>
                  <td className="px-4 py-2"><CompanyBadge label={g.company_label} code={g.company_code} /></td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(g.inward_date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-mono text-gray-800">{g.purchase_order_num}</div>
                    <div className="text-xs text-gray-500">{PO_ORIGIN_LABELS[g.purchase_order_origin] || ''}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{g.supplier_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{g.challan_no || '—'}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{g.lots_count}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={g.receipt_status} config={GRN_STATUS_BADGES} /></td>
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
