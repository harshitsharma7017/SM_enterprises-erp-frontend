'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, BARCODE_STATUS_BADGES, LOT_SOURCE_LABELS } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';
const EMPTY_FILTERS = { search: '', company_id: '', product_id: '', lot: '', source_type: '', status: '', date_from: '', date_to: '' };

export default function BarcodeListPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/barcodes?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch barcodes');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // The material filter needs product.view; without it the filter is hidden.
  useEffect(() => {
    if (!can('product.view')) return;
    apiClient.get('/masters/products?limit=1000').then((res) => setProducts(res.data?.data || [])).catch(() => setProducts([]));
  }, [can]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const Actions = (
    <>
      {can('barcode.scan') && <Link href="/barcode/scan" className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline"><i className="bi bi-upc-scan mr-1"></i> Scan</Link>}
      {can('barcode.create') && <Link href="/barcode/codes/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline"><i className="bi bi-plus-lg mr-1"></i> Generate Barcode</Link>}
    </>
  );

  return (
    <DashboardLayout>
      <PageHeading title="Barcodes" breadcrumbs={[{ label: 'Barcode' }, { label: 'Barcodes' }]} />
      <Card title="Lot barcodes" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Barcode, lot, material, GRN, PO or processing" className={INPUT} />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-44" />
          {can('product.view') && (
            <div className="w-44">
              <label className="block text-xs text-gray-500 mb-1">Material</label>
              <select value={filters.product_id} onChange={(e) => setFilter('product_id', e.target.value)} className={INPUT}>
                <option value="">All</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Lot No.</label>
            <input type="text" value={filters.lot} onChange={(e) => setFilter('lot', e.target.value)} className={INPUT} />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Source</label>
            <select value={filters.source_type} onChange={(e) => setFilter('source_type', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(LOT_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(BARCODE_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Created from</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">Reset</button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Barcode</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Lot</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 font-medium text-right">In stock</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium text-center">Scans</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading barcodes...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-upc" title="No barcodes" message="Generate a barcode for a received lot, then print its label." />
              ) : rows.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2"><Link href={`/barcode/codes/${b.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{b.barcode_value}</Link></td>
                  <td className="px-4 py-2"><CompanyBadge label={b.company_label} code={b.company_code} /></td>
                  <td className="px-4 py-2 font-mono text-xs">{b.lot_no}</td>
                  <td className="px-4 py-2 text-xs">{LOT_SOURCE_LABELS[b.source_type]}<div className="text-gray-500 font-mono">{b.inward_no || b.processing_no}</div></td>
                  <td className="px-4 py-2 text-gray-700">{b.product_name}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{formatQuantity(b.stock_quantity, b.uom_decimal_places)} {b.unit}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(b.created_at)}<div className="text-xs">{b.creator_name}</div></td>
                  <td className="px-4 py-2 text-center">{b.scans_count}{b.last_scanned_at && <div className="text-xs text-gray-500">{formatDateTime(b.last_scanned_at)}</div>}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={b.status} config={BARCODE_STATUS_BADGES} /></td>
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
