'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, formatQuantity } from '@/components/sales/shared/format';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');

/**
 * Create/edit form for a draft material plan. Lines are chosen from the
 * company's requirements that still have unplanned quantity; the server
 * re-checks company, status, UOM decimals and the available quantity.
 */
export default function PlanForm({ planId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [planNo, setPlanNo] = useState('');
  const [form, setForm] = useState({ company_id: '', title: '', period_start: '', period_end: '', remarks: '' });
  // { requirement fields..., available, planned_quantity, remarks }
  const [lines, setLines] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [pick, setPick] = useState('');

  const loadCandidates = useCallback(async (companyId) => {
    if (!companyId) {
      setCandidates([]);
      return;
    }
    try {
      const res = await apiClient.get(`/planning/material-requirements?company_id=${companyId}&plannable=1&limit=500`);
      setCandidates(res.data?.data || []);
    } catch (err) {
      setErrors([err.message || 'Failed to load material requirements']);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (planId) {
          const res = await apiClient.get(`/planning/material-plans/${planId}`);
          const p = res.data?.plan;
          if (!mounted || !p) return;
          if (p.status !== 'draft') {
            router.replace(`/planning/material-plans/${planId}`);
            return;
          }
          setPlanNo(p.plan_no);
          setForm({
            company_id: p.company_id,
            title: p.title || '',
            period_start: toDateInputValue(p.period_start),
            period_end: toDateInputValue(p.period_end),
            remarks: p.remarks || '',
          });
          setLines(p.items.map((i) => ({
            id: i.material_requirement_id,
            requirement_no: i.requirement_no,
            projection_no: i.projection_no,
            brand_name: i.brand_name,
            product_name: i.product_name,
            uom_code: i.uom_code,
            uom_decimal_places: i.uom_decimal_places,
            required_quantity: i.required_quantity,
            // This plan's own quantity is available to itself again while editing.
            available: Number(i.required_quantity) - (Number(i.requirement_allocated_quantity) - Number(i.planned_quantity)),
            planned_quantity: String(Number(i.planned_quantity)),
            remarks: i.remarks || '',
          })));
          await loadCandidates(p.company_id);
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load material plan']);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [planId, router, loadCandidates]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Requirements belong to one company, so a company change clears the lines.
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, company_id: value }));
    setLines([]);
    setPick('');
    loadCandidates(value);
  };

  const available = candidates.filter((c) => !lines.some((l) => l.id === c.id));

  const addLine = () => {
    const r = candidates.find((c) => String(c.id) === String(pick));
    if (!r) return;
    const qty = Number(r.available_quantity);
    setLines((prev) => [...prev, {
      id: r.id,
      requirement_no: r.requirement_no,
      projection_no: r.projection_no,
      brand_name: r.brand_name,
      product_name: r.product_name,
      uom_code: r.uom_code,
      uom_decimal_places: r.uom_decimal_places,
      required_quantity: r.required_quantity,
      available: qty,
      planned_quantity: String(qty),
      remarks: '',
    }]);
    setPick('');
  };

  const updateLine = (index, patch) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...form,
      items: lines.map((l) => ({ material_requirement_id: l.id, planned_quantity: l.planned_quantity, remarks: l.remarks })),
    };
    try {
      const res = planId
        ? await apiClient.put(`/planning/material-plans/${planId}`, payload)
        : await apiClient.post('/planning/material-plans', payload);
      router.push(`/planning/material-plans/${res.data.plan.id}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [err.message || 'Failed to save material plan']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-fg-subtle">Loading form data...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Material Plan" icon="bi-calendar2-week" subtitle="Organises material requirements into what needs to be prepared or purchased. No purchase orders are created.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Plan No.</label>
            <input type="text" readOnly value={planId ? planNo : 'Auto-generated (MP/…)'} className={`form-input border-dashed`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Company <span className="text-[var(--danger)]">*</span></label>
            <CompanySelect value={form.company_id} onChange={handleCompanyChange} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Title <span className="text-[var(--danger)]">*</span></label>
            <input type="text" name="title" required maxLength={200} value={form.title} onChange={handleChange} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Planning Period Start <span className="text-[var(--danger)]">*</span></label>
            <input type="date" name="period_start" required value={form.period_start} onChange={handleChange} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Planning Period End <span className="text-[var(--danger)]">*</span></label>
            <input type="date" name="period_end" required min={form.period_start || undefined} value={form.period_end} onChange={handleChange} className="form-input" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-fg-muted mb-1">Remarks</label>
            <textarea name="remarks" rows={2} maxLength={2000} value={form.remarks} onChange={handleChange} className="form-textarea"></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Planned Materials" icon="bi-list-check" subtitle="Pick the company's open requirements. Planned quantity cannot exceed what is still unplanned.">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs text-fg-subtle mb-1">Add requirement</label>
            <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!form.company_id} className="form-select">
              <option value="">{form.company_id ? (available.length ? '— Select requirement —' : 'No open requirements with unplanned quantity') : 'Select a company first'}</option>
              {available.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requirement_no} · {r.product_name} · {r.brand_name} — {formatQuantity(r.available_quantity, r.uom_decimal_places)} {r.uom_code} unplanned
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={addLine} disabled={!pick} className="px-3 py-1.5 border border-line-strong rounded text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-50">
            <i className="bi bi-plus-lg mr-1"></i> Add
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Material</th>
                <th className="text-right">Required</th>
                <th className="text-right">Available</th>
                <th className="w-40 text-right">Planned Qty</th>
                <th>UOM</th>
                <th>Remarks</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan="8" className="text-center">No requirements added yet.</td></tr>
              ) : lines.map((line, index) => (
                <tr key={line.id}>
                  <td>
                    <div className="font-mono text-fg">{line.requirement_no}</div>
                    <div className="text-xs text-fg-subtle">{line.projection_no} · {line.brand_name}</div>
                  </td>
                  <td className="cell-strong">{line.product_name}</td>
                  <td className="text-right">{formatQuantity(line.required_quantity, line.uom_decimal_places)}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(line.available, line.uom_decimal_places)}</td>
                  <td>
                    <input type="number" min="0" max={line.available} step={stepFor(line.uom_decimal_places)} required value={line.planned_quantity} onChange={(e) => updateLine(index, { planned_quantity: e.target.value })} className={`form-input text-right`} />
                  </td>
                  <td className="font-mono text-fg-muted">{line.uom_code}</td>
                  <td>
                    <input type="text" maxLength={500} value={line.remarks} onChange={(e) => updateLine(index, { remarks: e.target.value })} className="form-input" />
                  </td>
                  <td className="text-right">
                    <button type="button" onClick={() => removeLine(index)} className="text-[var(--danger)] hover:text-[var(--danger)]" title="Remove line"><i className="bi bi-x-lg"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-line pt-4">
        <button type="submit" disabled={saving || lines.length === 0} className={`bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded font-medium text-sm ${saving || lines.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <i className="bi bi-check-lg mr-1"></i> {planId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={planId ? `/planning/material-plans/${planId}` : '/planning/material-plans'} className="px-4 py-2 border border-line-strong rounded text-fg-muted hover:bg-surface-hover font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
