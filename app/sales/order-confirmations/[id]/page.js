'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, OC_STATUS_BADGES, PO_STATUS_BADGES, EXPORT_DOC_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import OrderFulfilment from '@/components/sales/order-confirmations/OrderFulfilment';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatAmount } from '@/components/sales/shared/format';

const MODE_LABELS = { oc: 'Order Confirmation', direct: 'Direct Buyer Contract' };

export default function OcShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [oc, setOc] = useState(null);
  const [lookups, setLookups] = useState({ buyers: [], categories: [], formats: [], agents: [], currencies: [] });
  const [sourceInquiryNo, setSourceInquiryNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [raising, setRaising] = useState(false);
  const [raiseMessage, setRaiseMessage] = useState(null);
  const [raisedPos, setRaisedPos] = useState([]);

  const [raisingDoc, setRaisingDoc] = useState(false);
  const [raiseDocMessage, setRaiseDocMessage] = useState(null);
  const [raisedDocs, setRaisedDocs] = useState([]);

  const fetchOc = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sales/order-confirmations/${id}`);
      if (res.success) {
        setOc(res.data);
        if (res.data.source_inquiry_id) {
          try {
            const inqRes = await apiClient.get(`/inquiries/${res.data.source_inquiry_id}`);
            if (inqRes.success) setSourceInquiryNo(inqRes.data.inquiry.inquiry_no);
          } catch (e) { /* not fatal */ }
        }
        // The PO list has no order_confirmation_id filter — searching by this
        // OC's own number is the only way to find POs raised from it (see
        // Phase 4B report §14.1: order_confirmation_items.purchase_order_id
        // was dropped in migration 011 and never restored).
        try {
          const poRes = await apiClient.get(`/procurement/purchase-orders?search=${encodeURIComponent(res.data.oc_num)}`);
          if (poRes.success) setRaisedPos(poRes.data || []);
        } catch (e) { /* not fatal */ }
        // Export Document's list endpoint supports neither `search` nor an
        // `order_confirmation_id` filter at all (see Phase 5A report) — the
        // only way to find documents raised from this OC is to fetch a page
        // of the list and filter client-side by the field each row does
        // carry (order_confirmation_id), which is present but not queryable.
        try {
          const docRes = await apiClient.get('/export/documents?limit=200');
          if (docRes.success) setRaisedDocs((docRes.data || []).filter((d) => String(d.order_confirmation_id) === String(res.data.id)));
        } catch (e) { /* not fatal */ }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load Order Confirmation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(async () => {
      await fetchOc();
      // OC's own read endpoints don't join buyer/category/format/agent/currency
      // names, so we resolve them from Inquiry's lookup bundle (same permission
      // gap documented on the create/edit form).
      try {
        const res = await apiClient.get('/inquiries/create');
        if (res.success) {
          setLookups({
            buyers: res.data.buyers || [],
            categories: res.data.categories || [],
            formats: res.data.formats || [],
            agents: res.data.agents || [],
            currencies: res.data.currencies || [],
          });
        }
      } catch (e) { /* fall back to raw ids below */ }
    });
  }, [fetchOc]);

  const toggleItemSelected = (itemId) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
  };

  const raisePos = async () => {
    if (selectedItemIds.length === 0) {
      setRaiseMessage({ type: 'warning', text: 'Select at least one item to raise a PO.' });
      return;
    }
    setRaising(true);
    setRaiseMessage(null);
    try {
      const res = await apiClient.post(`/sales/order-confirmations/${id}/raise-po`, { item_ids: selectedItemIds });
      if (res.success) {
        const pos = res.data || [];
        setRaiseMessage({
          type: 'success',
          text: pos.length === 1
            ? `Purchase Order "${pos[0].po_num}" raised.`
            : `${pos.length} Purchase Orders raised: ${pos.map((p) => p.po_num).join(', ')}.`,
        });
        setSelectedItemIds([]);
        fetchOc();
      }
    } catch (err) {
      setRaiseMessage({ type: 'warning', text: err.message || 'Nothing to raise — the selected items have no supplier set, or are already on a PO.' });
    } finally {
      setRaising(false);
    }
  };

  // Unlike Raise PO, the backend's raise-export-document endpoint takes no
  // item selection at all — it unconditionally copies every item on the OC
  // (see Phase 5A report §9). There is nothing for the user to check, so
  // this is a single button, not a checkbox column + button like Raise PO.
  const raiseExportDoc = async () => {
    setRaisingDoc(true);
    setRaiseDocMessage(null);
    try {
      const res = await apiClient.post(`/sales/order-confirmations/${id}/raise-export-document`);
      if (res.success) {
        setRaiseDocMessage({ type: 'success', text: `Export Document raised. Redirecting…` });
        router.push(`/export/documents/${res.data.id}`);
      }
    } catch (err) {
      setRaiseDocMessage({ type: 'warning', text: err.message || 'Failed to raise Export Document.' });
    } finally {
      setRaisingDoc(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading Order Confirmation...</div>
      </DashboardLayout>
    );
  }

  if (error || !oc) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Order Confirmation not found'}</div>
      </DashboardLayout>
    );
  }

  const buyer = lookups.buyers.find((b) => String(b.id) === String(oc.buyer_id));
  const category = lookups.categories.find((c) => String(c.id) === String(oc.category_id));
  const format = lookups.formats.find((f) => String(f.id) === String(oc.document_format_id));
  const agent = lookups.agents.find((a) => String(a.id) === String(oc.agent_id));
  const currency = lookups.currencies.find((c) => String(c.id) === String(oc.currency_id));

  const shipmentParts = [oc.ship_method, oc.shipment_date, oc.pol, oc.pod].filter(Boolean);
  const total = (oc.items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const canRaise = can('order-confirmation.approve') && oc.status === 'confirmed' && oc.mode !== 'direct';
  const canShip = can('export-document.create') && oc.status === 'confirmed' && oc.mode !== 'direct';
  const isCancelled = oc.status === 'cancelled';

  const cancelOrder = async () => {
    const reason = prompt(`Cancel ${oc.oc_num}? The order stays as history. It cannot be cancelled while production is allocated to it or purchase orders / export documents depend on it.\n\nReason (optional):`);
    if (reason === null) return;
    try {
      await apiClient.post(`/sales/order-confirmations/${id}/cancel`, { reason });
      await fetchOc();
    } catch (err) {
      alert(err.message || 'Could not cancel the order');
    }
  };

  return (
    <DashboardLayout>
      <PageHeading
        title={oc.oc_num}
        breadcrumbs={[{ label: 'Order Confirmations', href: '/sales/order-confirmations' }, { label: oc.oc_num }]}
        actions={(
          <>
            {can('order-confirmation.edit') && !isCancelled && (
              <Link href={`/sales/order-confirmations/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {can('order-confirmation.edit') && !isCancelled && (
              <button type="button" onClick={cancelOrder} className="border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-x-circle me-1"></i> Cancel Order
              </button>
            )}
            <Link href="/sales/order-confirmations" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      {sourceInquiryNo ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm mb-4">
          Converted from Inquiry <Link href="/sales/inquiries" className="font-medium underline">{sourceInquiryNo}</Link> — item data, sizes, colours &amp; costing pre-filled.
        </div>
      ) : oc.mode === 'direct' ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 rounded p-3 text-sm mb-4">
          Direct Buyer Contract — no OC document sent, this contract number is the anchor for POs raised against it.
        </div>
      ) : null}

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Status</dt><dd className="mt-0.5"><WorkflowBadge status={oc.status} config={OC_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500">Type</dt><dd className="mt-0.5 text-gray-900">{MODE_LABELS[oc.mode] || oc.mode}</dd></div>
          <div><dt className="text-gray-500">OC Date</dt><dd className="mt-0.5 text-gray-900">{formatDate(oc.oc_date)}</dd></div>
          <div><dt className="text-gray-500">Buyer&apos;s Ref</dt><dd className="mt-0.5 text-gray-900">{oc.buyer_ref || '—'}</dd></div>
          <div><dt className="text-gray-500">Buyer</dt><dd className="mt-0.5 text-gray-900">{buyer ? `${buyer.company_name}${buyer.display_code ? ` (${buyer.display_code})` : ''}` : `#${oc.buyer_id}`}</dd></div>
          <div><dt className="text-gray-500">Brand</dt><dd className="mt-0.5 text-gray-900">{oc.brand_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Category / Order Format</dt><dd className="mt-0.5 text-gray-900">{category?.name || '—'} / {format?.name || '—'}</dd></div>
          <div><dt className="text-gray-500">Agent</dt><dd className="mt-0.5 text-gray-900">{agent ? `${agent.name}${oc.agent_commission_value != null ? ` (${oc.agent_commission_value}${oc.agent_commission_type === 'percent' ? '%' : ''})` : ''}` : '—'}</dd></div>
          <div><dt className="text-gray-500">Currency / Incoterm</dt><dd className="mt-0.5 text-gray-900">{currency?.iso_code || '—'} / {oc.incoterm || '—'}</dd></div>
          <div><dt className="text-gray-500">Shipment</dt><dd className="mt-0.5 text-gray-900">{shipmentParts.length > 0 ? shipmentParts.join(' · ') : '—'}</dd></div>
          <div><dt className="text-gray-500">Payment Terms</dt><dd className="mt-0.5 text-gray-900">{oc.payment_terms || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500">Remarks</dt><dd className="mt-0.5 text-gray-900">{oc.remarks || '—'}</dd></div>
          {isCancelled && <div className="md:col-span-3"><dt className="text-gray-500">Cancelled</dt><dd className="mt-0.5 text-red-700">{formatDateTime(oc.cancelled_at)} · {oc.canceller_name || '—'}{oc.cancellation_reason ? ` — ${oc.cancellation_reason}` : ''}</dd></div>}
        </dl>
      </div>

      <OrderFulfilment key={`${oc.status}-${oc.updated_at}`} ocId={id} companyLabel={oc.company_label} companyCode={oc.company_code} />

      <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700">Items</div>
        {oc.mode === 'direct' ? (
          <div className="p-4 text-sm text-gray-500">Items are entered at PO stage for a direct contract.</div>
        ) : (oc.items || []).length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No items — add items in Edit.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {canRaise && <th className="px-3 py-2 font-medium" title="Raise PO"><i className="bi bi-cart-check"></i></th>}
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Design No.</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="px-3 py-2 font-medium">Colour / Size</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-right">Cost Price</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {oc.items.map((item, i) => (
                  <tr key={item.id}>
                    {canRaise && (
                      <td className="px-3 py-2">
                        {item.supplier_id ? (
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => toggleItemSelected(item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-300" title="No supplier set">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-900">{item.design_no || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.product_id ? `#${item.product_id}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.supplier_id ? `#${item.supplier_id}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {(item.colours || []).map((c, ci) => (
                        <div key={ci} className="mb-0.5">
                          {c.colour && <span className="font-medium">{c.colour}: </span>}
                          {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatAmount(item.price)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{formatAmount(item.cost_price)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{item.qty}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatAmount(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={canRaise ? 10 : 9} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {canRaise && oc.items && oc.items.length > 0 && (
          <div className="border-t p-4">
            {raiseMessage && (
              <div className={`rounded p-3 text-sm mb-3 ${raiseMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                {raiseMessage.text}
              </div>
            )}
            <button
              type="button"
              disabled={raising}
              onClick={raisePos}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
            >
              <i className="bi bi-arrow-right-circle me-1"></i> {raising ? 'Raising…' : 'Raise PO for Selected'}
            </button>
            <p className="text-xs text-gray-500 mt-1">Grouped by supplier — one PO per supplier. Items already raised to a PO are skipped automatically.</p>
          </div>
        )}
        {!canRaise && can('order-confirmation.approve') && oc.status !== 'confirmed' && oc.mode !== 'direct' && (oc.items || []).length > 0 && (
          <div className="border-t p-4 text-sm text-gray-500">Mark the OC Confirmed before raising a PO.</div>
        )}
      </div>

      {raisedPos.length > 0 && (
        <div className="bg-white border rounded shadow-sm p-4 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Purchase Orders Raised</div>
          <div className="flex flex-wrap gap-2">
            {raisedPos.map((po) => (
              <Link key={po.id} href={`/procurement/purchase-orders/${po.id}`} className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100">
                {po.po_num} — {po.supplier_company_name || 'Supplier'} ({PO_STATUS_BADGES[po.status]?.label || po.status})
              </Link>
            ))}
          </div>
        </div>
      )}

      {(canShip || raisedDocs.length > 0) && (
        <div className="bg-white border rounded shadow-sm p-4 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Export Documents</div>
          {canShip && (
            <>
              {raiseDocMessage && (
                <div className={`rounded p-3 text-sm mb-3 ${raiseDocMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                  {raiseDocMessage.text}
                </div>
              )}
              <button
                type="button"
                disabled={raisingDoc}
                onClick={raiseExportDoc}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
              >
                <i className="bi bi-box-seam me-1"></i> {raisingDoc ? 'Raising…' : 'Raise Export Document'}
              </button>
              <p className="text-xs text-gray-500 mt-1">Creates one Export Document with all of this OC&apos;s items and the full document checklist.</p>
            </>
          )}
          {raisedDocs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {raisedDocs.map((d) => (
                <Link key={d.id} href={`/export/documents/${d.id}`} className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100">
                  {d.doc_num} ({EXPORT_DOC_STATUS_BADGES[d.status]?.label || d.status})
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Delivery Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{oc.delivery_details || 'None recorded.'}</div>
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Packing Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{oc.packing_details || 'None recorded.'}</div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Created {formatDateTime(oc.created_at)} · Last updated {formatDateTime(oc.updated_at)}
      </div>
    </DashboardLayout>
  );
}
