'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, LOCATION_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const EMPTY_FILTERS = { search: '', company_id: '', status: '' };

export default function StockLocationsPage() {
  const { can } = useAuth(true);
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
      const res = await apiClient.get(`/inventory/locations?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch locations');
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

  const Actions = can('stock-location.create') ? (
    <Link href="/inventory/locations/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Location
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Stock Locations" breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Locations' }]} />
      <Card title="Where accepted stock is held" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}
        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Code or name" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">Reset</button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Company</th>
                <th className="text-center">Lots in stock</th>
                <th className="text-center">Movements</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading locations...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-geo-alt" title="No stock locations" message="Create a location before posting accepted material to stock." />
              ) : rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    {can('stock-location.view') ? <Link href={`/inventory/locations/${l.id}`} className="font-mono font-semibold text-fg hover:text-link">{l.code}</Link> : <span className="font-mono font-semibold">{l.code}</span>}
                  </td>
                  <td className="cell-strong">{l.name}</td>
                  <td><CompanyBadge label={l.company_label} code={l.company_code} /></td>
                  <td className="text-center">{l.lots_in_stock}</td>
                  <td className="text-center">{l.movements_count}</td>
                  <td><WorkflowBadge status={l.status} config={LOCATION_STATUS_BADGES} /></td>
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
