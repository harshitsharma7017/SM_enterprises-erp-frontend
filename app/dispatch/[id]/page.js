'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, POSTING_STATUS_BADGES, DISPATCH_TYPE_LABELS, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';
const LINK = 'font-mono text-blue-600 hover:underline';

export default function DispatchShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchDispatch = useCallback(async () => {
    try {
      const res = await apiClient.get(`/dispatches/${id}`);
      setDispatch(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load dispatch');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchDispatch);
  }, [fetchDispatch]);

  const run = async (action, body) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/dispatches/${id}/${action}`, body);
      setNotice(res.message || null);
      await fetchDispatch();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading dispatch...</div></DashboardLayout>;
  if (!dispatch) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Dispatch not found'}</div></DashboardLayout>;

  const isDraft = dispatch.status === 'draft';
  const isStock = dispatch.dispatch_type === 'STOCK_DISPATCH';
  const t = dispatch.po_trace || {};
  const post = () => {
    const effect = isStock ? 'Stock is reduced and the dispatch can no longer be edited or cancelled.' : 'The quantities count as dispatched on the PO (no stock is involved); the dispatch can no longer be edited or cancelled.';
    if (confirm(`Post ${dispatch.dispatch_no}? ${effect}`)) run('post');
  };
  const cancel = () => {
    const reason = prompt(`Cancel draft ${dispatch.dispatch_no}?\n\nReason (optional):`);
    if (reason !== null) run('cancel', { reason });
  };
  const traces = [...new Map(dispatch.items.filter((i) => i.production).map((i) => [i.processing_record_id, i.production])).values()];

  return (
    <DashboardLayout>
      <PageHeading
        title={dispatch.dispatch_no}
        breadcrumbs={[{ label: 'Dispatches', href: '/dispatch' }, { label: dispatch.dispatch_no }]}
        actions={(
          <>
            {isDraft && can('dispatch.edit') && <Link href={`/dispatch/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>}
            {isDraft && can('dispatch.post') && <button type="button" disabled={busy} onClick={post} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Post Dispatch</button>}
            {isDraft && can('dispatch.cancel') && <button type="button" disabled={busy} onClick={cancel} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>}
            <Link href="/dispatch" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — nothing is dispatched (and no stock moves) until it is posted.</div>}

      <Card title="Dispatch" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={dispatch.company_label} code={dispatch.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={dispatch.status} config={POSTING_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Type</dt><dd className="mt-1 text-gray-900">{DISPATCH_TYPE_LABELS[dispatch.dispatch_type]}</dd></div>
          <div><dt className="text-gray-500 text-xs">Date</dt><dd className="mt-1 text-gray-900">{formatDate(dispatch.dispatch_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Customer</dt><dd className="mt-1 text-gray-900">{dispatch.buyer_name || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Destination</dt><dd className="mt-1 text-gray-900">{dispatch.destination_name || '—'}{dispatch.destination_address && <div className="text-xs text-gray-600 whitespace-pre-line">{dispatch.destination_address}</div>}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">{isStock ? 'Order' : 'Purchase Order'}</dt>
            <dd className="mt-1">
              {isStock
                ? (can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${dispatch.order_confirmation_id}`} className={LINK}>{dispatch.oc_num}</Link> : <span className="font-mono">{dispatch.oc_num}</span>)
                : (can('purchase-order.view') ? <Link href={`/procurement/purchase-orders/${dispatch.purchase_order_id}`} className={LINK}>{dispatch.po_num}</Link> : <span className="font-mono">{dispatch.po_num}</span>)}
            </dd>
          </div>
          <div><dt className="text-gray-500 text-xs">{isStock ? 'Source location' : 'Supplier / mill'}</dt><dd className="mt-1 text-gray-900">{isStock ? <><span className="font-mono">{dispatch.location_code}</span> · {dispatch.location_name}</> : dispatch.supplier_name}</dd></div>
          <div><dt className="text-gray-500 text-xs">Transporter / Vehicle</dt><dd className="mt-1 text-gray-900">{dispatch.transporter || '—'} / {dispatch.vehicle_no || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Document ref.</dt><dd className="mt-1 text-gray-900">{dispatch.document_reference || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Invoice / bill ref.</dt><dd className="mt-1 text-gray-900">{dispatch.invoice_reference || '—'}</dd></div>
          {dispatch.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{dispatch.remarks}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{dispatch.creator_name || '—'} · {formatDateTime(dispatch.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Posted</dt><dd className="mt-1 text-gray-900">{dispatch.posted_at ? `${formatDateTime(dispatch.posted_at)} · ${dispatch.poster_name || '—'}` : '—'}</dd></div>
          {dispatch.cancelled_at && <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-gray-900">{formatDateTime(dispatch.cancelled_at)} · {dispatch.canceller_name || '—'}{dispatch.cancellation_reason ? ` — ${dispatch.cancellation_reason}` : ''}</dd></div>}
        </dl>
      </Card>

      <Card title="Lines" variant="info">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 text-xs text-left">
            <tr>
              <th className="py-1.5 font-medium">Product</th>
              <th className="py-1.5 font-medium">{isStock ? 'Order item' : 'PO line'}</th>
              {isStock && <th className="py-1.5 font-medium">Finished lot</th>}
              <th className="py-1.5 font-medium text-right">Quantity</th>
              <th className="py-1.5 font-medium">{isStock ? 'Stock movement' : 'Order'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dispatch.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5 text-gray-900">{i.product_name}</td>
                <td className="py-1.5 text-gray-700">{isStock ? (i.design_no || i.item_description || '—') : `Ordered ${formatQuantity(i.po_ordered_quantity, i.uom_decimal_places)} ${i.unit || ''}`}</td>
                {isStock && <td className="py-1.5"><Link href={`/procurement/lots/${i.lot_id}`} className={LINK}>{i.lot_no}</Link></td>}
                <td className="py-1.5 text-right font-semibold whitespace-nowrap">{formatQuantity(i.quantity, i.uom_decimal_places)} {i.unit}</td>
                <td className="py-1.5">
                  {isStock
                    ? (i.stock_movement_id ? (can('stock.ledger') ? <Link href={`/inventory/ledger/${i.stock_movement_id}`} className={LINK}>{i.stock_movement_no}</Link> : <span className="font-mono">{i.stock_movement_no}</span>) : <span className="text-gray-400">On posting</span>)
                    : (i.oc_num ? <Link href={`/sales/order-confirmations/${i.order_confirmation_id}`} className={LINK}>{i.oc_num}</Link> : <span className="text-gray-400">—</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isStock && <p className="text-xs text-gray-500 mt-2 mb-0">Direct supplier dispatch: the mill ships to the customer; the material never enters ERP stock, so no stock movement is created.</p>}
      </Card>

      <Card title="Traceability" variant="info">
        {isStock ? (
          traces.length === 0 ? <p className="text-sm text-gray-500 m-0">—</p> : (
            <div className="space-y-6">
              {traces.map((production) => <ProductionTrace key={production.processing_record_id} production={production} companyLabel={dispatch.company_label} companyCode={dispatch.company_code} />)}
            </div>
          )
        ) : (
          <ol className="list-none p-0 m-0 space-y-2 text-sm">
            <li>Purchase order <span className="font-mono">{dispatch.po_num}</span> ({PO_ORIGIN_LABELS[dispatch.purchase_order_origin]}) · supplier / mill {dispatch.supplier_name}</li>
            {t.oc_num && <li>Order confirmation <span className="font-mono">{t.oc_num}</span></li>}
            {t.plan_no && <li>Material plan <Link href={`/planning/material-plans/${t.material_plan_id}`} className={LINK}>{t.plan_no}</Link></li>}
            {(t.requirements || []).map((r) => (
              <li key={r.material_requirement_id}>
                Requirement <Link href={`/planning/material-requirements/${r.material_requirement_id}`} className={LINK}>{r.requirement_no}</Link>
                {' → '}projection <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className={LINK}>{r.projection_no}</Link>
                <span className="text-gray-500"> · {r.brand_name}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </DashboardLayout>
  );
}
