'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, LOT_STATUS_BADGES, LOT_SOURCE_LABELS } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const EMPTY_FILTERS = { search: '', company_id: '', status: '', source_type: '' };
const QC_STATE_LABELS = { not_inspected: 'Not inspected', partially_inspected: 'Partly inspected', inspected: 'Inspected' };

export default function LotsPage() {
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
      const res = await apiClient.get(`/procurement/lots?${params.toString()}`);
      if (res.success) {
        setRows(res.data.data || []);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch lots');
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
      <PageHeading title="Lots" breadcrumbs={[{ label: 'Procurement' }, { label: 'Lots' }]} />

      <Card title="Lots (received on a goods receipt, or finished material posted from production)" variant="primary">
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Lot, mill lot, material, PO or GRN" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="form-select">
              <option value="">All</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Source</label>
            <select value={filters.source_type} onChange={(e) => setFilter('source_type', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(LOT_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
                <th>Lot No.</th>
                <th>Company</th>
                <th>Material</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Width (inch)</th>
                <th>Mill Lot</th>
                <th>Source (GRN / PO or production)</th>
                <th>Supplier</th>
                <th>Received</th>
                <th>QC</th>
                <th className="text-right">Usable Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" className="text-center">Loading lots...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={12} icon="bi-stack" title="No lots yet" message="Lots are created when a goods receipt is posted." />
              ) : rows.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/procurement/lots/${l.id}`} className="font-mono font-semibold text-fg hover:text-link">{l.lot_no}</Link></td>
                  <td><CompanyBadge label={l.company_label} code={l.company_code} /></td>
                  <td className="cell-strong">{l.product_name}</td>
                  <td className="text-right whitespace-nowrap">{formatQuantity(l.quantity, l.uom_decimal_places)} {l.unit}</td>
                  <td className="text-right">{l.width_inch === null ? '—' : formatQuantity(l.width_inch, 3)}</td>
                  <td className="text-fg-muted">{l.supplier_lot_no || '—'}</td>
                  <td className="font-mono text-fg-muted">
                    {l.source_type === 'opening' ? (
                      <span className="font-sans">Opening stock</span>
                    ) : l.source_type === 'production' ? (
                      <span className="font-sans">Produced · <span className="font-mono">{l.processing_no}</span></span>
                    ) : (
                      <>
                        <Link href={`/procurement/grn/${l.inward_entry_id}`} className="hover:text-link">{l.inward_no}</Link>
                        <div>{l.po_num}</div>
                      </>
                    )}
                  </td>
                  <td className="text-fg-muted">{l.supplier_name || '—'}</td>
                  <td>{formatDate(l.received_date)}</td>
                  <td className="whitespace-nowrap">
                    <div className="text-fg-muted">{QC_STATE_LABELS[l.qc_state]}</div>
                    {Number(l.qc_inspected_quantity) > 0 && (
                      <div className="text-fg-subtle"><span className="text-green-700">{formatQuantity(l.qc_accepted_quantity, l.uom_decimal_places)}</span> / <span className="text-red-700">{formatQuantity(l.qc_rejected_quantity, l.uom_decimal_places)}</span></div>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">{formatQuantity(l.stock_quantity, l.uom_decimal_places)}</td>
                  <td><WorkflowBadge status={l.status} config={LOT_STATUS_BADGES} /></td>
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
