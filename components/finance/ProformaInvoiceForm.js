'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);
const EMPTY_HEADER = { pi_date: todayDateInputValue(), valid_until: '', reference: '', payment_terms: '', remarks: '' };
const remaining = (l) => Math.max(Number(l.ordered_quantity) - Number(l.proforma_quantity), 0);

/**
 * Proforma invoice on a confirmed order. Company, customer, currency,
 * product, unit and price all come from the order (the price is the order
 * item's own price — no tax / discount / charges); only quantities and
 * references are entered. A draft reserves nothing; issuing re-checks that
 * the order's issued PIs never exceed its ordered quantities.
 */
export default function ProformaInvoiceForm({ piId = null, initialOrderId = '' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [lines, setLines] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [header, setHeader] = useState(EMPTY_HEADER);

  const loadCompany = useCallback(async (company) => {
    if (!company) return;
    const res = await apiClient.get(`/finance/proforma-invoices/form-data?company_id=${company}`);
    setOrders(res.data?.orders || []);
  }, []);

  const loadOrder = useCallback(async (id, excludePiId = '') => {
    if (!id) {
      setOrder(null);
      setLines([]);
      return null;
    }
    const res = await apiClient.get(`/finance/proforma-invoices/form-data?order_confirmation_id=${id}${excludePiId ? `&proforma_invoice_id=${excludePiId}` : ''}`);
    setOrder(res.data?.order || null);
    setLines(res.data?.lines || []);
    return res.data;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (piId) {
          const res = await apiClient.get(`/finance/proforma-invoices/${piId}`);
          const pi = res.data;
          if (!mounted || !pi) return;
          if (pi.status !== 'draft') {
            router.replace(`/finance/proforma-invoices/${piId}`);
            return;
          }
          setSaved(pi);
          setCompanyId(pi.company_id);
          setOrderId(pi.order_confirmation_id);
          setHeader({
            pi_date: toDateInputValue(pi.pi_date),
            valid_until: toDateInputValue(pi.valid_until),
            reference: pi.reference || '',
            payment_terms: pi.payment_terms || '',
            remarks: pi.remarks || '',
          });
          setQuantities(Object.fromEntries(pi.items.map((i) => [String(i.order_confirmation_item_id), String(Number(i.quantity))])));
          await loadOrder(pi.order_confirmation_id, pi.id);
        } else if (initialOrderId) {
          // Opened from an order: preload it, its company and its payment terms.
          const data = await loadOrder(initialOrderId);
          if (data?.order?.company_id) {
            setCompanyId(data.order.company_id);
            setHeader((prev) => ({ ...prev, payment_terms: data.order.payment_terms || '' }));
            await loadCompany(data.order.company_id);
          }
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load proforma invoice']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [piId, initialOrderId, router, loadOrder, loadCompany]);

  const changeCompany = (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setOrderId('');
    setOrder(null);
    setLines([]);
    setQuantities({});
    loadCompany(value).catch((err) => setErrors([err.message]));
  };
  const changeOrder = (e) => {
    const value = e.target.value;
    setOrderId(value);
    setQuantities({});
    loadOrder(value)
      .then((data) => setHeader((prev) => ({ ...prev, payment_terms: data?.order?.payment_terms || '' })))
      .catch((err) => setErrors([err.message]));
  };
  const set = (name) => (e) => setHeader((prev) => ({ ...prev, [name]: e.target.value }));
  const fillRemaining = () => setQuantities(Object.fromEntries(lines.filter((l) => remaining(l) > 0).map((l) => [String(l.id), String(remaining(l))])));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const items = lines
      .filter((l) => String(quantities[String(l.id)] || '').trim() !== '')
      .map((l) => ({ order_confirmation_item_id: l.id, quantity: quantities[String(l.id)] }));
    const payload = { ...header, items, ...(piId ? {} : { company_id: Number(companyId), order_confirmation_id: Number(orderId) }) };
    try {
      const res = piId ? await apiClient.put(`/finance/proforma-invoices/${piId}`, payload) : await apiClient.post('/finance/proforma-invoices', payload);
      router.push(`/finance/proforma-invoices/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save proforma invoice']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const hasQuantity = Object.values(quantities).some((v) => String(v || '').trim() !== '');
  const total = lines.reduce((sum, l) => {
    const q = quantities[String(l.id)];
    return l.price === null || !q ? sum : sum + Math.round(Number(q) * Number(l.price) * 100);
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Proforma Invoice" icon="bi-file-earmark-text" subtitle="Raised on a confirmed order. Customer, currency, products and prices come from the order; no tax or other charges are calculated.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Company *</label>
            {piId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={companyId} onChange={changeCompany} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className={LABEL}>Order *</label>
            {piId ? (
              <div className="py-1.5 font-mono text-sm">{saved?.oc_num}</div>
            ) : (
              <select required value={orderId} onChange={changeOrder} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (orders.length ? '— Select a confirmed order —' : 'No confirmed order') : 'Select a company first'}</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.oc_num} · {o.buyer_name}</option>)}
                {order && !orders.some((o) => String(o.id) === String(orderId)) && <option value={orderId}>{order.oc_num}</option>}
              </select>
            )}
            {order && <p className="text-xs text-gray-500 mt-1">Customer: {order.buyer_name} · Currency: {order.currency_code || '—'}{order.status !== 'confirmed' ? ` · order is ${order.status}` : ''}</p>}
          </div>
          <div>
            <label className={LABEL}>PI Date *</label>
            <input type="date" required value={header.pi_date} onChange={set('pi_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Valid until</label>
            <input type="date" value={header.valid_until} onChange={set('valid_until')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Customer reference</label>
            <input type="text" maxLength={100} value={header.reference} onChange={set('reference')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Payment terms (from the order)</label>
            <input type="text" maxLength={255} value={header.payment_terms} onChange={set('payment_terms')} className={INPUT} />
          </div>
          <div className="md:col-span-3">
            <label className={LABEL}>Remarks</label>
            <input type="text" maxLength={2000} value={header.remarks} onChange={set('remarks')} className={INPUT} />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Lines"
        icon="bi-list-check"
        subtitle="Order items. Together, issued proforma invoices never exceed an item's ordered quantity."
      >
        {lines.some((l) => remaining(l) > 0) && (
          <div className="text-right mb-2"><button type="button" onClick={fillRemaining} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50">Fill remaining</button></div>
        )}
        {!orderId ? <p className="text-sm text-gray-500 m-0">Select an order first.</p>
          : lines.length === 0 ? <p className="text-sm text-gray-500 m-0">This order has no lines.</p>
          : (
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Order item</th><th className="py-1.5 font-medium text-right">Ordered</th><th className="py-1.5 font-medium text-right">On issued PIs</th><th className="py-1.5 font-medium text-right">Remaining</th><th className="py-1.5 font-medium text-right">Unit price</th><th className="py-1.5 font-medium w-36">PI qty</th><th className="py-1.5 font-medium text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l) => {
                  const value = quantities[String(l.id)] || '';
                  const left = remaining(l);
                  const over = value !== '' && micro(value) > micro(left);
                  return (
                    <tr key={l.id}>
                      <td className="py-1.5">{l.product_name || l.design_no || l.description || `Item ${l.id}`}{l.product_name && (l.design_no || l.description) && <div className="text-xs text-gray-500">{[l.design_no, l.description].filter(Boolean).join(' — ')}</div>}</td>
                      <td className="py-1.5 text-right">{formatQuantity(l.ordered_quantity, l.uom_decimal_places)} {l.unit}</td>
                      <td className="py-1.5 text-right text-gray-600">{formatQuantity(l.proforma_quantity, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatQuantity(left, l.uom_decimal_places)}</td>
                      <td className="py-1.5 text-right">{l.price === null ? <span className="text-amber-700 text-xs">Not priced on the order</span> : formatAmount(l.price)}</td>
                      <td className="py-1.5">
                        <input type="number" min="0" step={stepFor(l.uom_decimal_places)} value={value} onChange={(e) => setQuantities({ ...quantities, [String(l.id)]: e.target.value })} disabled={left <= 0 && value === ''} className={`${INPUT} text-right`} />
                        {over && <div className="text-xs text-red-600">Above the remaining quantity</div>}
                      </td>
                      <td className="py-1.5 text-right">{l.price === null || value === '' ? '—' : formatAmount(Number(value) * Number(l.price))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan="6" className="py-2 text-right text-xs text-gray-500">Total of priced lines {order?.currency_code ? `(${order.currency_code})` : ''}</td><td className="py-2 text-right font-semibold">{formatAmount(total / 100)}</td></tr></tfoot>
            </table>
          )}
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !hasQuantity} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {piId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={piId ? `/finance/proforma-invoices/${piId}` : '/finance/proforma-invoices'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
      </div>
    </form>
  );
}
