'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { STOCK_MOVEMENT_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const EMPTY_FILTERS = { search: '', company_id: '', product_id: '', location_id: '', lot: '', movement_type: '', source: '', date_from: '', date_to: '' };
const FIELDS = ['product_id', 'location_id', 'lot', 'movement_type', 'source', 'dates'];

/** The stock ledger: every posted (immutable) movement, newest first, with the lot/location running balance. */
export default function StockLedgerPage() {
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 25 });
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
      params.append('limit', 25);
      const res = await apiClient.get(`/inventory/ledger?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch the stock ledger');
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

  return (
    <DashboardLayout>
      <PageHeading title="Stock Ledger" breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Ledger' }]} />

      <Card title="Stock movements (posted movements are never edited)" variant="primary">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={FIELDS}
          searchPlaceholder="Movement, lot, material, QC or reason"
        />

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-medium">Movement</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Lot / Material</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium text-right">In</th>
                <th className="px-3 py-2 font-medium text-right">Out</th>
                <th className="px-3 py-2 font-medium text-right">Lot balance</th>
                <th className="px-3 py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-8 text-gray-500">Loading movements...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={11} icon="bi-journal-text" title="No stock movements" message="Movements appear when inspections are posted to stock." />
              ) : rows.map((m) => {
                const dp = m.uom_decimal_places;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><Link href={`/inventory/ledger/${m.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{m.movement_no}</Link></td>
                    <td className="px-3 py-2"><CompanyBadge label={m.company_label} code={m.company_code} /></td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(m.movement_date)}</td>
                    <td className="px-3 py-2">{STOCK_MOVEMENT_LABELS[m.movement_type]}</td>
                    <td className="px-3 py-2">
                      <Link href={`/inventory/stock/${m.lot_id}`} className="font-mono text-blue-600 hover:underline">{m.lot_no}</Link>
                      <div className="text-xs text-gray-500">{m.product_name}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.location_code}</td>
                    <td className="px-3 py-2 text-xs">{m.qc_no ? <span className="font-mono">{m.qc_no}</span> : m.issue_no ? <Link href={`/production/material-issues/${m.material_issue_id}`} className="font-mono text-blue-600 hover:underline">{m.issue_no}</Link> : m.processing_no ? <Link href={`/production/processing/${m.processing_record_id}`} className="font-mono text-blue-600 hover:underline">{m.processing_no}</Link> : m.dispatch_no ? <Link href={`/dispatch/${m.dispatch_id}`} className="font-mono text-blue-600 hover:underline">{m.dispatch_no}</Link> : <span className="text-gray-700">{m.reason}</span>}</td>
                    <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{Number(m.quantity_in) > 0 ? `${formatQuantity(m.quantity_in, dp)} ${m.unit || ''}` : ''}</td>
                    <td className="px-3 py-2 text-right text-red-700 whitespace-nowrap">{Number(m.quantity_out) > 0 ? `${formatQuantity(m.quantity_out, dp)} ${m.unit || ''}` : ''}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatQuantity(m.balance_after, dp)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{m.creator_name || '—'}<div>{formatDateTime(m.created_at)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">Lot balance is the running balance of that lot at that location after the movement.</p>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
