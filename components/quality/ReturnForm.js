'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { todayDateInputValue, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);

/**
 * Supplier return of rejected material from one completed inspection. The
 * supplier, lot, GRN and PO are inherited; the quantity may not exceed the
 * rejected quantity not yet returned (checked again on the server).
 */
export default function ReturnForm({ initialQcId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!initialQcId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [options, setOptions] = useState([]);
  const [qcId, setQcId] = useState(initialQcId || '');
  const [qc, setQc] = useState(null);
  const [form, setForm] = useState({ return_date: todayDateInputValue(), quantity: '', reason: '', remarks: '' });

  const loadQc = useCallback(async (id) => {
    if (!id) {
      setQc(null);
      return;
    }
    const res = await apiClient.get(`/procurement/supplier-returns/form-data?quality_inspection_id=${id}`);
    const inspection = res.data?.inspection || null;
    setQc(inspection);
    if (inspection) setForm((prev) => ({ ...prev, quantity: String(Math.max(Number(inspection.returnable_quantity), 0)) }));
  }, []);

  useEffect(() => {
    if (!initialQcId) return;
    let mounted = true;
    (async () => {
      try {
        await loadQc(initialQcId);
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load inspection']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [initialQcId, loadQc]);

  const handleCompanyChange = async (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setQcId('');
    setQc(null);
    if (!value) {
      setOptions([]);
      return;
    }
    try {
      const res = await apiClient.get(`/procurement/supplier-returns/form-data?company_id=${value}`);
      setOptions(res.data?.inspections || []);
    } catch (err) {
      setErrors([err.message || 'Failed to load inspections']);
    }
  };

  const handleQcChange = async (e) => {
    setQcId(e.target.value);
    try {
      await loadQc(e.target.value);
    } catch (err) {
      setErrors([err.message || 'Failed to load inspection']);
    }
  };

  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const res = await apiClient.post('/procurement/supplier-returns', { ...form, quality_inspection_id: Number(qcId) });
      router.push(`/procurement/returns/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save return']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const dp = qc?.uom_decimal_places ?? 0;
  const remaining = qc ? Number(qc.returnable_quantity) : 0;
  const over = qc && String(form.quantity).trim() !== '' && micro(form.quantity) > micro(remaining);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Rejected Material" icon="bi-clipboard-x" subtitle="A return is always raised from a completed inspection. Supplier, lot, GRN and PO are inherited from it.">
        {!initialQcId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={LABEL}>Company <span className="text-red-500">*</span></label>
              <CompanySelect value={companyId} onChange={handleCompanyChange} required className="form-select w-full rounded border-gray-300 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Inspection <span className="text-red-500">*</span></label>
              <select value={qcId} onChange={handleQcChange} required disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (options.length ? '— Select an inspection with rejected material —' : 'No rejected material awaiting return') : 'Select a company first'}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.qc_no} · {o.lot_no} · {o.product_name} · {formatQuantity(o.returnable_quantity, o.uom_decimal_places)} {o.unit} returnable · {o.supplier_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {qc ? (
          <>
            <p className="text-sm mb-3">Inspection <Link href={`/quality-control/${qc.id}`} className="font-mono text-blue-600 hover:underline">{qc.qc_no}</Link></p>
            <TraceChain doc={qc} />
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Rejected</div><div className="font-semibold text-red-700">{formatQuantity(qc.rejected_quantity, dp)} {qc.unit}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Marked for return (QC)</div><div className="font-semibold">{qc.marked_return_quantity === null ? '—' : formatQuantity(qc.marked_return_quantity, dp)}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Already returned</div><div className="font-semibold">{formatQuantity(qc.returned_quantity, dp)}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">In draft returns</div><div className="font-semibold">{formatQuantity(qc.return_draft_quantity, dp)}</div></div>
              <div className="rounded border border-blue-200 bg-blue-50 p-2"><div className="text-xs text-blue-700">Remaining returnable</div><div className="font-semibold text-blue-900">{formatQuantity(remaining, dp)} {qc.unit}</div></div>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 m-0">Select an inspection to load its rejected quantity.</p>
        )}
      </FormSection>

      <FormSection title="Return" icon="bi-box-arrow-up" subtitle="Saved as a draft; it counts as returned once posted.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={LABEL}>Return Date <span className="text-red-500">*</span></label>
            <input type="date" required value={form.return_date} onChange={set('return_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Return Quantity {qc?.unit ? `(${qc.unit})` : ''} <span className="text-red-500">*</span></label>
            <input type="number" required min="0" step={stepFor(dp)} value={form.quantity} onChange={set('quantity')} className={`${INPUT} text-right`} />
            {over && <p className="text-xs text-red-600 mt-1 mb-0">More than the {formatQuantity(remaining, dp)} remaining; it will be rejected.</p>}
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Reason</label>
            <input type="text" maxLength={255} value={form.reason} onChange={set('reason')} className={INPUT} />
          </div>
          <div className="md:col-span-4">
            <label className={LABEL}>Remarks</label>
            <textarea rows={2} maxLength={2000} value={form.remarks} onChange={set('remarks')} className={INPUT}></textarea>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !qc} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> Save Draft
        </button>
        <Link href={initialQcId ? `/quality-control/${initialQcId}` : '/procurement/returns'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
