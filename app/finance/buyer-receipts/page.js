'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, CHECKLIST_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';

/**
 * Buyer Receipts — mirrors the original ERP's finance/buyer-receipts/index.blade.php
 * exactly: a receivables view over Export Documents with each doc's
 * totalAmount() as Invoice Value, plus its Payment Received (Swift Copy)
 * and eBRC checklist statuses.
 */
export default function BuyerReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 20, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/finance/buyer-receipts?page=${page}&limit=20`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 20, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to fetch Buyer Receipts');
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
      <PageHeading title="Buyer Receipts" />

      <Card title="Buyer Receipts Tracker" variant="primary">
        <p className="text-sm text-gray-500 mb-4">
          Receivables view from Export Documents, with payment checklist progress.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Export Doc</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium text-right">Invoice Value</th>
                <th className="px-4 py-2 font-medium">Payment Proof</th>
                <th className="px-4 py-2 font-medium">eBRC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading Buyer Receipts...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={5} icon="bi-currency-exchange" title="No export documents found" message="Raise an Export Document to see it here." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{doc.doc_num}</td>
                    <td className="px-4 py-2 text-gray-700">{doc.buyer_name || '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatAmount(doc.total_amount)}</td>
                    <td className="px-4 py-2">
                      {doc.payment_status ? <WorkflowBadge status={doc.payment_status} config={CHECKLIST_STATUS_BADGES} /> : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {doc.ebrc_status ? <WorkflowBadge status={doc.ebrc_status} config={CHECKLIST_STATUS_BADGES} /> : '—'}
                    </td>
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
