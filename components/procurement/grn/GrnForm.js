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
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const newSplit = (poLineId, values = {}) => ({
  key: Math.random().toString(36).slice(2),
  purchase_order_item_id: poLineId,
  received_quantity: '',
  width_inch: '',
  supplier_lot_no: '',
  remarks: '',
  ...values,
});

/**
 * Goods receipt (GRN) against a confirmed purchase order. Material, UOM and
 * PO figures come from the PO line; each receipt split carries its own
 * quantity and width, so one PO line can be received at several widths.
 * The server re-checks every quantity with the PO lines locked.
 */
export default function GrnForm({ grnId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!grnId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [pos, setPos] = useState([]);
  const [poId, setPoId] = useState('');
  const [po, setPo] = useState(null);
  const [poLines, setPoLines] = useState([]);
  const [splits, setSplits] = useState([]);
  const [header, setHeader] = useState({ inward_date: todayDateInputValue(), challan_no: '', challan_date: '', remarks: '' });

  const loadPoLines = useCallback(async (id) => {
    if (!id) {
      setPo(null);
      setPoLines([]);
      return;
    }
    const res = await apiClient.get(`/procurement/inward-entries/po-details/${id}`);
    setPo(res.data?.purchase_order || null);
    setPoLines(res.data?.lines || []);
  }, []);

  // Edit: a draft GRN, its PO fixed.
  useEffect(() => {
    if (!grnId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get(`/procurement/inward-entries/${grnId}`);
        const g = res.data;
        if (!mounted || !g) return;
        if (g.entry_type !== 'grn' || g.receipt_status !== 'draft') {
          router.replace(`/procurement/grn/${grnId}`);
          return;
        }
        setSaved(g);
        setCompanyId(g.company_id);
        setPoId(g.purchase_order_id);
        setHeader({
          inward_date: toDateInputValue(g.inward_date),
          challan_no: g.challan_no || '',
          challan_date: toDateInputValue(g.challan_date),
          remarks: g.remarks || '',
        });
        setSplits(g.items.map((i) => newSplit(i.purchase_order_item_id, {
          received_quantity: String(Number(i.received_quantity)),
          width_inch: String(Number(i.width_inch)),
          supplier_lot_no: i.supplier_lot_no || '',
          remarks: i.remarks || '',
        })));
        await loadPoLines(g.purchase_order_id);
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load goods receipt']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [grnId, router, loadPoLines]);

  const handleCompanyChange = async (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setPoId('');
    setSplits([]);
    await loadPoLines(null);
    if (!value) {
      setPos([]);
      return;
    }
    try {
      const res = await apiClient.get(`/procurement/inward-entries/eligible-pos?company_id=${value}`);
      setPos(res.data || []);
    } catch (err) {
      setErrors([err.message || 'Failed to load purchase orders']);
    }
  };

  const handlePoChange = async (e) => {
    const value = e.target.value;
    setPoId(value);
    setSplits([]);
    try {
      await loadPoLines(value);
    } catch (err) {
      setErrors([err.message || 'Failed to load purchase order lines']);
    }
  };

  const addSplit = (line) => setSplits((prev) => [...prev, newSplit(line.id, {
    received_quantity: prev.some((s) => s.purchase_order_item_id === line.id) ? '' : String(Math.max(Number(line.pending_quantity), 0)),
  })]);
  const updateSplit = (key, patch) => setSplits((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const removeSplit = (key) => setSplits((prev) => prev.filter((s) => s.key !== key));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...header,
      items: splits.map(({ key, ...s }) => s),
      ...(grnId ? {} : { purchase_order_id: Number(poId), company_id: Number(companyId) }),
    };
    try {
      const res = grnId
        ? await apiClient.put(`/procurement/inward-entries/${grnId}`, payload)
        : await apiClient.post('/procurement/inward-entries', payload);
      router.push(`/procurement/grn/${res.data.id}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      const messages = Array.isArray(list) ? list : (list && typeof list === 'object' ? Object.values(list).flat() : []);
      setErrors(messages.length ? messages : [err.message || 'Failed to save goods receipt']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-fg-subtle">Loading goods receipt...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Purchase Order" icon="bi-cart-check" subtitle="A goods receipt is always recorded against a confirmed purchase order.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Company <span className="text-[var(--danger)]">*</span></label>
            {grnId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={companyId} onChange={handleCompanyChange} required />
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-fg-muted mb-1">Purchase Order <span className="text-[var(--danger)]">*</span></label>
            {grnId ? (
              <div className="py-1.5 font-mono text-sm">{saved?.purchase_order_num}</div>
            ) : (
              <select value={poId} onChange={handlePoChange} required disabled={!companyId} className="form-select">
                <option value="">{companyId ? (pos.length ? '— Select a confirmed PO with quantity to receive —' : 'No purchase orders awaiting receipt') : 'Select a company first'}</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_num} · {p.supplier_name} · {PO_ORIGIN_LABELS[p.origin]}{p.oc_num ? ` ${p.oc_num}` : ''}{p.material_plan_no ? ` ${p.material_plan_no}` : ''}
                  </option>
                ))}
              </select>
            )}
            {po && <p className="text-xs text-fg-subtle mt-1">Supplier: {po.supplier_name} — taken from the PO.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">GRN Date <span className="text-[var(--danger)]">*</span></label>
            <input type="date" required value={header.inward_date} onChange={(e) => setHeader({ ...header, inward_date: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Challan / Bill No.</label>
            <input type="text" maxLength={255} value={header.challan_no} onChange={(e) => setHeader({ ...header, challan_no: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Challan Date</label>
            <input type="date" value={header.challan_date} onChange={(e) => setHeader({ ...header, challan_date: e.target.value })} className="form-input" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-fg-muted mb-1">Remarks</label>
            <textarea rows={2} maxLength={1000} value={header.remarks} onChange={(e) => setHeader({ ...header, remarks: e.target.value })} className="form-textarea"></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Received Material" icon="bi-box-arrow-in-down" subtitle="Add a receipt split per width. Width (inches) is required; one PO line may be received at several widths.">
        {poLines.length === 0 ? (
          <p className="text-sm text-fg-subtle m-0">{poId ? 'This purchase order has no lines.' : 'Select a purchase order to load its lines.'}</p>
        ) : (
          <div className="space-y-4">
            {poLines.map((line) => {
              const lineSplits = splits.filter((s) => s.purchase_order_item_id === line.id);
              const entered = lineSplits.reduce((sum, s) => sum + (Number(s.received_quantity) || 0), 0);
              const pending = Number(line.pending_quantity);
              const over = entered > pending + 1e-9;
              return (
                <div key={line.id} className="border border-line rounded-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-raised px-3 py-2 border-b border-line">
                    <div>
                      <div className="font-medium text-fg">{line.product_name || line.description || `PO line ${line.id}`}</div>
                      <div className="text-xs text-fg-subtle">
                        {line.requirement_no ? `${line.requirement_no} · ` : ''}Ordered {formatQuantity(line.ordered_quantity, line.uom_decimal_places)} · Received {formatQuantity(line.received_quantity, line.uom_decimal_places)} · <span className="font-medium text-fg-muted">Pending {formatQuantity(pending, line.uom_decimal_places)}</span> {line.unit}
                        {Number(line.draft_quantity) > 0 && <> · on draft GRNs {formatQuantity(line.draft_quantity, line.uom_decimal_places)}</>}
                      </div>
                    </div>
                    <button type="button" onClick={() => addSplit(line)} disabled={pending <= 0 || !line.product_id} className="px-2.5 py-1 border border-line-strong rounded text-xs text-fg-muted hover:bg-surface disabled:opacity-50">
                      <i className="bi bi-plus-lg mr-1"></i> Add receipt
                    </button>
                  </div>
                  {lineSplits.length > 0 && (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-40">Received Qty ({line.unit})</th>
                          <th className="w-32">Width (inch) *</th>
                          <th className="w-40">Mill Lot No.</th>
                          <th>Remarks</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineSplits.map((s) => (
                          <tr key={s.key}>
                            <td><input type="number" required min="0" step={stepFor(line.uom_decimal_places)} value={s.received_quantity} onChange={(e) => updateSplit(s.key, { received_quantity: e.target.value })} className={`form-input text-right`} /></td>
                            <td><input type="number" required min="0" step="0.001" value={s.width_inch} onChange={(e) => updateSplit(s.key, { width_inch: e.target.value })} className={`form-input text-right`} /></td>
                            <td><input type="text" maxLength={60} value={s.supplier_lot_no} onChange={(e) => updateSplit(s.key, { supplier_lot_no: e.target.value })} className="form-input" /></td>
                            <td><input type="text" maxLength={1000} value={s.remarks} onChange={(e) => updateSplit(s.key, { remarks: e.target.value })} className="form-input" /></td>
                            <td className="text-right"><button type="button" onClick={() => removeSplit(s.key)} className="text-[var(--danger)] hover:text-[var(--danger)]" title="Remove"><i className="bi bi-x-lg"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className={`${over ? 'text-[var(--danger)] font-medium' : 'text-fg-subtle'}`}>
                            This receipt: {formatQuantity(entered, line.uom_decimal_places)} of {formatQuantity(pending, line.uom_decimal_places)} {line.unit} pending{over ? ' — more than pending; it will be rejected' : ''}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      <div className="flex items-center gap-2 border-t border-line pt-4">
        <button type="submit" disabled={saving || splits.length === 0} className={`bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded font-medium text-sm ${saving || splits.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <i className="bi bi-check-lg mr-1"></i> {grnId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={grnId ? `/procurement/grn/${grnId}` : '/procurement/grn'} className="px-4 py-2 border border-line-strong rounded text-fg-muted hover:bg-surface-hover font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
