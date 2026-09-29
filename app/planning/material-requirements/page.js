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
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Requirement, projection or material" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          {can('brand.view') && (
            <div>
              <label className="block text-xs text-fg-subtle mb-1">Brand</label>
              <select value={filters.brand_id} onChange={(e) => setFilter('brand_id', e.target.value)} className="form-select">
                <option value="">All Brands</option>
                {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="planned">Planned</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
            Reset
          </button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requirement No.</th>
                <th>Company</th>
                <th>Projection</th>
                <th>Brand</th>
                <th>Material</th>
                <th className="text-right">Required</th>
                <th className="text-right">Planned</th>
                <th className="text-right">Pending (plan)</th>
                <th className="text-right">Ordered</th>
                <th className="text-right">Pending (order)</th>
                <th>UOM</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" className="text-center">Loading material requirements...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={12} icon="bi-list-check" title="No material requirements" message="Finalize a brand projection, then generate its requirements." />
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono cell-strong">
                    <Link href={`/planning/material-requirements/${r.id}`} className="hover:text-link">{r.requirement_no}</Link>
                  </td>
                  <td><CompanyBadge label={r.company_label} code={r.company_code} /></td>
                  <td className="font-mono text-fg-muted">
                    {can('brand-projection.view')
                      ? <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className="hover:text-link">{r.projection_no}</Link>
                      : r.projection_no}
                  </td>
                  <td className="text-fg-muted">{r.brand_name}</td>
                  <td className="cell-strong">{r.product_name}</td>
                  <td className="text-right">{formatQuantity(r.required_quantity, r.uom_decimal_places)}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(r.planned_quantity, r.uom_decimal_places)}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(r.pending_quantity, r.uom_decimal_places)}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(r.ordered_quantity, r.uom_decimal_places)}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(r.order_pending_quantity, r.uom_decimal_places)}</td>
                  <td className="font-mono text-fg-muted">{r.uom_code}</td>
                  <td><WorkflowBadge status={r.status} config={REQUIREMENT_STATUS_BADGES} /></td>
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
