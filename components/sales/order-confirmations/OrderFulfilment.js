'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WorkflowBadge, ORDER_STATUS_BADGES, PRODUCTION_PROGRESS_BADGES, ALLOCATION_STATUS_BADGES, POSTING_STATUS_BADGES, DISPATCH_TYPE_LABELS } from '@/components/ui/Badge';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const LINK = 'font-mono text-link hover:underline';
const EMPTY_FORM = { order_confirmation_item_id: '', lot_id: '', quantity: '', remarks: '' };

/**
 * Order tracking on an Order Confirmation: per item ordered / produced /
 * dispatched / pending, production allocations (finished lots → items) with
 * their full production trace, dispatch history and the company's finished
 * stock. Every figure comes from the server; produced = allocated production
 * output, dispatched = posted dispatches.
 */
/** Where an allocated lot came from: its processing record, its GRN for bought-in stock, or opening stock. */
const lotSource = (l) => l.processing_no || (l.inward_no ? `GRN ${l.inward_no}` : (l.source_type || l.lot_source_type) === 'opening' ? 'Opening stock' : 'Bought-in');

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

  if (!data) return error ? <div className="alert alert-danger">{error}</div> : null;

  const lot = lots.find((l) => String(l.lot_id) === String(form.lot_id));
  const canAllocate = data.status === 'confirmed' && can('order-confirmation.allocate');
  const traces = [...new Map(data.allocations.filter((a) => a.production).map((a) => [a.processing_record_id, a.production])).values()];

  return (
    <>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Order Tracking" variant="primary">
        <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
          <span className="text-fg-subtle">Order status</span>
          <WorkflowBadge status={data.order_status} config={ORDER_STATUS_BADGES} />
          {data.status === 'confirmed' && can('dispatch.create') && data.allocations.some((a) => a.status === 'active') && (
            <Link href={`/dispatch/create?type=STOCK_DISPATCH&order_confirmation_id=${ocId}`} className="ml-auto bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm font-medium"><i className="bi bi-truck me-1"></i> Dispatch</Link>
          )}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Product</th>
                <th>UOM</th>
                <th className="text-right">Ordered</th>
                <th className="text-right">Produced / Allocated</th>
                <th className="text-right">Dispatched</th>
                <th className="text-right">Pending</th>
                <th className="text-right">Still to produce</th>
                <th>Production</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => {
                const dp = i.product_uom_decimal_places;
                return (
                  <tr key={i.id}>
                    <td className="text-fg-muted">{i.design_no || i.description || `Line ${i.sort_order + 1}`}</td>
                    <td className="cell-strong">{i.product_name || <span className="text-fg-subtle">No product</span>}</td>
                    <td className="font-mono">{i.unit || i.product_uom_code || '—'}</td>
                    <td className="text-right font-semibold">{formatQuantity(i.ordered_quantity, dp)}</td>
                    <td className="text-right">{formatQuantity(i.produced_quantity, dp)}</td>
                    <td className="text-right">{formatQuantity(i.dispatched_quantity, dp)}</td>
                    <td className="text-right font-semibold">{formatQuantity(i.pending_quantity, dp)}</td>
                    <td className="text-right">{formatQuantity(i.to_produce_quantity, dp)}</td>
                    <td><WorkflowBadge status={i.production_status} config={PRODUCTION_PROGRESS_BADGES} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">
          Produced / Allocated = stock allocated to the item (finished production output, or QC-accepted bought-in stock). Dispatched = posted dispatches (finished stock, or direct supplier dispatch of a PO raised from the item).
          Pending = ordered − dispatched; still to produce = ordered − produced. No other formula is applied.
        </p>
      </Card>

      <Card title="Stock Allocations" variant="info">
        {data.allocations.length === 0 ? <p className="text-sm text-fg-subtle m-0">No stock has been allocated to this order.</p> : (
          <table className="data-table">
            <thead>
              <tr><th>Item</th><th>Lot</th><th>Source</th><th className="text-right">Quantity</th><th className="text-right">Lot stock now</th><th>By</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {data.allocations.map((a) => (
                <tr key={a.id}>
                  <td className="text-fg-muted">{a.design_no || a.item_description || a.product_name}</td>
                  <td><Link href={`/procurement/lots/${a.lot_id}`} className={LINK}>{a.lot_no}</Link></td>
                  <td>{a.processing_record_id
                    ? (can('processing.view') ? <Link href={`/production/processing/${a.processing_record_id}`} className={LINK}>{a.processing_no}</Link> : <span className="font-mono">{a.processing_no}</span>)
                    : (can('inward-entry.view') && a.inward_entry_id ? <Link href={`/procurement/grn/${a.inward_entry_id}`} className={LINK}>GRN {a.inward_no}</Link> : <span className="font-mono">{lotSource(a)}</span>)}</td>
                  <td className="text-right whitespace-nowrap">{formatQuantity(a.quantity, a.uom_decimal_places)} {a.unit}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(a.lot_stock_quantity, a.uom_decimal_places)}</td>
                  <td>{a.creator_name || '—'} · {formatDateTime(a.created_at)}{a.cancelled_at && <div>cancelled {formatDate(a.cancelled_at)}{a.cancellation_reason ? ` — ${a.cancellation_reason}` : ''}</div>}</td>
                  <td><WorkflowBadge status={a.status} config={ALLOCATION_STATUS_BADGES} /></td>
                  <td className="text-right">
                    {a.status === 'active' && can('order-confirmation.allocate') && (
                      <button type="button" disabled={busy} onClick={() => cancelAllocation(a)} className="text-[var(--danger)] hover:text-red-800 text-xs">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canAllocate && (
          <form onSubmit={allocate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-t border-line mt-4 pt-4">
            <p className="md:col-span-6 text-xs text-fg-subtle m-0">Allocate finished production output, or bought-in stock that passed QC (badges, elastic, drawcords), to an order item — same company, product and unit. Allocation is manual; a lot can serve several orders but never more than it produced (production) or QC accepted (bought-in).</p>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-fg-muted mb-1">Order item *</label>
              <select required value={form.order_confirmation_item_id} onChange={(e) => chooseItem(e.target.value)} className="form-select">
                <option value="">— Select —</option>
                {data.items.filter((i) => i.product_id).map((i) => <option key={i.id} value={i.id}>{i.design_no || i.description || i.product_name} · {i.product_name} · to produce {formatQuantity(i.to_produce_quantity, i.product_uom_decimal_places)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-fg-muted mb-1">Lot *</label>
              <select required value={form.lot_id} onChange={(e) => setForm({ ...form, lot_id: e.target.value })} disabled={!form.order_confirmation_item_id} className="form-select">
                <option value="">{form.order_confirmation_item_id ? (lots.length ? '— Select —' : 'No lot with quantity left') : 'Select an item first'}</option>
                {lots.map((l) => <option key={l.lot_id} value={l.lot_id}>{l.lot_no} · {lotSource(l)} · {formatQuantity(l.allocatable_quantity, l.uom_decimal_places)} {l.unit} allocatable · stock {formatQuantity(l.stock_quantity, l.uom_decimal_places)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Quantity {lot ? `(${lot.unit})` : ''} *</label>
              <input type="number" required min="0" step={stepFor(lot?.uom_decimal_places)} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={`form-input text-right`} />
            </div>
            <button type="submit" disabled={busy || !form.lot_id} className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">Allocate</button>
            <div className="md:col-span-6">
              <input type="text" maxLength={1000} placeholder="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="form-input" />
            </div>
          </form>
        )}
        {!canAllocate && data.status !== 'confirmed' && <p className="text-xs text-fg-subtle mt-3 mb-0">Production can be allocated once the order is confirmed.</p>}
      </Card>

      <Card title="Dispatch History" variant="info">
        {data.dispatches.length === 0 ? <p className="text-sm text-fg-subtle m-0">Nothing dispatched for this order.</p> : (
          <table className="data-table">
            <thead><tr><th>Dispatch</th><th>Date</th><th>Type</th><th>Item</th><th>Lot / PO</th><th className="text-right">Quantity</th><th>Destination</th><th>Status</th></tr></thead>
            <tbody>
              {data.dispatches.map((d) => {
                const item = data.items.find((i) => i.id === d.order_confirmation_item_id);
                return (
                  <tr key={d.id}>
                    <td>{can('dispatch.view') ? <Link href={`/dispatch/${d.dispatch_id}`} className={LINK}>{d.dispatch_no}</Link> : <span className="font-mono">{d.dispatch_no}</span>}</td>
                    <td className="text-fg-muted">{formatDate(d.dispatch_date)}</td>
                    <td>{DISPATCH_TYPE_LABELS[d.dispatch_type]}</td>
                    <td className="text-fg-muted">{item?.design_no || item?.description || item?.product_name}</td>
                    <td>{d.lot_id ? <Link href={`/procurement/lots/${d.lot_id}`} className={LINK}>{d.lot_no}</Link> : <span className="font-mono text-xs">{d.po_num}</span>}</td>
                    <td className="text-right whitespace-nowrap">{formatQuantity(d.quantity, d.uom_decimal_places)} {d.unit}</td>
                    <td className="text-fg-muted">{d.destination_name || d.buyer_name || '—'}</td>
                    <td><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {data.finished_stock.length > 0 && (
        <Card title="Allocatable Stock (this company)" variant="info">
          <table className="data-table">
            <thead><tr><th>Product</th><th className="text-right">In stock</th><th className="text-right">Not yet allocated</th><th>Lots</th></tr></thead>
            <tbody>
              {data.finished_stock.map((fs) => {
                const item = data.items.find((i) => i.product_id === fs.product_id);
                const dp = fs.lots[0]?.uom_decimal_places ?? item?.product_uom_decimal_places ?? 0;
                return (
                  <tr key={fs.product_id}>
                    <td>{item?.product_name}</td>
                    <td className="text-right">{formatQuantity(fs.stock_quantity, dp)}</td>
                    <td className="text-right">{formatQuantity(fs.allocatable_quantity, dp)}</td>
                    <td>
                      {fs.lots.length === 0 ? <span className="text-fg-subtle">None</span> : fs.lots.map((l) => (
                        <Link key={l.lot_id} href={`/procurement/lots/${l.lot_id}`} className="inline-block mr-2 font-mono text-link hover:underline">{l.lot_no}</Link>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-fg-subtle mt-2 mb-0">From the stock ledger: finished production lots and QC-accepted bought-in lots. Allocation does not move stock.</p>
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
