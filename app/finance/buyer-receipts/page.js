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
        <p className="text-sm text-fg-subtle mb-4">
          Receivables view from Export Documents, with payment checklist progress.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Export Doc</th>
                <th>Buyer</th>
                <th className="text-right">Invoice Value</th>
                <th>Payment Proof</th>
                <th>eBRC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">Loading Buyer Receipts...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={5} icon="bi-currency-exchange" title="No export documents found" message="Raise an Export Document to see it here." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-mono cell-strong">{doc.doc_num}</td>
                    <td className="text-fg-muted">{doc.buyer_name || '—'}</td>
                    <td className="text-right cell-strong">{formatAmount(doc.total_amount)}</td>
                    <td>
                      {doc.payment_status ? <WorkflowBadge status={doc.payment_status} config={CHECKLIST_STATUS_BADGES} /> : '—'}
                    </td>
                    <td>
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
