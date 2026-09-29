'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, PLAN_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', status: '', period_from: '', period_to: '' };

export default function MaterialPlansPage() {
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
      const res = await apiClient.get(`/planning/material-plans?${params.toString()}`);
      if (res.success) {
        setRows(res.data.data || []);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch material plans');
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

  const Actions = can('material-plan.create') ? (
    <Link href="/planning/material-plans/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Material Plan
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Material Plans" breadcrumbs={[{ label: 'Planning' }, { label: 'Material Plans' }]} />

      <Card title="What to prepare or purchase" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Number, title or material" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Period from</label>
            <input type="date" value={filters.period_from} onChange={(e) => setFilter('period_from', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Period to</label>
            <input type="date" value={filters.period_to} onChange={(e) => setFilter('period_to', e.target.value)} className="form-input" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
            Reset
          </button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan No.</th>
                <th>Company</th>
                <th>Title / Period</th>
                <th>Material</th>
                <th className="text-right">Required</th>
                <th className="text-right">Planned (this plan)</th>
                <th className="text-right">Pending (plan)</th>
                <th className="text-right">Ordered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center">Loading material plans...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-calendar2-week" title="No material plans" message="Create a plan from open material requirements." />
              ) : rows.map((p) => {
                const lines = p.items.length ? p.items : [null];
                return lines.map((line, i) => (
                  <tr key={`${p.id}-${line ? line.id : 'none'}`} className="align-top">
                    {i === 0 && (
                      <>
                        <td rowSpan={lines.length} className="font-mono cell-strong">
                          <Link href={`/planning/material-plans/${p.id}`} className="hover:text-link">{p.plan_no}</Link>
                        </td>
                        <td rowSpan={lines.length}><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                        <td rowSpan={lines.length}>
                          <div className="text-fg">{p.title}</div>
                          <div className="text-xs text-fg-subtle">{formatDate(p.period_start)} – {formatDate(p.period_end)}</div>
                        </td>
                      </>
                    )}
                    <td className="cell-strong">{line ? line.product_name : '—'}</td>
                    <td className="text-right">{line ? `${formatQuantity(line.required_quantity, line.uom_decimal_places)} ${line.uom_code}` : '—'}</td>
                    <td className="text-right">{line ? `${formatQuantity(line.planned_quantity, line.uom_decimal_places)} ${line.uom_code}` : '—'}</td>
                    <td className="text-right text-fg-muted">{line ? `${formatQuantity(line.pending_quantity, line.uom_decimal_places)} ${line.uom_code}` : '—'}</td>
                    <td className="text-right text-fg-muted">{line ? `${formatQuantity(line.ordered_quantity, line.uom_decimal_places)} ${line.uom_code}` : '—'}</td>
                    {i === 0 && (
                      <td rowSpan={lines.length}><WorkflowBadge status={p.status} config={PLAN_STATUS_BADGES} /></td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">Pending is per requirement: required minus the quantity on all planned or closed plans.</p>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
