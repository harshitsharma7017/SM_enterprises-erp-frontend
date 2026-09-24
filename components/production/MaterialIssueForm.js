'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import BarcodeScanInput from '@/components/barcode/BarcodeScanInput';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { toDateInputValue, todayDateInputValue, formatQuantity } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const micro = (v) => Math.round(Number(v || 0) * 1e6);
const EMPTY_HEADER = { issue_date: todayDateInputValue(), location_id: '', job_reference: '', receiver_user_id: '', supervisor_user_id: '', foreman_user_id: '', remarks: '' };

/**
 * Material issue (Store → Supervisor/Cutting): lots issued from one stock
 * location. Available quantities come from the server's stock ledger and are
 * re-checked when the issue is posted; a draft reserves nothing.
 */
export default function MaterialIssueForm({ issueId = null }) {
  const router = useRouter();
  const { can } = useAuth(true);
  const [scanNote, setScanNote] = useState(null);
  const [loading, setLoading] = useState(!!issueId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [stock, setStock] = useState([]);
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [lines, setLines] = useState([]);

  const loadCompany = useCallback(async (id) => {
    const res = await apiClient.get(`/production/material-issues/form-data?company_id=${id}`);
    setLocations(res.data?.locations || []);
    setUsers(res.data?.users || []);
  }, []);

  const loadStock = useCallback(async (locationId) => {
    if (!locationId) {
      setStock([]);
      return;
    }
    const res = await apiClient.get(`/production/material-issues/form-data?location_id=${locationId}`);
    setStock(res.data?.stock || []);
  }, []);

  useEffect(() => {
    if (!issueId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get(`/production/material-issues/${issueId}`);
        const issue = res.data;
        if (!mounted || !issue) return;
        if (issue.status !== 'draft') {
          router.replace(`/production/material-issues/${issueId}`);
          return;
        }
        setSaved(issue);
        setCompanyId(issue.company_id);
        setHeader({
          issue_date: toDateInputValue(issue.issue_date),
          location_id: issue.location_id,
          job_reference: issue.job_reference || '',
          receiver_user_id: issue.receiver_user_id || '',
          supervisor_user_id: issue.supervisor_user_id || '',
          foreman_user_id: issue.foreman_user_id || '',
          remarks: issue.remarks || '',
        });
        setLines(issue.items.map((i) => ({ lot_id: i.lot_id, quantity: String(Number(i.quantity)), remarks: i.remarks || '' })));
        await Promise.all([loadCompany(issue.company_id), loadStock(issue.location_id)]);
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load material issue']);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [issueId, router, loadCompany, loadStock]);

  const handleCompanyChange = async (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setHeader((prev) => ({ ...prev, location_id: '', receiver_user_id: '', supervisor_user_id: '', foreman_user_id: '' }));
    setLines([]);
    setStock([]);
    if (!value) {
      setLocations([]);
      return;
    }
    try {
      await loadCompany(value);
    } catch (err) {
      setErrors([err.message || 'Failed to load locations']);
    }
  };

  const handleLocationChange = async (e) => {
    const value = e.target.value;
    setHeader((prev) => ({ ...prev, location_id: value }));
    setLines([]);
    try {
      await loadStock(value);
    } catch (err) {
      setErrors([err.message || 'Failed to load stock']);
    }
  };

  const set = (name) => (e) => setHeader((prev) => ({ ...prev, [name]: e.target.value }));
  const stockOf = (lotId) => stock.find((s) => String(s.lot_id) === String(lotId));
  const addLine = (lotId) => {
    if (!lotId || lines.some((l) => String(l.lot_id) === String(lotId))) return;
    setLines((prev) => [...prev, { lot_id: Number(lotId), quantity: '', remarks: '' }]);
  };
  const updateLine = (lotId, patch) => setLines((prev) => prev.map((l) => (l.lot_id === lotId ? { ...l, ...patch } : l)));
  const removeLine = (lotId) => setLines((prev) => prev.filter((l) => l.lot_id !== lotId));
  // A scanned barcode only selects its lot; it must be usable stock at this location, and posting re-checks everything.
  const onScan = (data) => {
    const { lot } = data;
    const repeat = data.duplicate ? ' (this barcode was scanned before)' : '';
    if (lines.some((l) => String(l.lot_id) === String(lot.id))) setScanNote({ warn: true, text: `Lot ${lot.lot_no} is already on this issue${repeat}.` });
    else if (!stockOf(lot.id)) setScanNote({ error: true, text: `Lot ${lot.lot_no} has no usable stock at this location.` });
    else {
      addLine(lot.id);
      setScanNote({ text: `Added lot ${lot.lot_no}${repeat}.` });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...header,
      location_id: Number(header.location_id),
      items: lines.map((l) => ({ lot_id: l.lot_id, quantity: l.quantity, remarks: l.remarks })),
      ...(issueId ? {} : { company_id: Number(companyId) }),
    };
    try {
      const res = issueId
        ? await apiClient.put(`/production/material-issues/${issueId}`, payload)
        : await apiClient.post('/production/material-issues', payload);
      router.push(`/production/material-issues/${res.data.id}`);
    } catch (err) {
      setErrors([err.message || 'Failed to save material issue']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading material issue...</div>;

  const person = (name, label) => (
    <div>
      <label className={LABEL}>{label}</label>
      <select value={header[name]} onChange={set(name)} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
        <option value="">—</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
  const unused = stock.filter((s) => !lines.some((l) => String(l.lot_id) === String(s.lot_id)));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Issue" icon="bi-box-arrow-right" subtitle="Material leaves one stock location; stock is reduced only when the issue is posted.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Company <span className="text-red-500">*</span></label>
            {issueId ? (
              <div className="py-1.5"><CompanyBadge label={saved?.company_label} code={saved?.company_code} /></div>
            ) : (
              <CompanySelect value={companyId} onChange={handleCompanyChange} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className={LABEL}>Source Location <span className="text-red-500">*</span></label>
            <select value={header.location_id} onChange={handleLocationChange} required disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
              <option value="">{companyId ? (locations.length ? '— Select —' : 'No active location') : 'Select a company first'}</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Issue Date <span className="text-red-500">*</span></label>
            <input type="date" required value={header.issue_date} onChange={set('issue_date')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Job Reference</label>
            <input type="text" maxLength={100} value={header.job_reference} onChange={set('job_reference')} className={INPUT} />
          </div>
          {person('receiver_user_id', 'Received by (required to post)')}
          {person('supervisor_user_id', 'Supervisor / Cutting')}
          {person('foreman_user_id', 'Foreman')}
          <div className="md:col-span-2">
            <label className={LABEL}>Remarks</label>
            <input type="text" maxLength={2000} value={header.remarks} onChange={set('remarks')} className={INPUT} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">People are existing ERP users.</p>
      </FormSection>

      <FormSection title="Lots" icon="bi-stack" subtitle="Only usable (QC-accepted) stock at the selected location can be issued.">
        {!header.location_id ? (
          <p className="text-sm text-gray-500 m-0">Select a source location to see its stock.</p>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className={LABEL}>Add lot</label>
                <select value="" onChange={(e) => addLine(e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">{unused.length ? '— Select a lot in stock here —' : 'No (other) lots in stock at this location'}</option>
                  {unused.map((s) => (
                    <option key={s.lot_id} value={s.lot_id}>
                      {s.lot_no} · {s.product_name} · {formatQuantity(s.width_inch, 3)}&quot; · {formatQuantity(s.quantity, s.uom_decimal_places)} {s.unit} available
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {can('barcode.scan') && (
              <div className="mb-3">
                <label className={LABEL}>…or scan the lot barcode</label>
                <BarcodeScanInput companyId={companyId} context="material_issue" locationId={header.location_id} onResult={onScan} onError={(message) => setScanNote({ error: true, text: message })} />
                {scanNote && <p className={`text-xs mt-1 mb-0 ${scanNote.error ? 'text-red-600' : scanNote.warn ? 'text-amber-700' : 'text-green-700'}`}>{scanNote.text}</p>}
              </div>
            )}
            {lines.length > 0 && (
              <table className="min-w-full text-sm">
                <thead className="text-gray-500 text-xs text-left">
                  <tr>
                    <th className="py-1.5 font-medium">Lot</th>
                    <th className="py-1.5 font-medium">Material</th>
                    <th className="py-1.5 font-medium text-right">Available</th>
                    <th className="py-1.5 font-medium w-40">Issue Qty *</th>
                    <th className="py-1.5 font-medium">Remarks</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line) => {
                    const s = stockOf(line.lot_id);
                    const dp = s?.uom_decimal_places ?? 0;
                    const over = s && String(line.quantity).trim() !== '' && micro(line.quantity) > micro(s.quantity);
                    return (
                      <tr key={line.lot_id}>
                        <td className="py-1.5 font-mono">{s?.lot_no || `Lot ${line.lot_id}`}</td>
                        <td className="py-1.5">{s ? `${s.product_name} · ${formatQuantity(s.width_inch, 3)}"` : <span className="text-red-600">No stock of this lot at this location</span>}</td>
                        <td className="py-1.5 text-right whitespace-nowrap">{s ? `${formatQuantity(s.quantity, dp)} ${s.unit}` : '0'}</td>
                        <td className="py-1.5">
                          <input type="number" required min="0" step={stepFor(dp)} value={line.quantity} onChange={(e) => updateLine(line.lot_id, { quantity: e.target.value })} className={`${INPUT} text-right`} />
                          {over && <div className="text-xs text-red-600">More than available</div>}
                        </td>
                        <td className="py-1.5"><input type="text" maxLength={1000} value={line.remarks} onChange={(e) => updateLine(line.lot_id, { remarks: e.target.value })} className={INPUT} /></td>
                        <td className="py-1.5 text-right"><button type="button" onClick={() => removeLine(line.lot_id)} className="text-red-500 hover:text-red-700" title="Remove"><i className="bi bi-x-lg"></i></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving || lines.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {issueId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={issueId ? `/production/material-issues/${issueId}` : '/production/material-issues'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
