'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, GRN_STATUS_BADGES, LOT_STATUS_BADGES, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';
import DocumentButton from '@/components/ui/DocumentButton';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function GrnShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchGrn = useCallback(async () => {
    try {
      const res = await apiClient.get(`/procurement/inward-entries/${id}`);
      if (res.data?.entry_type === 'legacy_inward') {
        router.replace(`/procurement/inward-entries/${id}`);
        return;
      }
      setGrn(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load goods receipt');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    queueMicrotask(fetchGrn);
  }, [fetchGrn]);

  const run = async (action, confirmText) => {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/procurement/inward-entries/${id}/${action}`);
      setNotice(res.message || null);
      await fetchGrn();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete draft ${grn.inward_no}?`)) return;
    try {
      await apiClient.delete(`/procurement/inward-entries/${id}`);
      router.push('/procurement/grn');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading goods receipt...</div></DashboardLayout>;
  if (!grn) return <DashboardLayout><div className="alert alert-danger">{error || 'Goods receipt not found'}</div></DashboardLayout>;

  const isDraft = grn.receipt_status === 'draft';
  const trace = grn.trace || {};

  return (
    <DashboardLayout>
      <PageHeading
        title={grn.inward_no}
        breadcrumbs={[{ label: 'Goods Receipts', href: '/procurement/grn' }, { label: grn.inward_no }]}
        actions={(
          <>
            <DocumentButton endpoint={`/procurement/inward-entries/${id}/document`} number={grn.inward_no} onError={setError} />
            {isDraft && can('inward-entry.edit') && (
              <Link href={`/procurement/grn/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}>
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {isDraft && can('inward-entry.post') && (
              <button type="button" disabled={busy} onClick={() => run('post', `Post ${grn.inward_no}? The quantities count as received and a lot is created for every line.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}>
                <i className="bi bi-check2-circle me-1"></i> Post Receipt
              </button>
            )}
            {grn.receipt_status !== 'cancelled' && can('inward-entry.post') && (
              <button type="button" disabled={busy} onClick={() => run('cancel', `Cancel ${grn.inward_no}? ${isDraft ? '' : 'Its lots are cancelled and the quantities are no longer received.'}`)} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}>
                <i className="bi bi-x-circle me-1"></i> Cancel
              </button>
            )}
            {isDraft && can('inward-entry.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/procurement/grn" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — not counted as received until it is posted.</div>}

      <Card title="Receipt" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={grn.company_label} code={grn.company_code} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={grn.receipt_status} config={GRN_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">GRN Date</dt><dd className="mt-1 text-fg">{formatDate(grn.inward_date)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Supplier</dt><dd className="mt-1 text-fg">{grn.supplier_name}</dd></div>
          <div>
            <dt className="text-fg-subtle text-xs">Purchase Order</dt>
            <dd className="mt-1 font-mono">
              {can('purchase-order.view') ? <Link href={`/procurement/purchase-orders/${grn.purchase_order_id}`} className="text-link hover:underline">{grn.purchase_order_num}</Link> : grn.purchase_order_num}
              <span className="block text-xs text-fg-subtle font-sans">{PO_ORIGIN_LABELS[grn.purchase_order_origin]}</span>
            </dd>
          </div>
          <div>
            <dt className="text-fg-subtle text-xs">Source</dt>
            <dd className="mt-1 text-fg">
              {trace.oc_num && <div>OC <span className="font-mono">{trace.oc_num}</span></div>}
              {trace.plan_no && <div>Plan <Link href={`/planning/material-plans/${trace.material_plan_id}`} className="font-mono text-link hover:underline">{trace.plan_no}</Link></div>}
              {(trace.requirements || []).map((r) => (
                <div key={r.material_requirement_id} className="text-xs">
                  <Link href={`/planning/material-requirements/${r.material_requirement_id}`} className="font-mono text-link hover:underline">{r.requirement_no}</Link>
                  {' → '}
                  <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className="font-mono text-link hover:underline">{r.projection_no}</Link>
                  <span className="text-fg-subtle"> · {r.brand_name}</span>
                </div>
              ))}
            </dd>
          </div>
          <div><dt className="text-fg-subtle text-xs">Challan / Bill</dt><dd className="mt-1 text-fg">{grn.challan_no || '—'}{grn.challan_date ? ` · ${formatDate(grn.challan_date)}` : ''}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Posted</dt><dd className="mt-1 text-fg">{grn.posted_at ? `${formatDateTime(grn.posted_at)} · ${grn.poster_name || '—'}` : '—'}</dd></div>
          {grn.cancelled_at && <div><dt className="text-fg-subtle text-xs">Cancelled</dt><dd className="mt-1 text-fg">{formatDateTime(grn.cancelled_at)} · {grn.canceller_name || '—'}</dd></div>}
          {grn.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{grn.remarks}</dd></div>}
        </dl>
      </Card>

      <Card title="Received Material & Lots" variant="info">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="text-right">Received</th>
                <th>UOM</th>
                <th className="text-right">Width (inch)</th>
                <th>Mill Lot</th>
                <th className="text-right">PO Ordered / Received / Pending</th>
                <th>Lot</th>
                <th>QC</th>
              </tr>
            </thead>
            <tbody>
              {grn.items.map((item) => (
                <tr key={item.id}>
                  <td className="cell-strong">{item.product_name || item.description || '—'} {item.item_group_code && <span className="text-xs text-fg-subtle">({item.item_group_code})</span>}</td>
                  <td className="text-right">{formatQuantity(item.received_quantity, item.uom_decimal_places)}</td>
                  <td className="font-mono text-fg-muted">{item.unit || '—'}</td>
                  <td className="text-right">{formatQuantity(item.width_inch, 3)}</td>
                  <td className="text-fg-muted">{item.supplier_lot_no || '—'}</td>
                  <td className="text-right text-fg-muted whitespace-nowrap">
                    {formatQuantity(item.po_ordered_quantity, item.uom_decimal_places)} / {formatQuantity(item.po_received_quantity, item.uom_decimal_places)} / {formatQuantity(item.po_pending_quantity, item.uom_decimal_places)}
                  </td>
                  <td>
                    {item.lot_id ? (
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/procurement/lots/${item.lot_id}`} className="font-mono text-link hover:underline">{item.lot_no}</Link>
                        <WorkflowBadge status={item.lot_status} config={LOT_STATUS_BADGES} />
                      </span>
                    ) : <span className="text-fg-subtle">On posting</span>}
                  </td>
                  <td className="whitespace-nowrap">
                    {item.lot_id && item.lot_status === 'received' ? (
                      <>
                        <span className="text-fg-muted">{formatQuantity(item.qc_inspected_quantity, item.uom_decimal_places)} of {formatQuantity(item.received_quantity, item.uom_decimal_places)} inspected</span>
                        {Number(item.received_quantity) - Number(item.qc_claimed_quantity) > 0 && can('inward-entry.approve') && (
                          <Link href={`/quality-control/create?lot_id=${item.lot_id}`} className="ml-2 text-link hover:underline">Inspect</Link>
                        )}
                      </>
                    ) : <span className="text-fg-subtle">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">Only posted receipts count as received. Each lot is inspected in Quality Control; QC rejection does not change the received quantity.</p>
      </Card>
    </DashboardLayout>
  );
}
