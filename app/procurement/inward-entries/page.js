'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, INWARD_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

export default function InwardEntriesPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pos, setPos] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [poFilter, setPoFilter] = useState('');
  const [page, setPage] = useState(1);

  // The Goods Inward list endpoint only supports `status` and
  // `purchase_order_id` query filters — no `search` or `supplier_id` (see
  // Phase 4B report §7), unlike every other list page in this app.
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (poFilter) params.append('purchase_order_id', poFilter);
      params.append('page', page);

      const res = await apiClient.get(`/procurement/inward-entries?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, limit: 15 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Goods Inward entries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, poFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchEntries);
  }, [statusFilter, poFilter, page]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/procurement/purchase-orders?limit=200');
        if (res.success) setPos(res.data || []);
      } catch (err) {
        console.error('Failed to load POs for filter', err);
      }
    });
  }, []);

  const handleReset = () => {
    setStatusFilter('');
    setPoFilter('');
    setPage(1);
  };

  const deleteEntry = async (id, inwardNo) => {
    if (!confirm(`Delete Goods Inward "${inwardNo}"? This will recalculate the Purchase Order status.`)) return;
    try {
      await apiClient.delete(`/procurement/inward-entries/${id}`);
      fetchEntries();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete Goods Inward entry');
    }
  };

  const pagination = toPaginationFromMeta(meta, meta.limit);

  return (
    <DashboardLayout>
      <PageHeading
        title="Goods Inward"
        actions={can('inward-entry.create') && (
          <Link href="/procurement/inward-entries/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> New Receipt
          </Link>
        )}
      />

      <Card title="Goods Inward" variant="primary">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-64">
            <label className="block text-xs text-gray-500 mb-1">Purchase Order</label>
            <select value={poFilter} onChange={(e) => { setPoFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All POs</option>
              {pos.map((p) => <option key={p.id} value={p.id}>{p.po_num}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{INWARD_STATUS_BADGES[s].label}</option>)}
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
                <th className="px-4 py-2 font-medium">Inward No.</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">PO Reference</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Challan No.</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading Goods Inward entries...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-box-arrow-in-down" title="No Goods Inward receipts recorded" message="Record incoming goods delivered by suppliers against a Purchase Order." />
              ) : (
                rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{entry.inward_no}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(entry.inward_date)}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {entry.purchase_order_id ? (
                        <Link href={`/procurement/purchase-orders/${entry.purchase_order_id}`} className="font-mono text-blue-600 hover:underline">{entry.purchase_order_num || `#${entry.purchase_order_id}`}</Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{entry.supplier_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{entry.challan_no || '—'}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={entry.status} config={INWARD_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {can('inward-entry.view') && (
                          <Link href={`/procurement/inward-entries/${entry.id}`} className="text-gray-500 hover:text-gray-900" title="View & QC"><i className="bi bi-eye"></i></Link>
                        )}
                        {can('inward-entry.edit') && entry.status === 'pending' && (
                          <Link href={`/procurement/inward-entries/${entry.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Edit"><i className="bi bi-pencil"></i></Link>
                        )}
                        {can('inward-entry.delete') && (
                          <button onClick={() => deleteEntry(entry.id, entry.inward_no)} className="text-red-600 hover:text-red-900" title="Delete"><i className="bi bi-trash"></i></button>
                        )}
                      </div>
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
