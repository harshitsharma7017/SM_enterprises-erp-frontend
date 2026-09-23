'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import { PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');

// Normalise a source row (requirement or plan line) into a form line.
const toLine = (c, origin, values = {}) => ({
  source_id: origin === 'material_plan' ? c.material_plan_item_id : (c.material_requirement_id ?? c.id),
  requirement_no: c.requirement_no,
  projection_no: c.projection_no,
  brand_name: c.brand_name,
  product_name: c.product_name,
  uom_code: c.uom_code,
  uom_decimal_places: c.uom_decimal_places,
  required_quantity: c.required_quantity,
  planned_quantity: c.planned_quantity,
  ordered_quantity_total: c.ordered_quantity,
  remaining: Number(c.remaining_quantity),
  ordered_quantity: '',
  cost_price: '',
  remarks: '',
  ...values,
});

const emptyHeader = () => ({
  origin: 'material_requirement',
  company_id: '',
  material_plan_id: '',
  supplier_id: '',
  po_date: todayDateInputValue(),
  dispatch_date: '',
  delivery_details: '',
  packing_details: '',
  remarks: '',
});

/**
 * Purchase order raised straight from garment planning (no order
 * confirmation): Company → Supplier/Mill → Material Requirement or Material
 * Plan → lines. Product, UOM and source come from the requirement; the
 * server re-checks every rule and quantity.
 */
export default function PlanningPoForm({ poId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!poId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [header, setHeader] = useState(emptyHeader);
  const [saved, setSaved] = useState(null); // the PO being edited
  const [suppliers, setSuppliers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [candidates, setCandidates] = useState([]); // requirement rows or plan lines
  const [lines, setLines] = useState([]);
  const [pick, setPick] = useState('');

  const isPlan = header.origin === 'material_plan';
  const sourceKey = isPlan ? 'material_plan_item_id' : 'material_requirement_id';
  const confirmed = saved?.status === 'raised';

  const loadSources = useCallback(async ({ companyId, origin, planId, purchaseOrderId }) => {
    if (!companyId) {
      setSuppliers([]); setPlans([]); setCandidates([]);
      return null;
    }
    const q = new URLSearchParams({ company_id: companyId, origin });
    if (planId) q.set('material_plan_id', planId);
    if (purchaseOrderId) q.set('purchase_order_id', purchaseOrderId);
    const res = await apiClient.get(`/procurement/purchase-orders/procurement-sources?${q.toString()}`);
    const data = res.data || {};
    setSuppliers(data.suppliers || []);
    setPlans(data.plans || []);
    setCandidates(origin === 'material_plan' ? (data.lines || []) : (data.requirements || []));
    return data;
  }, []);

  // Edit: load the PO, then its sources with its own quantity added back.
  useEffect(() => {
    if (!poId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get(`/procurement/purchase-orders/${poId}`);
        const po = res.data;
        if (!mounted || !po) return;
        if (po.origin === 'order_confirmation' || !['draft', 'raised'].includes(po.status)) {
          router.replace(`/procurement/purchase-orders/${poId}`);
          return;
        }
        setSaved(po);
        setHeader({
          origin: po.origin,
          company_id: po.company_id,
          material_plan_id: po.material_plan_id || '',
          supplier_id: po.supplier_id,
          po_date: toDateInputValue(po.po_date),
          dispatch_date: toDateInputValue(po.dispatch_date),
          delivery_details: po.delivery_details || '',
          packing_details: po.packing_details || '',
          remarks: po.remarks || '',
        });
        const data = await loadSources({ companyId: po.company_id, origin: po.origin, planId: po.material_plan_id, purchaseOrderId: po.id });
        const rows = po.origin === 'material_plan' ? (data?.lines || []) : (data?.requirements || []);
        const byKey = Object.fromEntries(rows.map((r) => [po.origin === 'material_plan' ? r.material_plan_item_id : r.id, r]));
        setLines(po.items.map((item) => {
          const key = po.origin === 'material_plan' ? item.material_plan_item_id : item.material_requirement_id;
          const src = byKey[key] || { ...item.trace, id: item.material_requirement_id, material_plan_item_id: item.material_plan_item_id, remaining_quantity: item.ordered_quantity };
          return toLine(src, po.origin, {
            ordered_quantity: String(Number(item.ordered_quantity)),
            cost_price: item.cost_price == null ? '' : String(Number(item.cost_price)),
            remarks: item.remarks || '',
          });
        }));
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load purchase order']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [poId, router, loadSources]);

  const handleChange = (e) => setHeader((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Company / origin / plan define the sources, so changing them clears the lines.
  const resetSources = (patch) => {
    const next = { ...header, ...patch };
    setHeader(next);
    setLines([]);
    setPick('');
    loadSources({ companyId: next.company_id, origin: next.origin, planId: next.material_plan_id })
      .catch((err) => setErrors([err.message || 'Failed to load procurement sources']));
  };

  const available = candidates.filter((c) => {
    const key = isPlan ? c.material_plan_item_id : c.id;
    return Number(c.remaining_quantity) > 0 && !lines.some((l) => String(l.source_id) === String(key));
  });

  const addLine = () => {
    const c = candidates.find((x) => String(isPlan ? x.material_plan_item_id : x.id) === String(pick));
    if (!c) return;
    setLines((prev) => [...prev, toLine(c, header.origin, { ordered_quantity: String(Number(c.remaining_quantity)) })]);
    setPick('');
  };

  const updateLine = (index, patch) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...header,
      items: lines.map((l) => ({ [sourceKey]: l.source_id, ordered_quantity: l.ordered_quantity, cost_price: l.cost_price, remarks: l.remarks })),
    };
    try {
      const res = poId
        ? await apiClient.put(`/procurement/purchase-orders/${poId}`, payload)
        : await apiClient.post('/procurement/purchase-orders', payload);
      router.push(`/procurement/purchase-orders/${res.data.id}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [err.message || 'Failed to save purchase order']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading purchase order...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      {confirmed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-3 text-sm">
          This purchase order is confirmed: supplier and lines are fixed. Only quantities (within what remains), prices, dates and notes can change.
        </div>
      )}

      <FormSection title="Source & Supplier" icon="bi-diagram-3" subtitle="A planning PO needs no inquiry or order confirmation.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Origin <span className="text-red-500">*</span></label>
            {poId ? (
              <div className="py-1.5 text-sm text-gray-900">{PO_ORIGIN_LABELS[header.origin]}</div>
            ) : (
              <select value={header.origin} onChange={(e) => resetSources({ origin: e.target.value, material_plan_id: '' })} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="material_requirement">Material Requirement</option>
                <option value="material_plan">Material Plan</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
            {poId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={header.company_id} onChange={(e) => resetSources({ company_id: e.target.value, supplier_id: '', material_plan_id: '' })} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier / Mill <span className="text-red-500">*</span></label>
            <select name="supplier_id" required value={header.supplier_id} onChange={handleChange} disabled={!header.company_id || confirmed} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
              <option value="">{header.company_id ? '— Select supplier —' : 'Select a company first'}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}{s.display_code ? ` (${s.display_code})` : ''}{s.company_id ? '' : ' · shared'}</option>)}
            </select>
          </div>
          {isPlan && (
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Material Plan <span className="text-red-500">*</span></label>
              {poId ? (
                <div className="py-1.5 font-mono text-sm text-gray-900">{saved?.material_plan_no}</div>
              ) : (
                <select value={header.material_plan_id} onChange={(e) => resetSources({ material_plan_id: e.target.value })} disabled={!header.company_id} required className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                  <option value="">{header.company_id ? (plans.length ? '— Select a planned material plan —' : 'No planned material plans for this company') : 'Select a company first'}</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.plan_no} · {p.title} ({p.items_count} lines)</option>)}
                </select>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PO Date <span className="text-red-500">*</span></label>
            <input type="date" name="po_date" required value={header.po_date} onChange={handleChange} className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dispatch Date</label>
            <input type="date" name="dispatch_date" value={header.dispatch_date} onChange={handleChange} className={INPUT} />
          </div>
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Details</label>
              <textarea name="delivery_details" rows={2} maxLength={2000} value={header.delivery_details} onChange={handleChange} placeholder="e.g. dispatch directly to the customer's vendor" className={INPUT}></textarea>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Packing Details</label>
              <textarea name="packing_details" rows={2} maxLength={2000} value={header.packing_details} onChange={handleChange} className={INPUT}></textarea>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
              <textarea name="remarks" rows={2} maxLength={1000} value={header.remarks} onChange={handleChange} className={INPUT}></textarea>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Materials to Order" icon="bi-box-seam" subtitle="Product, UOM and source come from the requirement. You cannot order more than what remains.">
        {!confirmed && (
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs text-gray-500 mb-1">Add {isPlan ? 'plan line' : 'material requirement'}</label>
              <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!header.company_id || (isPlan && !header.material_plan_id)} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{available.length ? '— Select —' : 'Nothing left to order'}</option>
                {available.map((c) => {
                  const key = isPlan ? c.material_plan_item_id : c.id;
                  return (
                    <option key={key} value={key}>
                      {c.requirement_no} · {c.product_name} · {c.brand_name} — {formatQuantity(c.remaining_quantity, c.uom_decimal_places)} {c.uom_code} remaining
                    </option>
                  );
                })}
              </select>
            </div>
            <button type="button" onClick={addLine} disabled={!pick} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <i className="bi bi-plus-lg mr-1"></i> Add
            </button>
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Material / Requirement</th>
                <th className="px-3 py-2 font-medium text-right">Required</th>
                {isPlan && <th className="px-3 py-2 font-medium text-right">Planned</th>}
                <th className="px-3 py-2 font-medium text-right">Ordered</th>
                <th className="px-3 py-2 font-medium text-right">Remaining</th>
                <th className="px-3 py-2 font-medium w-36 text-right">Order Qty</th>
                <th className="px-3 py-2 font-medium">UOM</th>
                <th className="px-3 py-2 font-medium w-28 text-right">₹/Unit</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                {!confirmed && <th className="px-3 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lines.length === 0 ? (
                <tr><td colSpan={isPlan ? 10 : 9} className="px-3 py-6 text-center text-gray-500">No materials added yet.</td></tr>
              ) : lines.map((line, index) => (
                <tr key={line.source_id}>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{line.product_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{line.requirement_no} · {line.projection_no} · {line.brand_name}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{formatQuantity(line.required_quantity, line.uom_decimal_places)}</td>
                  {isPlan && <td className="px-3 py-2 text-right">{formatQuantity(line.planned_quantity, line.uom_decimal_places)}</td>}
                  <td className="px-3 py-2 text-right text-gray-600">{formatQuantity(line.ordered_quantity_total, line.uom_decimal_places)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatQuantity(line.remaining, line.uom_decimal_places)}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" max={line.remaining} step={stepFor(line.uom_decimal_places)} required value={line.ordered_quantity} onChange={(e) => updateLine(index, { ordered_quantity: e.target.value })} className={`${INPUT} text-right`} />
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-600">{line.uom_code}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.01" value={line.cost_price} onChange={(e) => updateLine(index, { cost_price: e.target.value })} className={`${INPUT} text-right`} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" maxLength={1000} value={line.remarks} onChange={(e) => updateLine(index, { remarks: e.target.value })} className={INPUT} />
                  </td>
                  {!confirmed && (
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700" title="Remove line"><i className="bi bi-x-lg"></i></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">Ordered counts confirmed purchase orders; quantities on other draft POs are held and already excluded from Remaining.</p>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || lines.length === 0} className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm ${saving || lines.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <i className="bi bi-check-lg mr-1"></i> {poId ? 'Update' : 'Save Draft'} PO
        </button>
        <Link href={poId ? `/procurement/purchase-orders/${poId}` : '/procurement/purchase-orders'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
