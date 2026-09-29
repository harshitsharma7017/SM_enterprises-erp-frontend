'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, COMMERCIAL_STATUS_BADGES, PI_STAGE_BADGES } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
const EMPTY_FILTERS = { search: '', company_id: '', status: '', stage: '', buyer_id: '', order: '', date_from: '', date_to: '' };

export default function ProformaInvoiceListPage() {
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
      const res = await apiClient.get(`/finance/proforma-invoices?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch proforma invoices');
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

  const Actions = can('proforma-invoice.create') ? (
    <Link href="/finance/proforma-invoices/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Proforma Invoice
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Proforma Invoices" breadcrumbs={[{ label: 'Finance' }, { label: 'Proforma Invoices' }]} />
      <Card title="Proforma invoices on confirmed orders" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}
        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="PI, order, customer, reference, confirmation or payment ref." className="form-input" />
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
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(COMMERCIAL_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Stage</label>
            <select value={filters.stage} onChange={(e) => setFilter('stage', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(PI_STAGE_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
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
                <th>PI No.</th>
                <th>Company</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Order</th>
                <th className="text-center">Lines</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center">Loading proforma invoices...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={8} icon="bi-file-earmark-text" title="No proforma invoices" message="Raise a proforma invoice from a confirmed order." />
              ) : rows.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/finance/proforma-invoices/${d.id}`} className="font-mono font-semibold text-fg hover:text-link">{d.pi_no}</Link></td>
                  <td><CompanyBadge label={d.company_label} code={d.company_code} /></td>
                  <td className="whitespace-nowrap">{formatDate(d.pi_date)}</td>
                  <td className="text-fg-muted">{d.buyer_name}</td>
                  <td className="font-mono">{d.oc_num}</td>
                  <td className="text-center">{d.lines_count}</td>
                  <td className="text-right whitespace-nowrap">{d.total_amount === null ? '—' : formatAmount(d.total_amount)} <span className="text-xs text-fg-subtle">{d.currency_code || ''}</span>{d.unpriced_lines_count > 0 && <div className="text-xs text-amber-700">{d.unpriced_lines_count} unpriced line(s)</div>}</td>
                  <td><WorkflowBadge status={d.stage} config={PI_STAGE_BADGES} />{d.payment_reference && <div className="text-xs text-fg-subtle">Payment ref. {d.payment_reference}</div>}</td>
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
