'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);

/**
 * Debit note for QC-rejected material: against the inspection's rejected
 * quantity, or through one of its posted supplier returns. Supplier, PO,
 * GRN, lot, QC and return come from the source and cannot be re-entered.
 * Amount = quantity × the PO line price when the PO has one; otherwise it is
 * entered manually (or left empty). No tax is applied.
 */
export default function DebitNoteForm({ noteId = null, initialQcId = null, initialReturnId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!(noteId || initialQcId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [options, setOptions] = useState([]);
  const [qcId, setQcId] = useState(initialQcId || '');
  const [qc, setQc] = useState(null);
  const [returnId, setReturnId] = useState(initialReturnId || '');
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({ debit_note_date: todayDateInputValue(), quantity: '', amount: '', reason: '', remarks: '' });

  const loadQc = useCallback(async (id) => {
    if (!id) {
      setQc(null);
      return null;
    }
    const res = await apiClient.get(`/finance/debit-notes/form-data?quality_inspection_id=${id}`);
    setQc(res.data?.inspection || null);
    return res.data?.inspection || null;
  }, []);

  useEffect(() => {
    if (!noteId && !initialQcId) return;
    let mounted = true;
    (async () => {
      try {
        if (noteId) {
          const res = await apiClient.get(`/finance/debit-notes/${noteId}`);
          const note = res.data;
          if (!mounted || !note) return;
          if (note.status !== 'draft') {
            router.replace(`/finance/debit-notes/${noteId}`);
            return;
          }
          setSaved(note);
          setQcId(note.quality_inspection_id);
          setReturnId(note.supplier_return_id || '');
          setForm({
            debit_note_date: toDateInputValue(note.debit_note_date),
            quantity: String(Number(note.quantity)),
            amount: note.amount_basis === 'manual' ? String(Number(note.amount)) : '',
            reason: note.reason || '',
            remarks: note.remarks || '',
          });
          await loadQc(note.quality_inspection_id);
        } else {
          const inspection = await loadQc(initialQcId);
          const ret = inspection?.returns.find((r) => String(r.id) === String(initialReturnId));
          const start = ret ? ret.debitable_quantity : inspection?.debitable_quantity;
          if (start !== undefined) setForm((prev) => ({ ...prev, quantity: String(Math.max(Number(start), 0)) }));
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load debit note source']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [noteId, initialQcId, initialReturnId, router, loadQc]);

  const handleCompanyChange = async (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setQcId('');
    setReturnId('');
    setQc(null);
    if (!value) {
      setOptions([]);
      return;
    }
    try {
      const res = await apiClient.get(`/finance/debit-notes/form-data?company_id=${value}`);
      setOptions(res.data?.inspections || []);
    } catch (err) {
      setErrors([err.message || 'Failed to load inspections']);
    }
  };

  const handleQcChange = async (e) => {
    setQcId(e.target.value);
    setReturnId('');
    try {
      const inspection = await loadQc(e.target.value);
      if (inspection) setForm((prev) => ({ ...prev, quantity: String(Math.max(Number(inspection.debitable_quantity), 0)) }));
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
      const res = noteId
        ? await apiClient.put(`/finance/debit-notes/${noteId}`, form)
        : await apiClient.post('/finance/debit-notes', { ...form, quality_inspection_id: Number(qcId), supplier_return_id: returnId ? Number(returnId) : null });
      router.push(`/finance/debit-notes/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save debit note']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const dp = qc?.uom_decimal_places ?? 0;
  const ret = qc?.returns.find((r) => String(r.id) === String(returnId)) || null;
  // In edit mode this note's own draft quantity is part of the "already reserved" figures.
  const own = saved ? Number(saved.quantity) : 0;
  const qcRemaining = qc ? Number(qc.debitable_quantity) + own : 0;
  const remaining = ret ? Math.min(Number(ret.debitable_quantity) + own, qcRemaining) : qcRemaining;
  const hasPrice = qc && qc.po_unit_price !== null;
  const over = qc && String(form.quantity).trim() !== '' && micro(form.quantity) > micro(remaining);
  const derivedAmount = hasPrice && String(form.quantity).trim() !== '' ? Math.round(Number(form.quantity) * Number(qc.po_unit_price) * 100) / 100 : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Source" icon="bi-diagram-3" subtitle="Raised from a completed inspection's rejected quantity, optionally through a posted supplier return.">
        {!noteId && !initialQcId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={LABEL}>Company <span className="text-red-500">*</span></label>
              <CompanySelect value={companyId} onChange={handleCompanyChange} required className="form-select w-full rounded border-gray-300 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Inspection <span className="text-red-500">*</span></label>
              <select value={qcId} onChange={handleQcChange} required disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (options.length ? '— Select an inspection with rejected material —' : 'No rejected material awaiting a debit note') : 'Select a company first'}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.qc_no} · {o.lot_no} · {o.product_name} · {formatQuantity(o.debitable_quantity, o.uom_decimal_places)} {o.unit} to debit · {o.supplier_name}
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
            <div className="mt-4">
              <label className={LABEL}>Debit against</label>
              {noteId ? (
                <p className="text-sm m-0">{ret ? <>Supplier return <span className="font-mono">{ret.return_no}</span></> : 'Rejected quantity (no return)'}</p>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="source" checked={!returnId} onChange={() => setReturnId('')} /> Rejected quantity (no return)
                  </label>
                  {qc.returns.map((r) => (
                    <label key={r.id} className="inline-flex items-center gap-2">
                      <input type="radio" name="source" checked={String(returnId) === String(r.id)} onChange={() => setReturnId(r.id)} disabled={Number(r.debitable_quantity) <= 0} />
                      Return <span className="font-mono">{r.return_no}</span> ({formatQuantity(r.debitable_quantity, dp)} of {formatQuantity(r.quantity, dp)} to debit)
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Rejected</div><div className="font-semibold text-red-700">{formatQuantity(qc.rejected_quantity, dp)} {qc.unit}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Returned</div><div className="font-semibold">{formatQuantity(qc.returned_quantity, dp)}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Debited (posted)</div><div className="font-semibold">{formatQuantity(qc.debited_quantity, dp)}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">PO price</div><div className="font-semibold">{hasPrice ? `${formatAmount(qc.po_unit_price)} / ${qc.unit}` : 'Not set'}</div></div>
              <div className="rounded border border-blue-200 bg-blue-50 p-2"><div className="text-xs text-blue-700">Available to debit</div><div className="font-semibold text-blue-900">{formatQuantity(remaining, dp)} {qc.unit}</div></div>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 m-0">Select an inspection to load its rejected material.</p>
        )}
      </FormSection>

      <FormSection title="Debit Note" icon="bi-file-earmark-minus" subtitle="Saved as a draft; editable until posted.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={LABEL}>Date <span className="text-red-500">*</span></label>
            <input type="date" required value={form.debit_note_date} onChange={set('debit_note_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Quantity {qc?.unit ? `(${qc.unit})` : ''} <span className="text-red-500">*</span></label>
            <input type="number" required min="0" step={stepFor(dp)} value={form.quantity} onChange={set('quantity')} className={`${INPUT} text-right`} />
            {over && <p className="text-xs text-red-600 mt-1 mb-0">More than the {formatQuantity(remaining, dp)} available; it will be rejected.</p>}
          </div>
          <div>
            <label className={LABEL}>Amount</label>
            {hasPrice ? (
              <div className="py-1.5 text-sm font-semibold">{derivedAmount === null ? '—' : formatAmount(derivedAmount)} <span className="text-xs font-normal text-gray-500">qty × PO price</span></div>
            ) : (
              <>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} className={`${INPUT} text-right`} />
                <p className="text-xs text-gray-500 mt-1 mb-0">The PO line has no price — enter the amount or leave it empty.</p>
              </>
            )}
          </div>
          <div>
            <label className={LABEL}>Reason</label>
            <input type="text" maxLength={255} value={form.reason} onChange={set('reason')} className={INPUT} />
          </div>
          <div className="md:col-span-4">
            <label className={LABEL}>Remarks</label>
            <textarea rows={2} maxLength={2000} value={form.remarks} onChange={set('remarks')} className={INPUT}></textarea>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">No tax is calculated on debit notes; tax rules have not been defined.</p>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !qc} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {noteId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={noteId ? `/finance/debit-notes/${noteId}` : '/finance/debit-notes'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
