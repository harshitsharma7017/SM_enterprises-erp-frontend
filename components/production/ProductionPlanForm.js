'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import CompanySelect from '@/components/company/CompanySelect';
import { apiClient } from '@/lib/api-client';
import { todayDateInputValue } from '@/components/sales/shared/format';
const EMPTY_LINE = { product_id: '', planned_quantity: '', order_confirmation_item_id: '', remarks: '' };
const stepFor = (dp) => (Number(dp) > 0 ? (1 / 10 ** Number(dp)).toFixed(Number(dp)) : '1');

/**
 * Production plan (draft): what to produce — a finished product of the
 * company, the planned quantity in its UOM and, optionally, the confirmed
 * order line it is for. Company is fixed once saved.
 */
export default function ProductionPlanForm({ planId = null }) {
  const router = useRouter();
  const [header, setHeader] = useState({ company_id: '', title: '', plan_date: todayDateInputValue(), target_date: '', remarks: '' });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [options, setOptions] = useState({ products: [], order_items: [] });
  const [companyLabel, setCompanyLabel] = useState('');
  const [loading, setLoading] = useState(!!planId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const loadOptions = useCallback(async (companyId) => {
    if (!companyId) {
      setOptions({ products: [], order_items: [] });
      return;
    }
    try {
      const res = await apiClient.get(`/production/plans/form-data?company_id=${companyId}`);
      setOptions(res.data || { products: [], order_items: [] });
    } catch (err) {
      setErrors([err.message || 'Failed to load products']);
    }
  }, []);

  useEffect(() => {
    if (!planId) return;
    apiClient.get(`/production/plans/${planId}`).then(async (res) => {
      const p = res.data;
      if (p.status !== 'draft') {
        router.replace(`/production/plans/${planId}`);
        return;
      }
      setCompanyLabel(p.company_label || p.company_code || '');
      setHeader({ company_id: String(p.company_id), title: p.title, plan_date: String(p.plan_date).slice(0, 10), target_date: p.target_date ? String(p.target_date).slice(0, 10) : '', remarks: p.remarks || '' });
      setLines(p.items.map((i) => ({ product_id: String(i.product_id), planned_quantity: String(Number(i.planned_quantity)), order_confirmation_item_id: i.order_confirmation_item_id ? String(i.order_confirmation_item_id) : '', remarks: i.remarks || '' })));
      await loadOptions(p.company_id);
      setLoading(false);
    }).catch((err) => {
      setErrors([err.message || 'Failed to load the plan']);
      setLoading(false);
    });
  }, [planId, router, loadOptions]);

  const setField = (name) => (e) => setHeader((h) => ({ ...h, [name]: e.target.value }));
  const changeCompany = (e) => {
    const companyId = e.target.value;
    setHeader((h) => ({ ...h, company_id: companyId }));
    setLines([{ ...EMPTY_LINE }]);
    loadOptions(companyId);
  };
  const setLine = (i, patch) => setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const productOf = (id) => options.products.find((p) => String(p.id) === String(id));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = { ...header, items: lines.filter((l) => l.product_id || l.planned_quantity) };
    try {
      const res = planId ? await apiClient.put(`/production/plans/${planId}`, payload) : await apiClient.post('/production/plans', payload);
      router.push(`/production/plans/${res.data?.id || planId}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [err.message || 'Failed to save the production plan']);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-fg-subtle">Loading…</div>;

  return (
    <form onSubmit={submit}>
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
          <ul className="list-disc pl-5 m-0">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      <Card title="Plan" variant="primary">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Company *</label>
            {planId ? <input type="text" readOnly value={companyLabel} className={`form-input`} /> : <CompanySelect value={header.company_id} onChange={changeCompany} required />}
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-fg-muted mb-1">Title *</label>
            <input type="text" required maxLength={200} value={header.title} onChange={setField('title')} placeholder="e.g. HB waistbands — October" className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Plan date *</label>
            <input type="date" required value={header.plan_date} onChange={setField('plan_date')} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Target date</label>
            <input type="date" value={header.target_date} min={header.plan_date} onChange={setField('target_date')} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-fg-muted mb-1">Remarks</label>
            <input type="text" maxLength={2000} value={header.remarks} onChange={setField('remarks')} className="form-input" />
          </div>
        </div>
      </Card>

      <Card title="What to produce" variant="info">
        {!header.company_id ? <p className="text-sm text-fg-subtle m-0">Select the company first.</p> : (
          <>
            <table className="data-table">
              <thead>
                <tr><th className="w-8">#</th><th>Product *</th><th className="w-40 text-right">Planned quantity *</th><th className="w-16">UOM</th><th>For order line</th><th>Remarks</th><th className="w-8"></th></tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const product = productOf(line.product_id);
                  const orderLines = options.order_items.filter((o) => String(o.product_id) === String(line.product_id));
                  return (
                    <tr key={i} className="align-top">
                      <td>{i + 1}</td>
                      <td className="pr-2">
                        <select value={line.product_id} onChange={(e) => setLine(i, { product_id: e.target.value, order_confirmation_item_id: '' })} className="form-select">
                          <option value="">— Select —</option>
                          {options.products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.item_group_code ? ` (${p.item_group_code})` : ''}</option>)}
                        </select>
                      </td>
                      <td className="pr-2"><input type="number" min="0" step={stepFor(product?.uom_decimal_places)} value={line.planned_quantity} onChange={(e) => setLine(i, { planned_quantity: e.target.value })} className={`form-input text-right`} /></td>
                      <td className="pr-2 text-fg-muted pt-3">{product?.uom_code || '—'}</td>
                      <td className="pr-2">
                        <select value={line.order_confirmation_item_id} onChange={(e) => setLine(i, { order_confirmation_item_id: e.target.value })} disabled={!line.product_id} className="form-select">
                          <option value="">{line.product_id ? (orderLines.length ? '— None (stock) —' : 'No confirmed order line') : 'Select a product first'}</option>
                          {orderLines.map((o) => <option key={o.id} value={o.id}>{o.oc_num} · {o.design_no || 'line'} · {o.qty} {o.unit || ''}</option>)}
                        </select>
                      </td>
                      <td className="pr-2"><input type="text" maxLength={1000} value={line.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} className="form-input" /></td>
                      <td className="text-right"><button type="button" onClick={() => setLines((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ ...EMPTY_LINE }]))} className="text-[var(--danger)] hover:text-red-800 pt-1.5" title="Remove line"><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button type="button" onClick={() => setLines((rows) => [...rows, { ...EMPTY_LINE }])} className="mt-2 px-3 py-1.5 border border-line-strong rounded text-sm text-fg-muted hover:bg-surface-hover"><i className="bi bi-plus-lg mr-1"></i>Add product</button>
            <p className="text-xs text-fg-subtle mt-2 mb-0">Planned quantity is in the product&apos;s UOM. Material needs are worked out from each product&apos;s BOM on the plan page.</p>
          </>
        )}
      </Card>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-60"><i className="bi bi-check-lg mr-1"></i> {planId ? 'Update' : 'Save'} Draft</button>
        <Link href={planId ? `/production/plans/${planId}` : '/production/plans'} className="px-4 py-2 border border-line-strong rounded-md text-sm text-fg-muted bg-surface hover:bg-surface-hover no-underline">Cancel</Link>
      </div>
    </form>
  );
}
