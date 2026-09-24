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

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';
const EMPTY_FILTERS = { search: '', company_id: '', status: '', buyer_id: '', order: '', date_from: '', date_to: '' };

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
    <Link href="/finance/proforma-invoices/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Proforma Invoice
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Proforma Invoices" breadcrumbs={[{ label: 'Finance' }, { label: 'Proforma Invoices' }]} />
      <Card title="Proforma invoices on confirmed orders" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="PI, order, customer, reference, confirmation or payment ref." className={INPUT} />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-44" />
          {can('buyer.view') && (
            <div className="w-44">
              <label className="block text-xs text-gray-500 mb-1">Customer</label>
              <select value={filters.buyer_id} onChange={(e) => setFilter('buyer_id', e.target.value)} className={INPUT}>
                <option value="">All</option>
                {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
              </select>
            </div>
          )}
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Order No.</label>
            <input type="text" value={filters.order} onChange={(e) => setFilter('order', e.target.value)} className={INPUT} />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(COMMERCIAL_STATUS_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">From</label>
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
                <th className="px-4 py-2 font-medium">PI No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium text-center">Lines</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading proforma invoices...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={8} icon="bi-file-earmark-text" title="No proforma invoices" message="Raise a proforma invoice from a confirmed order." />
              ) : rows.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2"><Link href={`/finance/proforma-invoices/${d.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{d.pi_no}</Link></td>
                  <td className="px-4 py-2"><CompanyBadge label={d.company_label} code={d.company_code} /></td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(d.pi_date)}</td>
                  <td className="px-4 py-2 text-gray-700">{d.buyer_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.oc_num}</td>
                  <td className="px-4 py-2 text-center">{d.lines_count}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{d.total_amount === null ? '—' : formatAmount(d.total_amount)} <span className="text-xs text-gray-500">{d.currency_code || ''}</span>{d.unpriced_lines_count > 0 && <div className="text-xs text-amber-700">{d.unpriced_lines_count} unpriced line(s)</div>}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={d.status} config={COMMERCIAL_STATUS_BADGES} />{d.payment_reference && <div className="text-xs text-gray-500">Payment ref. {d.payment_reference}</div>}</td>
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
