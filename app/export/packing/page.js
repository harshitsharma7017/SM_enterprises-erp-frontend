'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

/**
 * "Packing Desk" — read-only worklist over Export Documents for the
 * dedicated Packing role (permission `packing.view`, no `export-document.*`
 * grants). Mirrors the original ERP's export/packing/index.blade.php
 * exactly: no create button (PackingController has no store route), and no
 * search — GET /api/export/packing only accepts page/limit, unlike every
 * other list endpoint in this app (see Phase 5B report).
 */
export default function PackingDeskPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/export/packing?page=${page}`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 15, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to fetch Packing Desk');
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
      <PageHeading title="Packing" />

      <Card title="Packing Desk" variant="primary">
        <p className="text-sm text-fg-subtle mb-4">
          Carton-wise packing for each shipment. Record cartons on the Export Document edit screen, then
          generate Packing List formats from here.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Export Doc</th>
                <th>Buyer</th>
                <th className="text-right">Cartons</th>
                <th className="text-right">Net (kg)</th>
                <th className="text-right">Gross (kg)</th>
                <th className="text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading Packing Desk...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-boxes" title="No shipments to pack yet" message="Raise an Export Document from a confirmed Order Confirmation first." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-mono cell-strong">{doc.doc_num}</td>
                    <td className="text-fg-muted">{doc.buyer_name || '—'}</td>
                    <td className="text-right cell-strong">{doc.total_cartons ?? '—'}</td>
                    <td className="text-right text-fg-muted">{doc.net_weight != null ? formatAmount(doc.net_weight) : '—'}</td>
                    <td className="text-right text-fg-muted">{doc.gross_weight != null ? formatAmount(doc.gross_weight) : '—'}</td>
                    <td className="text-right">
                      {can('packing.view') && (
                        <Link href={`/export/packing/${doc.id}`} className="text-xs bg-surface-raised hover:bg-gray-200 text-fg-muted border border-line-strong px-2 py-1 rounded">
                          <i className="bi bi-boxes me-1"></i>Pack
                        </Link>
                      )}
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
