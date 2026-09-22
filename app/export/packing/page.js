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
        <p className="text-sm text-gray-500 mb-4">
          Carton-wise packing for each shipment. Record cartons on the Export Document edit screen, then
          generate Packing List formats from here.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Export Doc</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium text-right">Cartons</th>
                <th className="px-4 py-2 font-medium text-right">Net (kg)</th>
                <th className="px-4 py-2 font-medium text-right">Gross (kg)</th>
                <th className="px-4 py-2 font-medium text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading Packing Desk...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-boxes" title="No shipments to pack yet" message="Raise an Export Document from a confirmed Order Confirmation first." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{doc.doc_num}</td>
                    <td className="px-4 py-2 text-gray-700">{doc.buyer_name || '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{doc.total_cartons ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{doc.net_weight != null ? formatAmount(doc.net_weight) : '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{doc.gross_weight != null ? formatAmount(doc.gross_weight) : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      {can('packing.view') && (
                        <Link href={`/export/packing/${doc.id}`} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-1 rounded">
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
