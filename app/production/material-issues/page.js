'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, MATERIAL_ISSUE_STATUS_BADGES, PROCESSING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const EMPTY_FILTERS = { search: '', company_id: '', status: '', location_id: '', product_id: '', lot: '', date_from: '', date_to: '' };
const FIELDS = ['product_id', 'location_id', 'lot', 'dates'];
const STATUSES = [['draft', 'Draft'], ['issued', 'Issued'], ['cancelled', 'Cancelled']];

export default function MaterialIssuesPage() {
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
      const res = await apiClient.get(`/production/material-issues?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch material issues');
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

  const Actions = can('material-issue.create') ? (
    <Link href="/production/material-issues/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Material Issue
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Material Issues" breadcrumbs={[{ label: 'Production' }, { label: 'Material Issues' }]} />
      <Card title="Store → Supervisor / Cutting" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}
        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={FIELDS}
          statuses={STATUSES}
          searchPlaceholder="Issue, job reference, person, lot or material"
        />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue No.</th>
                <th>Company</th>
                <th>Date</th>
                <th>Location</th>
                <th>Job Ref.</th>
                <th>Receiver / Supervisor / Foreman</th>
                <th className="text-center">Lots</th>
                <th>Status</th>
                <th>Processing</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center">Loading material issues...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-box-arrow-right" title="No material issues" message="Issue usable stock to a supervisor / cutting." />
              ) : rows.map((mi) => (
                <tr key={mi.id}>
                  <td><Link href={`/production/material-issues/${mi.id}`} className="font-mono font-semibold text-fg hover:text-link">{mi.issue_no}</Link></td>
                  <td><CompanyBadge label={mi.company_label} code={mi.company_code} /></td>
                  <td className="whitespace-nowrap">{formatDate(mi.issue_date)}</td>
                  <td className="font-mono">{mi.location_code}</td>
                  <td className="text-fg-muted">{mi.job_reference || '—'}</td>
                  <td className="text-fg-muted">{mi.receiver_name || '—'} / {mi.supervisor_name || '—'} / {mi.foreman_name || '—'}</td>
                  <td className="text-center">{mi.lines_count}</td>
                  <td><WorkflowBadge status={mi.status} config={MATERIAL_ISSUE_STATUS_BADGES} /></td>
                  <td>
                    {mi.processing_record_id ? (
                      <Link href={`/production/processing/${mi.processing_record_id}`} className="inline-flex items-center gap-1">
                        <span className="font-mono text-xs text-link">{mi.processing_no}</span>
                        <WorkflowBadge status={mi.processing_status} config={PROCESSING_STATUS_BADGES} />
                      </Link>
                    ) : <span className="text-fg-subtle text-xs">—</span>}
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
