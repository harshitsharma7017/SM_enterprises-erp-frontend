'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PO_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';

/**
 * Supplier Payments — mirrors the original ERP's
 * finance/supplier-payments/index.blade.php exactly: a payables view over
 * Purchase Orders with each PO's totalAmount() as the payable amount.
 */
export default function SupplierPaymentsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 20, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/finance/supplier-payments?page=${page}&limit=20`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 20, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to fetch Supplier Payments');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [page]);

  const pagination = toPaginationFromCurrentPageMeta(meta);

  return (
    <DashboardLayout>
      <PageHeading title="Supplier Payments" />

      <Card title="Supplier Payments Tracker" variant="primary">
        <p className="text-sm text-gray-500 mb-4">
          Payables view from raised purchase orders. Use this for supplier payment planning during demo.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">PO No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Payable Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500">Loading Supplier Payments...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={4} icon="bi-cash-coin" title="No purchase orders found" message="Raise a Purchase Order to see it here." />
              ) : (
                rows.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{po.po_num}</td>
                    <td className="px-4 py-2 text-gray-700">{po.supplier_name || '—'}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatAmount(po.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
