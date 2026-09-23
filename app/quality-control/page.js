'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, QC_STATUS_BADGES, qcBadgeStatus } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import SourceFilters, { EMPTY_SOURCE_FILTERS } from '@/components/quality/SourceFilters';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUSES = [['draft', 'Pending'], ['accepted', 'Accepted'], ['partially_accepted', 'Partially Accepted'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']];

export default function QualityControlListPage() {
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
      const res = await apiClient.get(`/quality-control?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch inspections');
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

  const Actions = can('inward-entry.approve') ? (
    <Link href="/quality-control/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> New Inspection
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Quality Control" breadcrumbs={[{ label: 'Procurement' }, { label: 'Quality Control' }]} />

      <Card title="Inspections of received lots" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <SourceFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_SOURCE_FILTERS); setPage(1); }}
          statuses={STATUSES}
          searchPlaceholder="QC, lot, GRN, PO, material or supplier"
        />

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">QC No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Lot / Material</th>
                <th className="px-4 py-2 font-medium">GRN / PO</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium text-right">Inspected</th>
                <th className="px-4 py-2 font-medium text-right">Accepted</th>
                <th className="px-4 py-2 font-medium text-right">Rejected</th>
                <th className="px-4 py-2 font-medium text-right">Returned</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-8 text-gray-500">Loading inspections...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={11} icon="bi-clipboard-check" title="No inspections" message="Inspect a lot once its goods receipt is posted." />
              ) : rows.map((q) => {
                const dp = q.uom_decimal_places;
                const qty = (v) => (v === null ? '—' : formatQuantity(v, dp));
                return (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2"><Link href={`/quality-control/${q.id}`} className="font-mono font-semibold text-gray-900 hover:text-blue-600">{q.qc_no}</Link></td>
                    <td className="px-4 py-2"><CompanyBadge label={q.company_label} code={q.company_code} /></td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(q.inspection_date)}</td>
                    <td className="px-4 py-2">
                      <div className="font-mono text-gray-800">{q.lot_no}</div>
                      <div className="text-xs text-gray-500">{q.product_name} · {formatQuantity(q.width_inch, 3)}&quot;</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{q.inward_no}<div>{q.po_num}</div></td>
                    <td className="px-4 py-2 text-gray-700">{q.supplier_name}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{qty(q.inspected_quantity)} <span className="text-xs text-gray-500">{q.unit}</span></td>
                    <td className="px-4 py-2 text-right text-green-700">{qty(q.accepted_quantity)}</td>
                    <td className="px-4 py-2 text-right text-red-700">{qty(q.rejected_quantity)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatQuantity(q.returned_quantity, dp)}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={qcBadgeStatus(q)} config={QC_STATUS_BADGES} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
