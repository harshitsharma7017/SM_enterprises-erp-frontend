'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import { DISPATCH_TYPE_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatDate, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);
const EMPTY_HEADER = { invoice_date: todayDateInputValue(), proforma_invoice_id: '', reference: '', remarks: '' };
const remaining = (l) => Math.max(Number(l.dispatched_quantity) - Number(l.invoiced_quantity), 0);
// Source of an invoice: one order (all its posted dispatch lines), or one direct dispatch with no order.
const sourceQuery = (key, invoiceId) => {
  const [kind, id] = String(key).split(':');
  const param = kind === 'order' ? 'order_confirmation_id' : 'dispatch_id';
  return `${param}=${id}${invoiceId ? `&invoice_id=${invoiceId}` : ''}`;
};

/**
 * Final invoice: bills POSTED dispatch lines only — never more than was
 * dispatched on a line, across issued invoices. Customer, order, currency,
 * product, UOM, lot and price come from the dispatch line and its order
 * item; nothing here moves stock or posts accounting entries. A draft is
 * unnumbered; the invoice number is assigned when it is issued.
 */
export default function InvoiceForm({ invoiceId = null, initialOrderId = '', initialDispatchId = '' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [sources, setSources] = useState({ orders: [], dispatches: [] });
  const [sourceKey, setSourceKey] = useState('');
  const [data, setData] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [header, setHeader] = useState(EMPTY_HEADER);

  const loadCompany = useCallback(async (company) => {
    if (!company) return;
    const res = await apiClient.get(`/finance/invoices/form-data?company_id=${company}`);
    setSources({ orders: res.data?.orders || [], dispatches: res.data?.dispatches || [] });
  }, []);

  const loadSource = useCallback(async (key, excludeInvoiceId = '') => {
    if (!key) {
      setData(null);
      return null;
    }
    const res = await apiClient.get(`/finance/invoices/form-data?${sourceQuery(key, excludeInvoiceId)}`);
    setData(res.data || null);
    return res.data;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (invoiceId) {
          const res = await apiClient.get(`/finance/invoices/${invoiceId}`);
          const inv = res.data;
          if (!mounted || !inv) return;
          if (inv.status !== 'draft') {
            router.replace(`/finance/invoices/${invoiceId}`);
            return;
          }
          setSaved(inv);
          setCompanyId(inv.company_id);
          const key = inv.order_confirmation_id ? `order:${inv.order_confirmation_id}` : `dispatch:${inv.items[0]?.dispatch_id}`;
          setSourceKey(key);
          setHeader({
            invoice_date: toDateInputValue(inv.invoice_date),
            proforma_invoice_id: inv.proforma_invoice_id || '',
            reference: inv.reference || '',
            remarks: inv.remarks || '',
          });
          setQuantities(Object.fromEntries(inv.items.map((i) => [String(i.dispatch_item_id), String(Number(i.quantity))])));
          await loadSource(key, inv.id);
        } else if (initialOrderId || initialDispatchId) {
          // Opened from an order or a dispatch: preload it (a dispatch of an order opens the order,
          // with that dispatch's remaining quantities filled in).
          const loaded = await loadSource(initialOrderId ? `order:${initialOrderId}` : `dispatch:${initialDispatchId}`);
          if (!mounted || !loaded) return;
          const key = loaded.order ? `order:${loaded.order.id}` : `dispatch:${loaded.dispatch.id}`;
          setSourceKey(key);
          const company = loaded.order?.company_id || loaded.dispatch?.company_id;
          if (company) {
            setCompanyId(company);
            await loadCompany(company);
          }
          if (initialDispatchId) {
            setQuantities(Object.fromEntries((loaded.lines || [])
              .filter((l) => String(l.dispatch_id) === String(initialDispatchId) && remaining(l) > 0)
              .map((l) => [String(l.dispatch_item_id), String(remaining(l))])));
          }
          if (loaded.proforma_invoices?.length === 1) setHeader((prev) => ({ ...prev, proforma_invoice_id: loaded.proforma_invoices[0].id }));
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load invoice']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [invoiceId, initialOrderId, initialDispatchId, router, loadSource, loadCompany]);

  const changeCompany = (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setSourceKey('');
    setData(null);
    setQuantities({});
    setHeader((prev) => ({ ...prev, proforma_invoice_id: '' }));
    loadCompany(value).catch((err) => setErrors([err.message]));
  };
  const changeSource = (e) => {
    const value = e.target.value;
    setSourceKey(value);
    setQuantities({});
    loadSource(value)
      .then((loaded) => setHeader((prev) => ({ ...prev, proforma_invoice_id: loaded?.proforma_invoices?.length === 1 ? loaded.proforma_invoices[0].id : '' })))
      .catch((err) => setErrors([err.message]));
  };
  const set = (name) => (e) => setHeader((prev) => ({ ...prev, [name]: e.target.value }));
  const lines = data?.lines || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const items = lines
      .filter((l) => String(quantities[String(l.dispatch_item_id)] || '').trim() !== '')
      .map((l) => ({ dispatch_item_id: l.dispatch_item_id, quantity: quantities[String(l.dispatch_item_id)] }));
    const payload = {
      ...header,
      proforma_invoice_id: header.proforma_invoice_id ? Number(header.proforma_invoice_id) : null,
      items,
      ...(invoiceId ? {} : { company_id: Number(companyId) }),
    };
    try {
      const res = invoiceId ? await apiClient.put(`/finance/invoices/${invoiceId}`, payload) : await apiClient.post('/finance/invoices', payload);
      router.push(`/finance/invoices/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save invoice']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const hasQuantity = Object.values(quantities).some((v) => String(v || '').trim() !== '');
  const total = lines.reduce((sum, l) => {
    const q = quantities[String(l.dispatch_item_id)];
    return l.price === null || !l.order_confirmation_item_id || !q ? sum : sum + Math.round(Number(q) * Number(l.price) * 100);
  }, 0);
  const sourceLabel = data?.order ? `${data.order.oc_num} · ${data.order.buyer_name}` : data?.dispatch ? data.dispatch.dispatch_no : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Invoice" icon="bi-file-earmark-check" subtitle="Bills posted dispatches. Customer, order, products and prices come from the dispatch lines and the order; no tax or other charges are calculated, and nothing is posted to accounts.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Company *</label>
            {invoiceId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={companyId} onChange={changeCompany} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className={LABEL}>Order / direct dispatch *</label>
            {invoiceId ? (
              <div className="py-1.5 font-mono text-sm">{sourceLabel}</div>
            ) : (
              <select required value={sourceKey} onChange={changeSource} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (sources.orders.length + sources.dispatches.length ? '— Select —' : 'Nothing dispatched to invoice') : 'Select a company first'}</option>
                {sources.orders.length > 0 && (
                  <optgroup label="Orders">
                    {sources.orders.map((o) => <option key={`o${o.id}`} value={`order:${o.id}`}>{o.oc_num} · {o.buyer_name}</option>)}
                  </optgroup>
                )}
                {sources.dispatches.length > 0 && (
                  <optgroup label="Direct supplier dispatches (no order)">
                    {sources.dispatches.map((d) => <option key={`d${d.id}`} value={`dispatch:${d.id}`}>{d.dispatch_no} · {d.buyer_name} · {d.po_num}</option>)}
                  </optgroup>
                )}
                {data && sourceKey && ![...sources.orders.map((o) => `order:${o.id}`), ...sources.dispatches.map((d) => `dispatch:${d.id}`)].includes(sourceKey) && <option value={sourceKey}>{sourceLabel}</option>}
              </select>
            )}
            {data?.order && <p className="text-xs text-gray-500 mt-1">Customer: {data.order.buyer_name} · Currency: {data.order.currency_code || '—'}</p>}
          </div>
          <div>
            <label className={LABEL}>Invoice Date *</label>
            <input type="date" required value={header.invoice_date} onChange={set('invoice_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Proforma invoice</label>
            <select value={header.proforma_invoice_id} onChange={set('proforma_invoice_id')} disabled={!data?.order} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
              <option value="">{data?.order ? (data.proforma_invoices?.length ? '— None —' : 'No issued PI on this order') : '—'}</option>
              {(data?.proforma_invoices || []).map((p) => <option key={p.id} value={p.id}>{p.pi_no} · {formatDate(p.pi_date)}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Reference</label>
            <input type="text" maxLength={100} value={header.reference} onChange={set('reference')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Remarks</label>
            <input type="text" maxLength={2000} value={header.remarks} onChange={set('remarks')} className={INPUT} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Lines" icon="bi-list-check" subtitle="Posted dispatch lines. A line can be invoiced up to what was dispatched on it, less what issued invoices already bill.">
        {!sourceKey ? <p className="text-sm text-gray-500 m-0">Select an order or a direct dispatch first.</p>
          : lines.length === 0 ? <p className="text-sm text-gray-500 m-0">No posted dispatch lines.</p>
          : (
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Dispatch</th><th className="py-1.5 font-medium">Product</th><th className="py-1.5 font-medium">Lot / PO</th><th className="py-1.5 font-medium text-right">Dispatched</th><th className="py-1.5 font-medium text-right">Invoiced</th><th className="py-1.5 font-medium text-right">Remaining</th><th className="py-1.5 font-medium text-right">Unit price</th><th className="py-1.5 font-medium w-32">Invoice qty</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l) => {
                  const key = String(l.dispatch_item_id);
                  const value = quantities[key] || '';
                  const left = remaining(l);
                  const over = value !== '' && micro(value) > micro(left);
                  const priced = l.order_confirmation_item_id && l.price !== null;
                  return (
                    <tr key={key}>
                      <td className="py-1.5"><span className="font-mono text-xs">{l.dispatch_no}</span><div className="text-xs text-gray-500">{formatDate(l.dispatch_date)} · {DISPATCH_TYPE_LABELS[l.dispatch_type]}</div></td>
                      <td className="py-1.5">{l.product_name}{(l.design_no || l.item_description) && <div className="text-xs text-gray-500">{[l.design_no, l.item_description].filter(Boolean).join(' — ')}</div>}</td>
                      <td className="py-1.5 font-mono text-xs">{l.lot_no || l.po_num}</td>
                      <td className="py-1.5 text-right">{formatQuantity(l.dispatched_quantity, l.uom_decimal_places)} {l.unit}</td>
                      <td className="py-1.5 text-right text-gray-600">{formatQuantity(l.invoiced_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatQuantity(left, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right">{priced ? formatAmount(l.price) : <span className="text-amber-700 text-xs">Not priced</span>}</td>
                      <td className="py-1.5">
                        <input type="number" min="0" step={stepFor(l.uom_decimal_places)} value={value} onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })} disabled={left <= 0 && value === ''} className={`${INPUT} text-right`} />
                        {over && <div className="text-xs text-red-600">Above the remaining quantity</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan="7" className="py-2 text-right text-xs text-gray-500">Total of priced lines {data?.order?.currency_code ? `(${data.order.currency_code})` : ''}</td><td className="py-2 text-right font-semibold">{formatAmount(total / 100)}</td></tr></tfoot>
            </table>
          )}
        {data?.dispatch && <p className="text-xs text-gray-500 mt-2 mb-0">Direct supplier dispatch with no order: there is no order price, so the lines stay unpriced. Who bills this delivery (mill or company) is still to be decided.</p>}
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !hasQuantity} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {invoiceId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={invoiceId ? `/finance/invoices/${invoiceId}` : '/finance/invoices'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
      </div>
    </form>
  );
}
