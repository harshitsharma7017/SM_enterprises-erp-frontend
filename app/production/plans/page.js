'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, PRODUCTION_PLAN_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', status: '', date_from: '', date_to: '' };

export default function ProductionPlansPage() {
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
      const res = await apiClient.get(`/production/plans?${params.toString()}`);
      setRows(res.data?.data || []);
      setPageInfo({ total: res.data?.total || 0, page: res.data?.page || 1, limit: res.data?.limit || 15 });
    } catch (err) {
      setError(err.message || 'Failed to fetch production plans');
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

  const Actions = can('production-plan.create') ? (
    <Link href="/production/plans/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Production Plan
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Production Plans" breadcrumbs={[{ label: 'Production' }, { label: 'Production Plans' }]} />

      <Card title="What to produce, and how far it has got" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Number, title or product" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(PRODUCTION_PLAN_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Plan date from</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Plan date to</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className="form-input" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">Reset</button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan No.</th>
                <th>Company</th>
                <th>Title</th>
                <th>Plan / target date</th>
                <th className="text-center">Lines produced</th>
                <th className="text-center">Processing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center">Loading production plans…</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-kanban" title="No production plans" message="Plan what to produce once material requirements are finalised." />
              ) : rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono cell-strong"><Link href={`/production/plans/${p.id}`} className="hover:text-link">{p.plan_no}</Link></td>
                  <td><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                  <td className="cell-strong">{p.title}</td>
                  <td className="text-fg-muted">{formatDate(p.plan_date)}{p.target_date && <div className="text-xs text-fg-subtle">target {formatDate(p.target_date)}</div>}</td>
                  <td className="text-center">{p.produced_lines_count} / {p.lines_count}</td>
                  <td className="text-center text-fg-muted">{p.processing_count}</td>
                  <td><WorkflowBadge status={p.status} config={PRODUCTION_PLAN_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">A line is produced when the output posted to stock by the processing booked against it reaches its planned quantity.</p>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
