'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue, todayDateInputValue, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const EMPTY = { inspection_date: todayDateInputValue(), inspected_quantity: '', accepted_quantity: '', rejected_quantity: '', return_quantity: '', shade: '', edge_to_edge_shade: '', weaving_defects: '', remarks: '' };
const asInput = (v) => (v === null || v === undefined ? '' : String(Number(v)));
// Micro-units, as the server compares them, so 0.1 + 0.2 style sums do not drift.
const micro = (v) => Math.round(Number(v || 0) * 1e6);

/**
 * Inspection of one received lot. Company, supplier, GRN, PO, material, UOM
 * and width come from the lot and are shown read-only; the inspector enters
 * quantities and the shade / edge-to-edge shade / weaving-defect findings.
 * The server re-validates everything with the lot locked.
 */
export default function QcForm({ qcId = null, initialLotId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!(qcId || initialLotId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [savedId, setSavedId] = useState(qcId);
  const [ownClaim, setOwnClaim] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState(initialLotId || '');
  const [lot, setLot] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const loadLot = useCallback(async (id) => {
    if (!id) {
      setLot(null);
      return;
    }
    const res = await apiClient.get(`/quality-control/form-data?lot_id=${id}`);
    setLot(res.data?.lot || null);
  }, []);

  useEffect(() => {
    if (!qcId && !initialLotId) return;
    let mounted = true;
    (async () => {
      try {
        if (qcId) {
          const res = await apiClient.get(`/quality-control/${qcId}`);
          const qc = res.data;
          if (!mounted || !qc) return;
          if (qc.status !== 'draft') {
            router.replace(`/quality-control/${qcId}`);
            return;
          }
          setLotId(qc.lot_id);
          setOwnClaim(Number(qc.inspected_quantity));
          setForm({
            inspection_date: toDateInputValue(qc.inspection_date),
            inspected_quantity: asInput(qc.inspected_quantity),
            accepted_quantity: asInput(qc.accepted_quantity),
            rejected_quantity: asInput(qc.rejected_quantity),
            return_quantity: asInput(qc.return_quantity),
            shade: qc.shade || '',
            edge_to_edge_shade: qc.edge_to_edge_shade || '',
            weaving_defects: qc.weaving_defects || '',
            remarks: qc.remarks || '',
          });
          await loadLot(qc.lot_id);
        } else {
          await loadLot(initialLotId);
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load inspection']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [qcId, initialLotId, router, loadLot]);

  const handleCompanyChange = async (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setLotId('');
    setLot(null);
    if (!value) {
      setLots([]);
      return;
    }
    try {
      const res = await apiClient.get(`/quality-control/form-data?company_id=${value}`);
      setLots(res.data?.lots || []);
    } catch (err) {
      setErrors([err.message || 'Failed to load lots']);
    }
  };

  const handleLotChange = async (e) => {
    const value = e.target.value;
    setLotId(value);
    try {
      await loadLot(value);
    } catch (err) {
      setErrors([err.message || 'Failed to load lot']);
    }
  };

  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const save = async (complete) => {
    setSaving(true);
    setErrors([]);
    try {
      let id = savedId;
      if (id) {
        await apiClient.put(`/quality-control/${id}`, form);
      } else {
        const res = await apiClient.post('/quality-control', { ...form, lot_id: Number(lotId) });
        id = res.data.id;
        setSavedId(id);
      }
      if (complete) await apiClient.post(`/quality-control/${id}/complete`);
      router.push(`/quality-control/${id}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      const messages = Array.isArray(list) ? list : (list && typeof list === 'object' ? Object.values(list).flat() : []);
      setErrors(messages.length ? messages : [err.message || 'Failed to save inspection']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  const dp = lot?.uom_decimal_places ?? 0;
  const available = lot ? Number(lot.uninspected_quantity) + ownClaim : 0;
  const filled = (v) => String(v).trim() !== '';
  const sumMismatch = filled(form.inspected_quantity) && filled(form.accepted_quantity) && filled(form.rejected_quantity)
    && micro(form.accepted_quantity) + micro(form.rejected_quantity) !== micro(form.inspected_quantity);
  const returnTooHigh = filled(form.return_quantity) && filled(form.rejected_quantity) && micro(form.return_quantity) > micro(form.rejected_quantity);
  const overLot = lot && filled(form.inspected_quantity) && micro(form.inspected_quantity) > micro(available);

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          {savedId && !qcId && <p className="mt-2 mb-0 text-xs">The inspection was saved as a draft; fix the values and save again.</p>}
        </div>
      )}

      <FormSection title="Received Lot" icon="bi-stack" subtitle="QC is recorded per lot of a posted goods receipt. Source details come from the lot and cannot be changed.">
        {!qcId && !initialLotId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={LABEL}>Company <span className="text-red-500">*</span></label>
              <CompanySelect value={companyId} onChange={handleCompanyChange} required className="form-select w-full rounded border-gray-300 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Lot <span className="text-red-500">*</span></label>
              <select value={lotId} onChange={handleLotChange} required disabled={!companyId || !!savedId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                <option value="">{companyId ? (lots.length ? '— Select a lot awaiting inspection —' : 'No lots awaiting inspection') : 'Select a company first'}</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lot_no} · {l.product_name} · {formatQuantity(l.uninspected_quantity, l.uom_decimal_places)} {l.unit} to inspect · {formatQuantity(l.width_inch, 3)}&quot; · {l.inward_no} · {l.supplier_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {lot ? (
          <>
            <TraceChain doc={{ ...lot, lot_id: lot.id }} quantityLabel="Received quantity" quantity={lot.quantity} />
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Received</div><div className="font-semibold">{formatQuantity(lot.quantity, dp)} {lot.unit}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Inspected (completed)</div><div className="font-semibold">{formatQuantity(lot.inspected_quantity, dp)}</div></div>
              <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Accepted / Rejected</div><div className="font-semibold"><span className="text-green-700">{formatQuantity(lot.accepted_quantity, dp)}</span> / <span className="text-red-700">{formatQuantity(lot.rejected_quantity, dp)}</span></div></div>
              <div className="rounded border border-blue-200 bg-blue-50 p-2"><div className="text-xs text-blue-700">Available for this inspection</div><div className="font-semibold text-blue-900">{formatQuantity(available, dp)} {lot.unit}</div></div>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 m-0">Select a lot to load its details.</p>
        )}
      </FormSection>

      <FormSection title="Inspection" icon="bi-clipboard-check" subtitle={`Quantities in ${lot?.unit || 'the lot unit'}${dp > 0 ? `, up to ${dp} decimal place(s)` : ', whole numbers'}. Accepted + Rejected must equal Inspected.`}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className={LABEL}>Inspection Date <span className="text-red-500">*</span></label>
            <input type="date" required value={form.inspection_date} onChange={set('inspection_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Inspected Qty <span className="text-red-500">*</span></label>
            <input type="number" required min="0" step={stepFor(dp)} value={form.inspected_quantity} onChange={set('inspected_quantity')} className={`${INPUT} text-right`} />
          </div>
          <div>
            <label className={LABEL}>Accepted Qty</label>
            <input type="number" min="0" step={stepFor(dp)} value={form.accepted_quantity} onChange={set('accepted_quantity')} className={`${INPUT} text-right`} />
          </div>
          <div>
            <label className={LABEL}>Rejected Qty</label>
            <input type="number" min="0" step={stepFor(dp)} value={form.rejected_quantity} onChange={set('rejected_quantity')} className={`${INPUT} text-right`} />
          </div>
          <div>
            <label className={LABEL}>Marked for Return</label>
            <input type="number" min="0" step={stepFor(dp)} value={form.return_quantity} onChange={set('return_quantity')} className={`${INPUT} text-right`} />
          </div>
        </div>
        <div className="mt-2 text-xs space-y-0.5">
          {overLot && <p className="m-0 text-red-600">Inspected quantity is more than the {formatQuantity(available, dp)} {lot.unit} available on this lot.</p>}
          {sumMismatch && <p className="m-0 text-red-600">Accepted + Rejected ({formatQuantity((micro(form.accepted_quantity) + micro(form.rejected_quantity)) / 1e6, dp)}) does not equal Inspected ({formatQuantity(form.inspected_quantity, dp)}).</p>}
          {returnTooHigh && <p className="m-0 text-red-600">Marked for return cannot exceed the rejected quantity.</p>}
          <p className="m-0 text-gray-500">&quot;Marked for return&quot; records the inspector&apos;s recommendation only. Material is returned through a separate Supplier Return.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={LABEL}>Shade</label>
            <input type="text" maxLength={100} value={form.shade} onChange={set('shade')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Edge-to-Edge Shade</label>
            <input type="text" maxLength={100} value={form.edge_to_edge_shade} onChange={set('edge_to_edge_shade')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Weaving Defects</label>
            <textarea rows={3} maxLength={2000} value={form.weaving_defects} onChange={set('weaving_defects')} className={INPUT}></textarea>
          </div>
          <div>
            <label className={LABEL}>Remarks</label>
            <textarea rows={3} maxLength={2000} value={form.remarks} onChange={set('remarks')} className={INPUT}></textarea>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || !lot} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> Save Draft
        </button>
        <button type="button" disabled={saving || !lot} onClick={() => save(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check2-circle mr-1"></i> Save &amp; Complete
        </button>
        <Link href={savedId ? `/quality-control/${savedId}` : '/quality-control'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
