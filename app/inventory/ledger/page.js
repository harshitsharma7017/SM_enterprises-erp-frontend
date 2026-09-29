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
        {error && <div className="alert alert-danger">{error}</div>}

        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={FIELDS}
          searchPlaceholder="Movement, lot, material, QC or reason"
        />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Movement</th>
                <th>Company</th>
                <th>Date</th>
                <th>Type</th>
                <th>Lot / Material</th>
                <th>Location</th>
                <th>Source</th>
                <th className="text-right">In</th>
                <th className="text-right">Out</th>
                <th className="text-right">Lot balance</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" className="text-center">Loading movements...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={11} icon="bi-journal-text" title="No stock movements" message="Movements appear when inspections are posted to stock." />
              ) : rows.map((m) => {
                const dp = m.uom_decimal_places;
                return (
                  <tr key={m.id}>
                    <td><Link href={`/inventory/ledger/${m.id}`} className="font-mono font-semibold text-fg hover:text-link">{m.movement_no}</Link></td>
                    <td><CompanyBadge label={m.company_label} code={m.company_code} /></td>
                    <td className="whitespace-nowrap">{formatDate(m.movement_date)}</td>
                    <td>{STOCK_MOVEMENT_LABELS[m.movement_type]}</td>
                    <td>
                      <Link href={`/inventory/stock/${m.lot_id}`} className="font-mono text-link hover:underline">{m.lot_no}</Link>
                      <div className="text-xs text-fg-subtle">{m.product_name}</div>
                    </td>
                    <td className="font-mono">{m.location_code}</td>
                    <td>{m.qc_no ? <span className="font-mono">{m.qc_no}</span> : m.issue_no ? <Link href={`/production/material-issues/${m.material_issue_id}`} className="font-mono text-link hover:underline">{m.issue_no}</Link> : m.processing_no ? <Link href={`/production/processing/${m.processing_record_id}`} className="font-mono text-link hover:underline">{m.processing_no}</Link> : m.dispatch_no ? <Link href={`/dispatch/${m.dispatch_id}`} className="font-mono text-link hover:underline">{m.dispatch_no}</Link> : <span className="text-fg-muted">{m.reason}</span>}</td>
                    <td className="text-right text-green-700 whitespace-nowrap">{Number(m.quantity_in) > 0 ? `${formatQuantity(m.quantity_in, dp)} ${m.unit || ''}` : ''}</td>
                    <td className="text-right text-red-700 whitespace-nowrap">{Number(m.quantity_out) > 0 ? `${formatQuantity(m.quantity_out, dp)} ${m.unit || ''}` : ''}</td>
                    <td className="text-right">{formatQuantity(m.balance_after, dp)}</td>
                    <td>{m.creator_name || '—'}<div>{formatDateTime(m.created_at)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">Lot balance is the running balance of that lot at that location after the movement.</p>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
