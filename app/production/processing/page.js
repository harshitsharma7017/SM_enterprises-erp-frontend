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
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={FIELDS}
          statuses={STATUSES}
          searchPlaceholder="Processing, issue, job reference or person"
        />
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Processing No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Material Issue</th>
                <th className="px-4 py-2 font-medium">Job Ref.</th>
                <th className="px-4 py-2 font-medium">Supervisor / Foreman</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium text-right">Produced</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Output Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading processing records...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-gear-wide-connected" title="No processing records" message="Start processing from an issued material issue." />
              ) : rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2"><Link href={`/production/processing/${p.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{p.processing_no}</Link></td>
                  <td className="px-4 py-2"><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                  <td className="px-4 py-2"><Link href={`/production/material-issues/${p.material_issue_id}`} className="font-mono text-xs text-blue-600 hover:underline">{p.issue_no}</Link></td>
                  <td className="px-4 py-2 text-gray-700">{p.job_reference || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-700">{p.supervisor_name || '—'} / {p.foreman_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(p.start_date)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{p.produced_quantity === null ? '—' : `${formatQuantity(p.produced_quantity, p.produced_uom_decimal_places)} ${p.produced_unit || ''}`}</td>
                  <td className="px-4 py-2"><WorkflowBadge status={p.status} config={PROCESSING_STATUS_BADGES} /></td>
                  <td className="px-4 py-2">
                    {p.output_posted_at ? <span className="font-mono text-xs">{p.output_lot_no}</span> : p.status === 'completed' ? <WorkflowBadge status="not_posted" config={OUTPUT_STATUS_BADGES} /> : <span className="text-gray-400 text-xs">—</span>}
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
