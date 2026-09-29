'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, INWARD_STATUS_BADGES, PO_STATUS_BADGES } from '@/components/ui/Badge';
import QcPanel from '@/components/procurement/inward-entries/QcPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime } from '@/components/sales/shared/format';

export default function InwardEntryShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [entry, setEntry] = useState(null);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/procurement/inward-entries/${id}`);
      // This page is kept for legacy inward entries; goods receipts have their own page.
      if (res.success && res.data?.entry_type === 'grn') {
        router.replace(`/procurement/grn/${id}`);
        return;
      }
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
  }, [id, router]);

  useEffect(() => {
    queueMicrotask(fetchEntry);
  }, [fetchEntry]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-fg-subtle">Loading Goods Inward entry...</div>
      </DashboardLayout>
    );
  }

  if (error || !entry) {
    return (
      <DashboardLayout>
        <div className="alert alert-danger">{error || 'Goods Inward entry not found'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeading
        title={entry.inward_no}
        breadcrumbs={[{ label: 'Goods Receipts', href: '/procurement/grn' }, { label: `${entry.inward_no} (legacy inward)` }]}
        actions={(
          <>
            <Link href="/procurement/grn" className="border border-line-strong px-3 py-1.5 rounded text-sm text-fg-muted hover:bg-surface-hover">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-surface border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle">Inward Number</dt><dd className="mt-0.5 font-mono font-semibold text-fg">{entry.inward_no}</dd></div>
          <div><dt className="text-fg-subtle">Inward Date</dt><dd className="mt-0.5 text-fg">{formatDate(entry.inward_date)}</dd></div>
          <div><dt className="text-fg-subtle">Status</dt><dd className="mt-0.5"><WorkflowBadge status={entry.status} config={INWARD_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle">Challan / DC No.</dt><dd className="mt-0.5 text-fg">{entry.challan_no || '—'}{entry.challan_date ? ` (${formatDate(entry.challan_date)})` : ''}</dd></div>
        </dl>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-raised border rounded p-3">
          <div className="text-xs font-semibold text-fg-subtle mb-1">Purchase Order Reference</div>
          {entry.purchase_order_id ? (
            <>
              <Link href={`/procurement/purchase-orders/${entry.purchase_order_id}`} className="font-mono text-link hover:underline text-sm">{entry.purchase_order_num || `#${entry.purchase_order_id}`}</Link>
              {po && (
                <div className="text-xs text-fg-muted mt-1">
                  {formatDate(po.po_date)} · <WorkflowBadge status={po.status} config={PO_STATUS_BADGES} />
                </div>
              )}
            </>
          ) : <span className="text-sm text-fg-subtle">—</span>}
        </div>
        <div className="bg-surface-raised border rounded p-3">
          <div className="text-xs font-semibold text-fg-subtle mb-1">Supplier</div>
          <div className="text-sm text-fg">{entry.supplier_name || '—'}</div>
        </div>
      </div>

      {entry.remarks && (
        <div className="bg-surface-raised border rounded p-3 mb-4">
          <div className="text-xs font-semibold text-fg-subtle mb-1">Receipt Remarks</div>
          <div className="text-sm text-fg whitespace-pre-wrap">{entry.remarks}</div>
        </div>
      )}

      <div className="bg-surface border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-surface-raised px-4 py-2.5 border-b font-semibold text-sm text-fg-muted">Delivered &amp; Inspected Items</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product / Description</th>
                <th>Unit</th>
                <th className="text-right">Ordered</th>
                <th className="text-right">Received</th>
                <th className="text-right">Passed</th>
                <th className="text-right">Rejected</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(entry.items || []).map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td className="cell-strong">
                    {item.product_name || item.design_no || '—'}
                    {item.description && <div className="text-xs text-fg-subtle">{item.description}</div>}
                  </td>
                  <td className="text-fg-muted">{item.unit || '—'}</td>
                  <td className="text-right text-fg-muted">{item.ordered_qty}</td>
                  <td className="text-right cell-strong">{item.received_qty}</td>
                  <td className="text-right text-green-700 font-semibold">{item.passed_qty}</td>
                  <td className="text-right text-red-700 font-semibold">{item.rejected_qty}</td>
                  <td className="text-fg-muted">
                    {item.remarks || '—'}
                    {item.qc_remarks && <div className="text-xs text-[var(--danger)]"><strong>QC:</strong> {item.qc_remarks}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QcPanel entry={entry} can={can} onQcDone={fetchEntry} />

      <div className="text-xs text-fg-subtle">
        Created {formatDateTime(entry.created_at)}{entry.creator_name ? ` by ${entry.creator_name}` : ''} · Last updated {formatDateTime(entry.updated_at)}
      </div>
    </DashboardLayout>
  );
}
