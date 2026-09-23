'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, REQUIREMENT_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', brand_id: '', status: '' };

export default function MaterialRequirementsPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/planning/material-requirements?${params.toString()}`);
      if (res.success) {
        setRows(res.data.data || []);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch material requirements');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  useEffect(() => {
    if (!can('brand.view')) return;
    apiClient.get('/masters/brands?limit=500')
      .then((res) => setBrands(res.data?.data || []))
      .catch(() => setBrands([]));
  }, [can]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value, ...(name === 'company_id' ? { brand_id: '' } : {}) }));
    setPage(1);
  };

  const brandOptions = brands.filter((b) => !filters.company_id || String(b.company_id) === String(filters.company_id));

  return (
    <DashboardLayout>
      <PageHeading title="Material Requirements" breadcrumbs={[{ label: 'Planning' }, { label: 'Material Requirements' }]} />

      <Card title="Requirements generated from finalized brand projections" variant="primary">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Requirement, projection or material" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-52" />
          {can('brand.view') && (
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">Brand</label>
              <select value={filters.brand_id} onChange={(e) => setFilter('brand_id', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">All Brands</option>
                {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="planned">Planned</option>
              <option value="closed">Closed</option>
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
                <th className="px-4 py-2 font-medium">Requirement No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Projection</th>
                <th className="px-4 py-2 font-medium">Brand</th>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 font-medium text-right">Required</th>
                <th className="px-4 py-2 font-medium text-right">Planned</th>
                <th className="px-4 py-2 font-medium text-right">Pending (plan)</th>
                <th className="px-4 py-2 font-medium text-right">Ordered</th>
                <th className="px-4 py-2 font-medium text-right">Pending (order)</th>
                <th className="px-4 py-2 font-medium">UOM</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="12" className="text-center py-8 text-gray-500">Loading material requirements...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={12} icon="bi-list-check" title="No material requirements" message="Finalize a brand projection, then generate its requirements." />
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold text-gray-900">
                    <Link href={`/planning/material-requirements/${r.id}`} className="hover:text-blue-600">{r.requirement_no}</Link>
                  </td>
                  <td className="px-4 py-2"><CompanyBadge label={r.company_label} code={r.company_code} /></td>
                  <td className="px-4 py-2 font-mono text-gray-600">
                    {can('brand-projection.view')
                      ? <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className="hover:text-blue-600">{r.projection_no}</Link>
                      : r.projection_no}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{r.brand_name}</td>
                  <td className="px-4 py-2 text-gray-900">{r.product_name}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatQuantity(r.required_quantity, r.uom_decimal_places)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatQuantity(r.planned_quantity, r.uom_decimal_places)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatQuantity(r.pending_quantity, r.uom_decimal_places)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatQuantity(r.ordered_quantity, r.uom_decimal_places)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatQuantity(r.order_pending_quantity, r.uom_decimal_places)}</td>
                  <td className="px-4 py-2 font-mono text-gray-600">{r.uom_code}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={r.status} config={REQUIREMENT_STATUS_BADGES} /></td>
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
