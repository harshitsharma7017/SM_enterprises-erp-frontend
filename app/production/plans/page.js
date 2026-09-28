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
const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

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
    <Link href="/production/plans/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Production Plan
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Production Plans" breadcrumbs={[{ label: 'Production' }, { label: 'Production Plans' }]} />

      <Card title="What to produce, and how far it has got" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Number, title or product" className={INPUT} />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-52" />
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(PRODUCTION_PLAN_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Plan date from</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Plan date to</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">Reset</button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Plan No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Plan / target date</th>
                <th className="px-4 py-2 font-medium text-center">Lines produced</th>
                <th className="px-4 py-2 font-medium text-center">Processing</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading production plans…</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-kanban" title="No production plans" message="Plan what to produce once material requirements are finalised." />
              ) : rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold text-gray-900"><Link href={`/production/plans/${p.id}`} className="hover:text-blue-600">{p.plan_no}</Link></td>
                  <td className="px-4 py-2"><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                  <td className="px-4 py-2 text-gray-900">{p.title}</td>
                  <td className="px-4 py-2 text-gray-700">{formatDate(p.plan_date)}{p.target_date && <div className="text-xs text-gray-500">target {formatDate(p.target_date)}</div>}</td>
                  <td className="px-4 py-2 text-center">{p.produced_lines_count} / {p.lines_count}</td>
                  <td className="px-4 py-2 text-center text-gray-700">{p.processing_count}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={p.status} config={PRODUCTION_PLAN_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">A line is produced when the output posted to stock by the processing booked against it reaches its planned quantity.</p>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
