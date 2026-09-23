'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PO_STATUS_BADGES, PO_ORIGIN_LABELS, GRN_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatAmount, formatQuantity } from '@/components/sales/shared/format';

export default function PurchaseOrderShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [po, setPo] = useState(null);
  const [ocNum, setOcNum] = useState('');
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchPo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/procurement/purchase-orders/${id}`);
      if (res.success) {
        setPo(res.data);
        // findById on both PO and OC returns raw rows with no joined
        // names — resolve them with follow-up lookups, same pattern as the
        // Phase 4A OC show page.
        if (res.data.order_confirmation_id) {
          try {
            const ocRes = await apiClient.get(`/sales/order-confirmations/${res.data.order_confirmation_id}`);
            if (ocRes.success) setOcNum(ocRes.data.oc_num);
          } catch (e) { /* not fatal */ }
        }
        if (res.data.supplier_id) {
          try {
            const supRes = await apiClient.get(`/masters/suppliers?search=&status=active&party_type=supplier&limit=1000`);
            if (supRes.success) {
              const match = (supRes.data.data || []).find((s) => String(s.id) === String(res.data.supplier_id));
              if (match) setSupplier(match);
            }
          } catch (e) { /* not fatal */ }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load Purchase Order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchPo);
  }, [fetchPo]);

  // Server-side transitions: draft → raised (confirm), draft/raised → cancelled.
  const runAction = async (action, confirmText) => {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      const res = await apiClient.post(`/procurement/purchase-orders/${id}/${action}`);
      setNotice(res.message || null);
      await fetchPo();
    } catch (err) {
      setActionError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading Purchase Order...</div>
      </DashboardLayout>
    );
  }

  if (error || !po) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Purchase Order not found'}</div>
      </DashboardLayout>
    );
  }

  const isPlanning = po.origin && po.origin !== 'order_confirmation';
  const totalQty = (po.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const totalAmount = (po.items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <DashboardLayout>
      <PageHeading
        title={po.po_num}
        breadcrumbs={[{ label: 'Purchase Orders', href: '/procurement/purchase-orders' }, { label: po.po_num }]}
        actions={(
          <>
            {can('purchase-order.edit') && po.status !== 'cancelled' && (!isPlanning || ['draft', 'raised'].includes(po.status)) && (
              <Link href={`/procurement/purchase-orders/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {can('purchase-order.approve') && po.status === 'draft' && (
              <button type="button" disabled={busy} onClick={() => runAction('confirm', `Confirm ${po.po_num}? Its quantities then count as ordered.`)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60">
                <i className="bi bi-check2-circle me-1"></i> Confirm
              </button>
            )}
            {can('purchase-order.approve') && ['draft', 'raised'].includes(po.status) && (
              <button type="button" disabled={busy} onClick={() => runAction('cancel', `Cancel ${po.po_num}? Its quantities are released and it cannot be reopened.`)} className="border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60">
                <i className="bi bi-x-circle me-1"></i> Cancel PO
              </button>
            )}
            <Link href="/procurement/purchase-orders" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {actionError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{actionError}</div>}

      {isPlanning && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm mb-4">
          Planning PO from {po.origin === 'material_plan'
            ? <>material plan <Link href={`/planning/material-plans/${po.material_plan_id}`} className="font-medium underline">{po.material_plan_no}</Link></>
            : 'material requirements'} — no order confirmation involved. Each line traces back to its requirement and brand projection.
        </div>
      )}

      {ocNum && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm mb-4">
          From OC <Link href={`/sales/order-confirmations/${po.order_confirmation_id}`} className="font-medium underline">{ocNum}</Link> — items, sizes &amp; colours carried across, ₹ cost from inquiry costing.
        </div>
      )}

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Company</dt><dd className="mt-0.5"><CompanyBadge label={po.company_label} code={po.company_code} /></dd></div>
          <div><dt className="text-gray-500">Origin</dt><dd className="mt-0.5 text-gray-900">{PO_ORIGIN_LABELS[po.origin] || '—'}</dd></div>
          <div><dt className="text-gray-500">Status</dt><dd className="mt-0.5"><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500">PO Date</dt><dd className="mt-0.5 text-gray-900">{formatDate(po.po_date)}</dd></div>
          <div><dt className="text-gray-500">Dispatch Date</dt><dd className="mt-0.5 text-gray-900">{po.dispatch_date ? formatDate(po.dispatch_date) : '—'}</dd></div>
          <div><dt className="text-gray-500">Supplier</dt><dd className="mt-0.5 text-gray-900">{po.supplier_company_name
            ? `${po.supplier_company_name}${po.supplier_display_code ? ` (${po.supplier_display_code})` : ''}`
            : (supplier ? `${supplier.company_name}${supplier.display_code ? ` (${supplier.display_code})` : ''}` : `#${po.supplier_id}`)}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500">Remarks</dt><dd className="mt-0.5 text-gray-900">{po.remarks || '—'}</dd></div>
          {po.confirmed_at && <div><dt className="text-gray-500">Confirmed</dt><dd className="mt-0.5 text-gray-900">{formatDateTime(po.confirmed_at)} · {po.confirmer_name || '—'}</dd></div>}
          {po.cancelled_at && <div><dt className="text-gray-500">Cancelled</dt><dd className="mt-0.5 text-gray-900">{formatDateTime(po.cancelled_at)} · {po.canceller_name || '—'}</dd></div>}
        </dl>
      </div>

      <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700">Items</div>
        {(po.items || []).length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No items.</div>
        ) : isPlanning ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium">Requirement</th>
                  <th className="px-3 py-2 font-medium">Projection / Brand</th>
                  {po.origin === 'material_plan' && <th className="px-3 py-2 font-medium">Plan</th>}
                  <th className="px-3 py-2 font-medium text-right">₹/Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Ordered Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Received</th>
                  <th className="px-3 py-2 font-medium text-right">Pending</th>
                  <th className="px-3 py-2 font-medium">UOM</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-900">{item.trace?.product_name || '—'} <span className="text-xs text-gray-500">{item.trace?.item_group_code ? `(${item.trace.item_group_code})` : ''}</span></td>
                    <td className="px-3 py-2 font-mono">
                      {can('material-requirement.view')
                        ? <Link href={`/planning/material-requirements/${item.material_requirement_id}`} className="text-blue-600 hover:underline">{item.trace?.requirement_no}</Link>
                        : item.trace?.requirement_no}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="font-mono">
                        {can('brand-projection.view')
                          ? <Link href={`/planning/brand-projections/${item.trace?.brand_projection_id}`} className="text-blue-600 hover:underline">{item.trace?.projection_no}</Link>
                          : item.trace?.projection_no}
                      </div>
                      <div className="text-xs text-gray-500">{item.trace?.brand_name}</div>
                    </td>
                    {po.origin === 'material_plan' && <td className="px-3 py-2 font-mono text-gray-700">{item.trace?.plan_no || '—'}</td>}
                    <td className="px-3 py-2 text-right text-gray-900">{item.cost_price == null ? '—' : formatAmount(item.cost_price)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatQuantity(item.ordered_quantity, item.trace?.uom_decimal_places)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatQuantity(item.received_quantity, item.trace?.uom_decimal_places)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatQuantity(item.pending_quantity, item.trace?.uom_decimal_places)}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{item.unit}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatAmount(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={po.origin === 'material_plan' ? 10 : 9} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Design No.</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Colour / Size</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">₹/Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Received</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-900">{item.design_no || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.product_id ? `#${item.product_id}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {(item.colours || []).map((c, ci) => (
                        <div key={ci} className="mb-0.5">
                          {c.colour && <span className="font-medium">{c.colour}: </span>}
                          {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatAmount(item.cost_price)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{item.qty}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatQuantity(item.received_quantity, 3)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatAmount(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan="6" className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{totalQty}</td>
                  <td></td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700 flex items-center justify-between">
          <span>Goods Receipts</span>
          {can('inward-entry.create') && ['raised', 'partial'].includes(po.status) && (
            <Link href="/procurement/grn/create" className="text-xs font-medium text-blue-600 hover:underline">Receive goods</Link>
          )}
        </div>
        {(po.receipts || []).length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No goods received against this purchase order yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {po.receipts.map((g) => (
              <li key={g.id} className="px-4 py-2 text-sm flex items-center justify-between gap-2">
                <span>
                  <Link href={g.entry_type === 'legacy_inward' ? `/procurement/inward-entries/${g.id}` : `/procurement/grn/${g.id}`} className="font-mono text-blue-600 hover:underline">{g.inward_no}</Link>
                  <span className="text-gray-500"> · {formatDate(g.inward_date)}{g.entry_type === 'legacy_inward' ? ' · legacy inward' : ''} · {g.lots_count} lot(s)</span>
                </span>
                <WorkflowBadge status={g.receipt_status} config={GRN_STATUS_BADGES} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {(po.timeline || []).length > 0 && (
        <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700">Delivery Timeline</div>
          <ul className="divide-y divide-gray-100">
            {po.timeline.map((t) => (
              <li key={t.id} className="px-4 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-700">{formatDate(t.entry_date)} — {t.note}</span>
                {t.qty != null && <span className="text-gray-500">{t.qty} pcs</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Delivery Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{po.delivery_details || 'None recorded.'}</div>
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Packing Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{po.packing_details || 'None recorded.'}</div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Created {formatDateTime(po.created_at)} · Last updated {formatDateTime(po.updated_at)}
      </div>
    </DashboardLayout>
  );
}
