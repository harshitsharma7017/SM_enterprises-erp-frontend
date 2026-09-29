'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, POSTING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import SourceFilters, { EMPTY_SOURCE_FILTERS } from '@/components/quality/SourceFilters';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount, formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const STATUSES = [['draft', 'Draft'], ['posted', 'Posted'], ['cancelled', 'Cancelled']];

/** Debit notes raised against suppliers for QC-rejected (and returned) material. */
export default function DebitNotesPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_SOURCE_FILTERS);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/finance/debit-notes?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch debit notes');
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

  const Actions = can('debit-note.create') ? (
    <Link href="/finance/debit-notes/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Debit Note
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Debit Notes" breadcrumbs={[{ label: 'Finance' }, { label: 'Debit Notes' }]} />

      <Card title="Debit notes for rejected / returned material" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <SourceFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_SOURCE_FILTERS); setPage(1); }}
          statuses={STATUSES}
          searchPlaceholder="Debit note, QC, return, lot, GRN, PO or supplier"
          showLot={false}
        />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Debit Note</th>
                <th>Company</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>PO / GRN</th>
                <th>QC / Return</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center">Loading debit notes...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-file-earmark-minus" title="No debit notes" message="Debit notes are raised from rejected material of a completed inspection." />
              ) : rows.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/finance/debit-notes/${d.id}`} className="font-mono font-semibold text-fg hover:text-link">{d.debit_note_no}</Link></td>
                  <td><CompanyBadge label={d.company_label} code={d.company_code} /></td>
                  <td className="whitespace-nowrap">{formatDate(d.debit_note_date)}</td>
                  <td className="text-fg-muted">{d.supplier_name}</td>
                  <td className="font-mono text-fg-muted">{d.po_num}<div>{d.inward_no}</div></td>
                  <td className="font-mono text-fg-muted">{d.qc_no}<div>{d.return_no || '—'}</div></td>
                  <td className="text-right whitespace-nowrap">{formatQuantity(d.quantity, d.uom_decimal_places)} <span className="text-xs text-fg-subtle">{d.unit}</span></td>
                  <td className="text-right cell-strong">{d.amount === null ? '—' : formatAmount(d.amount)}</td>
                  <td><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
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
