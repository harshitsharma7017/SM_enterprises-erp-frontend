'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, COMMERCIAL_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
const EMPTY_FILTERS = { search: '', company_id: '', status: '', buyer_id: '', order: '', dispatch: '', date_from: '', date_to: '' };

export default function InvoiceListPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [buyers, setBuyers] = useState([]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/finance/invoices?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // The customer filter needs buyer.view; without it the filter is hidden.
  useEffect(() => {
    if (!can('buyer.view')) return;
    apiClient.get('/masters/buyers?limit=1000').then((res) => setBuyers(res.data?.data || [])).catch(() => setBuyers([]));
  }, [can]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const Actions = can('invoice.create') ? (
    <Link href="/finance/invoices/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Invoice
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Invoices" breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]} />
      <Card title="Final invoices on posted dispatches" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}
        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Invoice, order, PI, dispatch, customer or reference" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          {can('buyer.view') && (
            <div>
              <label className="block text-xs text-fg-subtle mb-1">Customer</label>
              <select value={filters.buyer_id} onChange={(e) => setFilter('buyer_id', e.target.value)} className="form-select">
                <option value="">All</option>
                {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Order No.</label>
            <input type="text" value={filters.order} onChange={(e) => setFilter('order', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Dispatch No.</label>
            <input type="text" value={filters.dispatch} onChange={(e) => setFilter('dispatch', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(COMMERCIAL_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className="form-input" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">Reset</button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Company</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Order</th>
                <th>PI</th>
                <th>Dispatch</th>
                <th className="text-center">Lines</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="text-center">Loading invoices...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={10} icon="bi-file-earmark-check" title="No invoices" message="Invoice a posted dispatch from its order or from the dispatch." />
              ) : rows.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/finance/invoices/${d.id}`} className="font-mono font-semibold text-fg hover:text-link">{d.invoice_no || `Draft #${d.id}`}</Link></td>
                  <td><CompanyBadge label={d.company_label} code={d.company_code} /></td>
                  <td className="whitespace-nowrap">{formatDate(d.invoice_date)}</td>
                  <td className="text-fg-muted">{d.buyer_name}</td>
                  <td className="font-mono">{d.oc_num || '—'}</td>
                  <td className="font-mono">{d.pi_no || '—'}</td>
                  <td className="font-mono">{d.dispatch_nos}</td>
                  <td className="text-center">{d.lines_count}</td>
                  <td className="text-right whitespace-nowrap">{d.total_amount === null ? '—' : formatAmount(d.total_amount)} <span className="text-xs text-fg-subtle">{d.currency_code || ''}</span>{d.unpriced_lines_count > 0 && <div className="text-xs text-amber-700">{d.unpriced_lines_count} unpriced line(s)</div>}</td>
                  <td><WorkflowBadge status={d.status} config={COMMERCIAL_STATUS_BADGES} /></td>
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
