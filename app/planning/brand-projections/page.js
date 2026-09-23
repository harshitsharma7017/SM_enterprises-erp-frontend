'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, PROJECTION_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', brand_id: '', status: '', period_from: '', period_to: '' };

export default function BrandProjectionsPage() {
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
      const res = await apiClient.get(`/planning/brand-projections?${params.toString()}`);
      if (res.success) {
        setRows(res.data.data || []);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch brand projections');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // Brand filter options need brand.view; without it the filter is simply hidden.
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

  const Actions = can('brand-projection.create') ? (
    <Link href="/planning/brand-projections/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Projection
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Brand Projections" breadcrumbs={[{ label: 'Planning' }, { label: 'Brand Projections' }]} />

      <Card title="Seasonal material projections by brand" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Number, title or brand" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
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
              <option value="draft">Draft</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Period from</label>
            <input type="date" value={filters.period_from} onChange={(e) => setFilter('period_from', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Period to</label>
            <input type="date" value={filters.period_to} onChange={(e) => setFilter('period_to', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Reset
          </button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Projection No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Brand</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Period</th>
                <th className="px-4 py-2 font-medium text-center">Lines</th>
                <th className="px-4 py-2 font-medium text-center">Requirements</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading brand projections...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-graph-up-arrow" title="No brand projections" message="Record a brand's seasonal material projection to start planning." />
              ) : rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold text-gray-900">
                    <Link href={`/planning/brand-projections/${p.id}`} className="hover:text-blue-600">{p.projection_no}</Link>
                  </td>
                  <td className="px-4 py-2"><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                  <td className="px-4 py-2 text-gray-800">{p.brand_name}</td>
                  <td className="px-4 py-2 text-gray-700">{p.title}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{p.items_count}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{p.requirements_count}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={p.status} config={PROJECTION_STATUS_BADGES} /></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link href={`/planning/brand-projections/${p.id}`} className="px-2 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md" title="View"><i className="bi bi-eye"></i></Link>
                    {can('brand-projection.edit') && p.status === 'draft' && (
                      <Link href={`/planning/brand-projections/${p.id}/edit`} className="px-2 py-1 text-sm border border-l-0 border-blue-300 text-blue-600 hover:bg-blue-50 rounded-r-md" title="Edit"><i className="bi bi-pencil"></i></Link>
                    )}
                  </td>
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
