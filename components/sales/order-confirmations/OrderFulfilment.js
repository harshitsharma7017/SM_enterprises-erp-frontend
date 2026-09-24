'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WorkflowBadge, ORDER_STATUS_BADGES, PRODUCTION_PROGRESS_BADGES, ALLOCATION_STATUS_BADGES, POSTING_STATUS_BADGES, DISPATCH_TYPE_LABELS } from '@/components/ui/Badge';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const LINK = 'font-mono text-blue-600 hover:underline';
const EMPTY_FORM = { order_confirmation_item_id: '', lot_id: '', quantity: '', remarks: '' };

/**
 * Order tracking on an Order Confirmation: per item ordered / produced /
 * dispatched / pending, production allocations (finished lots → items) with
 * their full production trace, dispatch history and the company's finished
 * stock. Every figure comes from the server; produced = allocated production
 * output, dispatched = posted dispatches.
 */
export default function OrderFulfilment({ ocId, companyLabel, companyCode, onChanged }) {
  const { can } = useAuth(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lots, setLots] = useState([]);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get(`/sales/order-confirmations/${ocId}/fulfilment`);
      setData(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load fulfilment');
    }
  }, [ocId]);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  const chooseItem = async (itemId) => {
    setForm({ ...EMPTY_FORM, order_confirmation_item_id: itemId });
    setLots([]);
    if (!itemId) return;
    try {
      const res = await apiClient.get(`/sales/order-confirmations/${ocId}/allocation-form-data?item_id=${itemId}`);
      setLots(res.data?.lots || []);
    } catch (err) {
      setError(err.message || 'Failed to load finished lots');
    }
  };

  const run = async (work) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await work();
      setNotice(res.message || null);
      setData(res.data || null);
      onChanged?.();
      return true;
    } catch (err) {
      setError(err.message || 'Action failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const allocate = async (e) => {
    e.preventDefault();
    const ok = await run(() => apiClient.post(`/sales/order-confirmations/${ocId}/allocations`, {
      ...form, order_confirmation_item_id: Number(form.order_confirmation_item_id), lot_id: Number(form.lot_id),
    }));
    if (ok) {
      setForm(EMPTY_FORM);
      setLots([]);
    }
  };

  const cancelAllocation = (allocation) => {
    const reason = prompt(`Cancel the allocation of ${allocation.lot_no} to this order? It stays in the history and the lot quantity becomes allocatable again.\n\nReason (optional):`);
    if (reason === null) return;
    run(() => apiClient.post(`/sales/order-confirmations/${ocId}/allocations/${allocation.id}/cancel`, { reason }));
  };

  if (!data) return error ? <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div> : null;

  const lot = lots.find((l) => String(l.lot_id) === String(form.lot_id));
  const canAllocate = data.status === 'confirmed' && can('order-confirmation.allocate');
  const traces = [...new Map(data.allocations.filter((a) => a.production).map((a) => [a.processing_record_id, a.production])).values()];

  return (
    <>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Order Tracking" variant="primary">
        <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
          <span className="text-gray-500">Order status</span>
          <WorkflowBadge status={data.order_status} config={ORDER_STATUS_BADGES} />
          {data.status === 'confirmed' && can('dispatch.create') && data.allocations.some((a) => a.status === 'active') && (
            <Link href={`/dispatch/create?type=STOCK_DISPATCH&order_confirmation_id=${ocId}`} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"><i className="bi bi-truck me-1"></i> Dispatch</Link>
          )}
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">UOM</th>
                <th className="px-3 py-2 font-medium text-right">Ordered</th>
                <th className="px-3 py-2 font-medium text-right">Produced</th>
                <th className="px-3 py-2 font-medium text-right">Dispatched</th>
                <th className="px-3 py-2 font-medium text-right">Pending</th>
                <th className="px-3 py-2 font-medium text-right">Still to produce</th>
                <th className="px-3 py-2 font-medium">Production</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.items.map((i) => {
                const dp = i.product_uom_decimal_places;
                return (
                  <tr key={i.id}>
                    <td className="px-3 py-2 text-gray-700">{i.design_no || i.description || `Line ${i.sort_order + 1}`}</td>
                    <td className="px-3 py-2 text-gray-900">{i.product_name || <span className="text-gray-400">No product</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">{i.unit || i.product_uom_code || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatQuantity(i.ordered_quantity, dp)}</td>
                    <td className="px-3 py-2 text-right">{formatQuantity(i.produced_quantity, dp)}</td>
                    <td className="px-3 py-2 text-right">{formatQuantity(i.dispatched_quantity, dp)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatQuantity(i.pending_quantity, dp)}</td>
                    <td className="px-3 py-2 text-right">{formatQuantity(i.to_produce_quantity, dp)}</td>
                    <td className="px-3 py-2"><WorkflowBadge status={i.production_status} config={PRODUCTION_PROGRESS_BADGES} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">
          Produced = finished production output allocated to the item. Dispatched = posted dispatches (finished stock, or direct supplier dispatch of a PO raised from the item).
          Pending = ordered − dispatched; still to produce = ordered − produced. No other formula is applied.
        </p>
      </Card>

      <Card title="Production Allocations" variant="info">
        {data.allocations.length === 0 ? <p className="text-sm text-gray-500 m-0">No production has been allocated to this order.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left">
              <tr><th className="py-1.5 font-medium">Item</th><th className="py-1.5 font-medium">Finished Lot</th><th className="py-1.5 font-medium">Processing</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium text-right">Lot stock now</th><th className="py-1.5 font-medium">By</th><th className="py-1.5 font-medium">Status</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.allocations.map((a) => (
                <tr key={a.id}>
                  <td className="py-1.5 text-gray-700">{a.design_no || a.item_description || a.product_name}</td>
                  <td className="py-1.5"><Link href={`/procurement/lots/${a.lot_id}`} className={LINK}>{a.lot_no}</Link></td>
                  <td className="py-1.5">{can('processing.view') ? <Link href={`/production/processing/${a.processing_record_id}`} className={LINK}>{a.processing_no}</Link> : <span className="font-mono">{a.processing_no}</span>}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{formatQuantity(a.quantity, a.uom_decimal_places)} {a.unit}</td>
                  <td className="py-1.5 text-right text-gray-600">{formatQuantity(a.lot_stock_quantity, a.uom_decimal_places)}</td>
                  <td className="py-1.5 text-xs text-gray-500">{a.creator_name || '—'} · {formatDateTime(a.created_at)}{a.cancelled_at && <div>cancelled {formatDate(a.cancelled_at)}{a.cancellation_reason ? ` — ${a.cancellation_reason}` : ''}</div>}</td>
                  <td className="py-1.5"><WorkflowBadge status={a.status} config={ALLOCATION_STATUS_BADGES} /></td>
                  <td className="py-1.5 text-right">
                    {a.status === 'active' && can('order-confirmation.allocate') && (
                      <button type="button" disabled={busy} onClick={() => cancelAllocation(a)} className="text-red-600 hover:text-red-800 text-xs">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canAllocate && (
          <form onSubmit={allocate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-t border-gray-200 mt-4 pt-4">
            <p className="md:col-span-6 text-xs text-gray-500 m-0">Allocate finished production output (same company and product, same unit) to an order item. Allocation is manual; a lot can serve several orders but never more than it produced.</p>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Order item *</label>
              <select required value={form.order_confirmation_item_id} onChange={(e) => chooseItem(e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">— Select —</option>
                {data.items.filter((i) => i.product_id).map((i) => <option key={i.id} value={i.id}>{i.design_no || i.description || i.product_name} · {i.product_name} · to produce {formatQuantity(i.to_produce_quantity, i.product_uom_decimal_places)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Finished lot *</label>
              <select required value={form.lot_id} onChange={(e) => setForm({ ...form, lot_id: e.target.value })} disabled={!form.order_confirmation_item_id} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{form.order_confirmation_item_id ? (lots.length ? '— Select —' : 'No finished lot with quantity left') : 'Select an item first'}</option>
                {lots.map((l) => <option key={l.lot_id} value={l.lot_id}>{l.lot_no} · {l.processing_no} · {formatQuantity(l.allocatable_quantity, l.uom_decimal_places)} {l.unit} allocatable · stock {formatQuantity(l.stock_quantity, l.uom_decimal_places)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity {lot ? `(${lot.unit})` : ''} *</label>
              <input type="number" required min="0" step={stepFor(lot?.uom_decimal_places)} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={`${INPUT} text-right`} />
            </div>
            <button type="submit" disabled={busy || !form.lot_id} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">Allocate</button>
            <div className="md:col-span-6">
              <input type="text" maxLength={1000} placeholder="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={INPUT} />
            </div>
          </form>
        )}
        {!canAllocate && data.status !== 'confirmed' && <p className="text-xs text-gray-500 mt-3 mb-0">Production can be allocated once the order is confirmed.</p>}
      </Card>

      <Card title="Dispatch History" variant="info">
        {data.dispatches.length === 0 ? <p className="text-sm text-gray-500 m-0">Nothing dispatched for this order.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Dispatch</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Type</th><th className="py-1.5 font-medium">Item</th><th className="py-1.5 font-medium">Lot / PO</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium">Destination</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.dispatches.map((d) => {
                const item = data.items.find((i) => i.id === d.order_confirmation_item_id);
                return (
                  <tr key={d.id}>
                    <td className="py-1.5">{can('dispatch.view') ? <Link href={`/dispatch/${d.dispatch_id}`} className={LINK}>{d.dispatch_no}</Link> : <span className="font-mono">{d.dispatch_no}</span>}</td>
                    <td className="py-1.5 text-gray-600">{formatDate(d.dispatch_date)}</td>
                    <td className="py-1.5 text-xs">{DISPATCH_TYPE_LABELS[d.dispatch_type]}</td>
                    <td className="py-1.5 text-gray-700">{item?.design_no || item?.description || item?.product_name}</td>
                    <td className="py-1.5">{d.lot_id ? <Link href={`/procurement/lots/${d.lot_id}`} className={LINK}>{d.lot_no}</Link> : <span className="font-mono text-xs">{d.po_num}</span>}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">{formatQuantity(d.quantity, d.uom_decimal_places)} {d.unit}</td>
                    <td className="py-1.5 text-gray-700">{d.destination_name || d.buyer_name || '—'}</td>
                    <td className="py-1.5"><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {data.finished_stock.length > 0 && (
        <Card title="Finished Stock (this company)" variant="info">
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Product</th><th className="py-1.5 font-medium text-right">In stock</th><th className="py-1.5 font-medium text-right">Not yet allocated</th><th className="py-1.5 font-medium">Finished lots</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.finished_stock.map((fs) => {
                const item = data.items.find((i) => i.product_id === fs.product_id);
                const dp = fs.lots[0]?.uom_decimal_places ?? item?.product_uom_decimal_places ?? 0;
                return (
                  <tr key={fs.product_id}>
                    <td className="py-1.5">{item?.product_name}</td>
                    <td className="py-1.5 text-right">{formatQuantity(fs.stock_quantity, dp)}</td>
                    <td className="py-1.5 text-right">{formatQuantity(fs.allocatable_quantity, dp)}</td>
                    <td className="py-1.5 text-xs">
                      {fs.lots.length === 0 ? <span className="text-gray-400">None</span> : fs.lots.map((l) => (
                        <Link key={l.lot_id} href={`/procurement/lots/${l.lot_id}`} className="inline-block mr-2 font-mono text-blue-600 hover:underline">{l.lot_no}</Link>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2 mb-0">From the stock ledger (finished production lots only). Allocation does not move stock.</p>
        </Card>
      )}

      {traces.length > 0 && (
        <Card title="Production Trace" variant="info">
          <div className="space-y-6">
            {traces.map((production) => (
              <ProductionTrace key={production.processing_record_id} production={production} companyLabel={companyLabel} companyCode={companyCode} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
