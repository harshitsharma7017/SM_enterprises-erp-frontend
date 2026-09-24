'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import { DISPATCH_TYPE_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const STOCK = 'STOCK_DISPATCH';
const DIRECT = 'DIRECT_SUPPLIER_DISPATCH';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);
const EMPTY_HEADER = { dispatch_date: todayDateInputValue(), location_id: '', buyer_id: '', destination_name: '', destination_address: '', transporter: '', vehicle_no: '', document_reference: '', invoice_reference: '', remarks: '' };
// A stock line is one allocation (order item + finished lot); a direct line is one PO line.
const stockKey = (l) => `${l.order_confirmation_item_id}-${l.lot_id}`;

/**
 * Dispatch: finished stock against a confirmed order (allocated finished
 * lots, from one location — reduces stock on posting), or a direct supplier
 * dispatch of PO lines (the mill ships to the customer / vendor — no stock).
 * Every available quantity shown comes from the server and is re-checked on
 * posting; a draft reserves nothing.
 */
export default function DispatchForm({ dispatchId = null, initialType = STOCK, initialOrderId = '', initialPoId = '' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [type, setType] = useState(initialType === DIRECT ? DIRECT : STOCK);
  const [companyId, setCompanyId] = useState('');
  const [options, setOptions] = useState({ orders: [], purchase_orders: [], locations: [], buyers: [] });
  const [sourceId, setSourceId] = useState(initialType === DIRECT ? initialPoId : initialOrderId);
  const [source, setSource] = useState(null);
  const [lines, setLines] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [header, setHeader] = useState(EMPTY_HEADER);

  const loadCompany = useCallback(async (kind, company) => {
    if (!company) return;
    const res = await apiClient.get(`/dispatches/form-data?type=${kind}&company_id=${company}`);
    setOptions((prev) => ({ ...prev, ...res.data }));
  }, []);

  /** One order (with its allocations at a location) or one PO (with its lines). */
  const loadSource = useCallback(async (kind, id, locationId = '') => {
    if (!id) {
      setSource(null);
      setLines([]);
      return null;
    }
    const query = kind === STOCK ? `order_confirmation_id=${id}${locationId ? `&location_id=${locationId}` : ''}` : `purchase_order_id=${id}`;
    const res = await apiClient.get(`/dispatches/form-data?type=${kind}&${query}`);
    const data = res.data || {};
    setSource(kind === STOCK ? data.order : data.purchase_order);
    setLines(data.lines || []);
    setOptions((prev) => ({ ...prev, ...(data.locations ? { locations: data.locations } : {}), ...(data.buyers ? { buyers: data.buyers } : {}) }));
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (dispatchId) {
          const res = await apiClient.get(`/dispatches/${dispatchId}`);
          const d = res.data;
          if (!mounted || !d) return;
          if (d.status !== 'draft') {
            router.replace(`/dispatch/${dispatchId}`);
            return;
          }
          setSaved(d);
          setType(d.dispatch_type);
          setCompanyId(d.company_id);
          const id = d.dispatch_type === STOCK ? d.order_confirmation_id : d.purchase_order_id;
          setSourceId(id);
          setHeader({
            dispatch_date: toDateInputValue(d.dispatch_date),
            location_id: d.location_id || '',
            buyer_id: d.buyer_id || '',
            destination_name: d.destination_name || '',
            destination_address: d.destination_address || '',
            transporter: d.transporter || '',
            vehicle_no: d.vehicle_no || '',
            document_reference: d.document_reference || '',
            invoice_reference: d.invoice_reference || '',
            remarks: d.remarks || '',
          });
          setQuantities(Object.fromEntries(d.items.map((i) => [
            d.dispatch_type === STOCK ? stockKey(i) : String(i.purchase_order_item_id), String(Number(i.quantity)),
          ])));
          await loadSource(d.dispatch_type, id, d.location_id || '');
        } else {
          // Opened from an order or a PO: preload it and its company.
          const kind = initialType === DIRECT ? DIRECT : STOCK;
          const id = kind === DIRECT ? initialPoId : initialOrderId;
          if (id) {
            const data = await loadSource(kind, id);
            const company = kind === STOCK ? data?.order?.company_id : data?.purchase_order?.company_id;
            if (company) {
              setCompanyId(company);
              await loadCompany(kind, company);
            }
          }
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load dispatch']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dispatchId, initialType, initialOrderId, initialPoId, router, loadSource, loadCompany]);

  const changeType = (next) => {
    setType(next);
    setSourceId('');
    setSource(null);
    setLines([]);
    setQuantities({});
    if (companyId) loadCompany(next, companyId).catch((err) => setErrors([err.message]));
  };
  const changeCompany = (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setSourceId('');
    setSource(null);
    setLines([]);
    setQuantities({});
    setHeader((prev) => ({ ...prev, location_id: '', buyer_id: '' }));
    loadCompany(type, value).catch((err) => setErrors([err.message]));
  };
  const changeSource = (e) => {
    const value = e.target.value;
    setSourceId(value);
    setQuantities({});
    loadSource(type, value, header.location_id).catch((err) => setErrors([err.message]));
  };
  const changeLocation = (e) => {
    const value = e.target.value;
    setHeader((prev) => ({ ...prev, location_id: value }));
    loadSource(STOCK, sourceId, value).catch((err) => setErrors([err.message]));
  };
  const set = (name) => (e) => setHeader((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const items = type === STOCK
      ? lines.filter((l) => String(quantities[stockKey(l)] || '').trim() !== '').map((l) => ({ order_confirmation_item_id: l.order_confirmation_item_id, lot_id: l.lot_id, quantity: quantities[stockKey(l)] }))
      : lines.filter((l) => String(quantities[String(l.id)] || '').trim() !== '').map((l) => ({ purchase_order_item_id: l.id, quantity: quantities[String(l.id)] }));
    const payload = {
      ...header,
      location_id: type === STOCK ? Number(header.location_id) : null,
      buyer_id: header.buyer_id ? Number(header.buyer_id) : null,
      items,
      ...(dispatchId ? {} : {
        dispatch_type: type,
        company_id: Number(companyId),
        ...(type === STOCK ? { order_confirmation_id: Number(sourceId) } : { purchase_order_id: Number(sourceId) }),
      }),
    };
    try {
      const res = dispatchId ? await apiClient.put(`/dispatches/${dispatchId}`, payload) : await apiClient.post('/dispatches', payload);
      router.push(`/dispatch/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save dispatch']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const hasQuantity = Object.values(quantities).some((v) => String(v || '').trim() !== '');
  const orderLinked = type === DIRECT && source?.order_confirmation_id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Dispatch" icon="bi-truck" subtitle="Stock dispatch reduces finished stock when posted. A direct supplier dispatch records the mill shipping a PO straight to the customer — no stock is involved.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Type *</label>
            {dispatchId ? (
              <div className="py-1.5 text-sm">{DISPATCH_TYPE_LABELS[type]}</div>
            ) : (
              <select value={type} onChange={(e) => changeType(e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                {Object.entries(DISPATCH_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className={LABEL}>Company *</label>
            {dispatchId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={companyId} onChange={changeCompany} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className={LABEL}>{type === STOCK ? 'Order *' : 'Purchase Order *'}</label>
            {dispatchId ? (
              <div className="py-1.5 font-mono text-sm">{type === STOCK ? saved?.oc_num : saved?.po_num}</div>
            ) : type === STOCK ? (
              <select required value={sourceId} onChange={changeSource} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (options.orders?.length ? '— Select a confirmed order —' : 'No order with allocated production to dispatch') : 'Select a company first'}</option>
                {(options.orders || []).map((o) => <option key={o.id} value={o.id}>{o.oc_num} · {o.buyer_name}</option>)}
                {source && !(options.orders || []).some((o) => String(o.id) === String(sourceId)) && <option value={sourceId}>{source.oc_num}</option>}
              </select>
            ) : (
              <select required value={sourceId} onChange={changeSource} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (options.purchase_orders?.length ? '— Select a confirmed PO —' : 'No PO with quantity outstanding') : 'Select a company first'}</option>
                {(options.purchase_orders || []).map((p) => <option key={p.id} value={p.id}>{p.po_num} · {p.supplier_name}</option>)}
                {source && !(options.purchase_orders || []).some((p) => String(p.id) === String(sourceId)) && <option value={sourceId}>{source.po_num}</option>}
              </select>
            )}
            {type === DIRECT && source && <p className="text-xs text-gray-500 mt-1">Supplier / mill: {source.supplier_name}{source.oc_num ? ` · order ${source.oc_num} (${source.order_buyer_name})` : ''}</p>}
          </div>
          <div>
            <label className={LABEL}>Dispatch Date *</label>
            <input type="date" required value={header.dispatch_date} onChange={set('dispatch_date')} className={INPUT} />
          </div>
          {type === STOCK && (
            <div>
              <label className={LABEL}>Source Location *</label>
              <select required value={header.location_id} onChange={changeLocation} disabled={!sourceId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">— Select —</option>
                {(options.locations || []).map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
              </select>
            </div>
          )}
          {type === DIRECT && !orderLinked && (
            <div>
              <label className={LABEL}>Customer (buyer)</label>
              <select value={header.buyer_id} onChange={set('buyer_id')} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">—</option>
                {(options.buyers || []).map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={LABEL}>Destination (customer / vendor){type === DIRECT && !orderLinked ? ' — or select a buyer' : ''}</label>
            <input type="text" maxLength={200} value={header.destination_name} onChange={set('destination_name')} className={INPUT} />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL}>Destination address</label>
            <textarea rows={2} maxLength={1000} value={header.destination_address} onChange={set('destination_address')} className={INPUT}></textarea>
          </div>
          <div>
            <label className={LABEL}>Transporter</label>
            <input type="text" maxLength={150} value={header.transporter} onChange={set('transporter')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Vehicle No.</label>
            <input type="text" maxLength={50} value={header.vehicle_no} onChange={set('vehicle_no')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Document ref. (LR / challan)</label>
            <input type="text" maxLength={100} value={header.document_reference} onChange={set('document_reference')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Invoice / bill ref.</label>
            <input type="text" maxLength={100} value={header.invoice_reference} onChange={set('invoice_reference')} className={INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Remarks</label>
            <input type="text" maxLength={2000} value={header.remarks} onChange={set('remarks')} className={INPUT} />
          </div>
        </div>
        {type === STOCK && <p className="text-xs text-gray-500 mt-2 mb-0">The customer is the order&apos;s buyer.</p>}
      </FormSection>

      <FormSection title="Lines" icon="bi-list-check" subtitle={type === STOCK ? 'Finished lots allocated to the order. Enter a quantity for each line to dispatch.' : 'PO lines. A line can be received (GRN) or direct-dispatched; together never above its ordered quantity.'}>
        {!sourceId ? <p className="text-sm text-gray-500 m-0">Select {type === STOCK ? 'an order' : 'a purchase order'} first.</p>
          : type === STOCK && !header.location_id ? <p className="text-sm text-gray-500 m-0">Select the source location to see its stock.</p>
          : lines.length === 0 ? <p className="text-sm text-gray-500 m-0">{type === STOCK ? 'No finished production is allocated to this order.' : 'This PO has no lines.'}</p>
          : type === STOCK ? (
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Order item</th><th className="py-1.5 font-medium">Finished lot</th><th className="py-1.5 font-medium text-right">Allocated</th><th className="py-1.5 font-medium text-right">Dispatched</th><th className="py-1.5 font-medium text-right">Left to dispatch</th><th className="py-1.5 font-medium text-right">In stock here</th><th className="py-1.5 font-medium w-36">Dispatch qty</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l) => {
                  const key = stockKey(l);
                  const left = Number(l.allocated_quantity) - Number(l.dispatched_quantity);
                  const value = quantities[key] || '';
                  const over = value !== '' && (micro(value) > micro(left) || micro(value) > micro(l.stock_at_location));
                  return (
                    <tr key={key}>
                      <td className="py-1.5">{l.design_no || l.item_description || l.product_name}</td>
                      <td className="py-1.5 font-mono text-xs">{l.lot_no} <span className="font-sans text-gray-500">({l.processing_no})</span></td>
                      <td className="py-1.5 text-right">{formatQuantity(l.allocated_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right text-gray-600">{formatQuantity(l.dispatched_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatQuantity(left, l.uom_decimal_places)} {l.unit}</td>
                      <td className="py-1.5 text-right">{formatQuantity(l.stock_at_location, l.uom_decimal_places)}</td>
                      <td className="py-1.5">
                        <input type="number" min="0" step={stepFor(l.uom_decimal_places)} value={value} onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })} disabled={left <= 0} className={`${INPUT} text-right`} />
                        {over && <div className="text-xs text-red-600">Above what is available</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">PO line</th><th className="py-1.5 font-medium text-right">Ordered</th><th className="py-1.5 font-medium text-right">Received (GRN)</th><th className="py-1.5 font-medium text-right">Direct-dispatched</th><th className="py-1.5 font-medium text-right">Remaining</th><th className="py-1.5 font-medium w-36">Dispatch qty</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l) => {
                  const value = quantities[String(l.id)] || '';
                  const over = value !== '' && micro(value) > micro(l.pending_quantity);
                  return (
                    <tr key={l.id}>
                      <td className="py-1.5">{l.product_name || l.description || `Line ${l.id}`}</td>
                      <td className="py-1.5 text-right">{formatQuantity(l.ordered_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right text-gray-600">{formatQuantity(l.received_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right text-gray-600">{formatQuantity(l.direct_dispatched_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatQuantity(Math.max(Number(l.pending_quantity), 0), l.uom_decimal_places)} {l.unit}</td>
                      <td className="py-1.5">
                        <input type="number" min="0" step={stepFor(l.uom_decimal_places)} value={value} onChange={(e) => setQuantities({ ...quantities, [String(l.id)]: e.target.value })} disabled={!l.product_id || Number(l.pending_quantity) <= 0} className={`${INPUT} text-right`} />
                        {over && <div className="text-xs text-red-600">Above the remaining quantity</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !hasQuantity} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {dispatchId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={dispatchId ? `/dispatch/${dispatchId}` : '/dispatch'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
      </div>
    </form>
  );
}
