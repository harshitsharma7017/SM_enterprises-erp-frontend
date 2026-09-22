'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, INWARD_STATUS_BADGES, PO_STATUS_BADGES } from '@/components/ui/Badge';
import QcPanel from '@/components/procurement/inward-entries/QcPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime } from '@/components/sales/shared/format';

export default function InwardEntryShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [entry, setEntry] = useState(null);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/procurement/inward-entries/${id}`);
      if (res.success) {
        setEntry(res.data);
        if (res.data.purchase_order_id) {
          try {
            const poRes = await apiClient.get(`/procurement/purchase-orders/${res.data.purchase_order_id}`);
            if (poRes.success) setPo(poRes.data);
          } catch (e) { /* not fatal */ }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load Goods Inward entry');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchEntry);
  }, [fetchEntry]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading Goods Inward entry...</div>
      </DashboardLayout>
    );
  }

  if (error || !entry) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Goods Inward entry not found'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeading
        title={entry.inward_no}
        breadcrumbs={[{ label: 'Goods Inward', href: '/procurement/inward-entries' }, { label: entry.inward_no }]}
        actions={(
          <>
            {can('inward-entry.edit') && entry.status === 'pending' && (
              <Link href={`/procurement/inward-entries/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit Receipt
              </Link>
            )}
            <Link href="/procurement/inward-entries" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Inward Number</dt><dd className="mt-0.5 font-mono font-semibold text-gray-900">{entry.inward_no}</dd></div>
          <div><dt className="text-gray-500">Inward Date</dt><dd className="mt-0.5 text-gray-900">{formatDate(entry.inward_date)}</dd></div>
          <div><dt className="text-gray-500">Status</dt><dd className="mt-0.5"><WorkflowBadge status={entry.status} config={INWARD_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500">Challan / DC No.</dt><dd className="mt-0.5 text-gray-900">{entry.challan_no || '—'}{entry.challan_date ? ` (${formatDate(entry.challan_date)})` : ''}</dd></div>
        </dl>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Purchase Order Reference</div>
          {entry.purchase_order_id ? (
            <>
              <Link href={`/procurement/purchase-orders/${entry.purchase_order_id}`} className="font-mono text-blue-600 hover:underline text-sm">{entry.purchase_order_num || `#${entry.purchase_order_id}`}</Link>
              {po && (
                <div className="text-xs text-gray-600 mt-1">
                  {formatDate(po.po_date)} · <WorkflowBadge status={po.status} config={PO_STATUS_BADGES} />
                </div>
              )}
            </>
          ) : <span className="text-sm text-gray-500">—</span>}
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Supplier</div>
          <div className="text-sm text-gray-900">{entry.supplier_name || '—'}</div>
        </div>
      </div>

      {entry.remarks && (
        <div className="bg-gray-50 border rounded p-3 mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Receipt Remarks</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{entry.remarks}</div>
        </div>
      )}

      <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700">Delivered &amp; Inspected Items</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Product / Description</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium text-right">Ordered</th>
                <th className="px-3 py-2 font-medium text-right">Received</th>
                <th className="px-3 py-2 font-medium text-right">Passed</th>
                <th className="px-3 py-2 font-medium text-right">Rejected</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(entry.items || []).map((item, i) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-900">
                    {item.product_name || item.design_no || '—'}
                    {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{item.ordered_qty}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{item.received_qty}</td>
                  <td className="px-3 py-2 text-right text-green-700 font-semibold">{item.passed_qty}</td>
                  <td className="px-3 py-2 text-right text-red-700 font-semibold">{item.rejected_qty}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {item.remarks || '—'}
                    {item.qc_remarks && <div className="text-xs text-red-600"><strong>QC:</strong> {item.qc_remarks}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QcPanel entry={entry} can={can} onQcDone={fetchEntry} />

      <div className="text-xs text-gray-400">
        Created {formatDateTime(entry.created_at)}{entry.creator_name ? ` by ${entry.creator_name}` : ''} · Last updated {formatDateTime(entry.updated_at)}
      </div>
    </DashboardLayout>
  );
}
