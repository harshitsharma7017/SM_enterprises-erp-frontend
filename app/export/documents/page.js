'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, EXPORT_DOC_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['draft', 'in_progress', 'closed'];

export default function ExportDocumentsPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyers, setBuyers] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [page, setPage] = useState(1);

  // The Export Document list endpoint only supports `status` and `buyer_id`
  // filters — no `search` (see Phase 5A report), unlike Inquiry/OC/PO lists.
  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (buyerFilter) params.append('buyer_id', buyerFilter);
      params.append('page', page);

      const res = await apiClient.get(`/export/documents?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, limit: 15 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Export Documents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, buyerFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchDocs);
  }, [statusFilter, buyerFilter, page]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/masters/buyers?status=active&limit=1000');
        if (res.success) setBuyers(res.data.data || []);
      } catch (err) {
        console.error('Failed to load buyers for filter', err);
      }
    });
  }, []);

  const handleReset = () => {
    setStatusFilter('');
    setBuyerFilter('');
    setPage(1);
  };

  const pagination = toPaginationFromMeta(meta, meta.limit);

  return (
    <DashboardLayout>
      <PageHeading title="Export Documents" />

      <Card title="Export Documents" variant="primary">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-64">
            <label className="block text-xs text-gray-500 mb-1">Buyer</label>
            <select value={buyerFilter} onChange={(e) => { setBuyerFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All Buyers</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{EXPORT_DOC_STATUS_BADGES[s].label}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Reset
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Doc No.</th>
                <th className="px-4 py-2 font-medium">OC No.</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium">Shipment Date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading Export Documents...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-files" title="No Export Documents yet" message="Raise one from a confirmed Order Confirmation's item list." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{doc.doc_num}</td>
                    <td className="px-4 py-2 text-gray-700">{doc.order_confirmation_num || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{doc.buyer_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{doc.shipment_date ? formatDate(doc.shipment_date) : '—'}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={doc.status} config={EXPORT_DOC_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-right">
                      {can('export-document.view') && (
                        <Link href={`/export/documents/${doc.id}`} className="text-gray-500 hover:text-gray-900" title="View"><i className="bi bi-eye"></i></Link>
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
