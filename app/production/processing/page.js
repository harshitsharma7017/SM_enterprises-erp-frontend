'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PROCESSING_STATUS_BADGES, OUTPUT_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const EMPTY_FILTERS = { search: '', company_id: '', status: '', location_id: '', product_id: '', lot: '', date_from: '', date_to: '' };
const FIELDS = ['product_id', 'location_id', 'lot', 'dates'];
const STATUSES = [['in_process', 'In Process'], ['completed', 'Completed']];

/** Processing records (Supervisor/Cutting → Foreman) — one per issued material issue. */
export default function ProcessingListPage() {
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
      const res = await apiClient.get(`/production/processing?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch processing records');
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
      <PageHeading title="Processing" breadcrumbs={[{ label: 'Production' }, { label: 'Processing' }]} />
      <Card title="Processing of issued material (start one from an issued material issue)" variant="primary">
        {error && <div className="alert alert-danger">{error}</div>}
        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={FIELDS}
          statuses={STATUSES}
          searchPlaceholder="Processing, issue, job reference or person"
        />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Processing No.</th>
                <th>Company</th>
                <th>Material Issue</th>
                <th>Job Ref.</th>
                <th>Supervisor / Foreman</th>
                <th>Started</th>
                <th className="text-right">Produced</th>
                <th>Status</th>
                <th>Output Stock</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center">Loading processing records...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-gear-wide-connected" title="No processing records" message="Start processing from an issued material issue." />
              ) : rows.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/production/processing/${p.id}`} className="font-mono font-semibold text-fg hover:text-link">{p.processing_no}</Link></td>
                  <td><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                  <td><Link href={`/production/material-issues/${p.material_issue_id}`} className="font-mono text-xs text-link hover:underline">{p.issue_no}</Link></td>
                  <td className="text-fg-muted">{p.job_reference || '—'}</td>
                  <td className="text-fg-muted">{p.supervisor_name || '—'} / {p.foreman_name || '—'}</td>
                  <td className="whitespace-nowrap">{formatDate(p.start_date)}</td>
                  <td className="text-right whitespace-nowrap">{p.produced_quantity === null ? '—' : `${formatQuantity(p.produced_quantity, p.produced_uom_decimal_places)} ${p.produced_unit || ''}`}</td>
                  <td><WorkflowBadge status={p.status} config={PROCESSING_STATUS_BADGES} /></td>
                  <td>
                    {p.output_posted_at ? <span className="font-mono text-xs">{p.output_lot_no}</span> : p.status === 'completed' ? <WorkflowBadge status="not_posted" config={OUTPUT_STATUS_BADGES} /> : <span className="text-fg-subtle text-xs">—</span>}
                  </td>
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
