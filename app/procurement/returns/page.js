'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, POSTING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import SourceFilters, { EMPTY_SOURCE_FILTERS } from '@/components/quality/SourceFilters';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUSES = [['draft', 'Draft'], ['posted', 'Posted'], ['cancelled', 'Cancelled']];

export default function SupplierReturnsPage() {
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
      const res = await apiClient.get(`/procurement/supplier-returns?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch supplier returns');
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

  const Actions = can('supplier-return.create') ? (
    <Link href="/procurement/returns/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Return
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Supplier Returns" breadcrumbs={[{ label: 'Procurement' }, { label: 'Supplier Returns' }]} />

      <Card title="QC-rejected material returned to suppliers" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <SourceFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_SOURCE_FILTERS); setPage(1); }}
          statuses={STATUSES}
          searchPlaceholder="Return, QC, lot, GRN, PO or supplier"
        />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Return No.</th>
                <th>Company</th>
                <th>Date</th>
                <th>QC / Lot</th>
                <th>GRN / PO</th>
                <th>Supplier</th>
                <th>Material</th>
                <th className="text-right">Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center">Loading returns...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-box-arrow-up" title="No supplier returns" message="Returns are raised from the rejected quantity of a completed inspection." />
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/procurement/returns/${r.id}`} className="font-mono font-semibold text-fg hover:text-link">{r.return_no}</Link></td>
                  <td><CompanyBadge label={r.company_label} code={r.company_code} /></td>
                  <td className="whitespace-nowrap">{formatDate(r.return_date)}</td>
                  <td className="font-mono text-fg-muted">{r.qc_no}<div>{r.lot_no}</div></td>
                  <td className="font-mono text-fg-muted">{r.inward_no}<div>{r.po_num}</div></td>
                  <td className="text-fg-muted">{r.supplier_name}</td>
                  <td className="text-fg-muted">{r.product_name}</td>
                  <td className="text-right whitespace-nowrap">{formatQuantity(r.quantity, r.uom_decimal_places)} <span className="text-xs text-fg-subtle">{r.unit}</span></td>
                  <td><WorkflowBadge status={r.status} config={POSTING_STATUS_BADGES} /></td>
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
