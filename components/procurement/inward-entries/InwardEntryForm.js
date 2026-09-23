'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import CompanyBadge from '@/components/company/CompanyBadge';
import FormSection from '@/components/ui/FormSection';
import { PO_STATUS_BADGES } from '@/components/ui/Badge';
import { toDateInputValue, todayDateInputValue } from '@/components/sales/shared/format';

export default function InwardEntryForm({ entryId = null }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [pos, setPos] = useState([]);
  // Company is inherited from the Purchase Order — shown, never selected.
  const [entryCompany, setEntryCompany] = useState(null);
  const [poItemsLoading, setPoItemsLoading] = useState(false);

  const [inwardNo, setInwardNo] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [inwardDate, setInwardDate] = useState(todayDateInputValue());
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([]);
  const [blockedReason, setBlockedReason] = useState('');

  const fetchPos = useCallback(async () => {
    try {
      const res = await apiClient.get('/procurement/purchase-orders?limit=200');
      if (res.success) setPos((res.data || []).filter((p) => p.status === 'raised' || p.status === 'partial'));
    } catch (err) {
      console.error('Failed to load Purchase Orders', err);
    }
  }, []);

  const loadPoDetails = useCallback(async (poId) => {
    setPoItemsLoading(true);
    try {
      const res = await apiClient.get(`/procurement/inward-entries/po-details/${poId}`);
      if (res.success) {
        setItems((res.data || []).map((row) => ({
          purchase_order_item_id: row.purchase_order_item_id,
          product_id: row.product_id,
          product_name: row.product_name,
          description: row.description,
          unit: row.unit,
          ordered_qty: row.ordered_qty,
          previously_received_qty: row.previously_received_qty,
          remaining_qty: row.remaining_qty,
          received_qty: row.remaining_qty > 0 ? String(row.remaining_qty) : '',
          remarks: '',
        })));
      }
    } catch (err) {
      console.error('Failed to load PO details', err);
    } finally {
      setPoItemsLoading(false);
    }
  }, []);

  const fetchEntry = useCallback(async () => {
    try {
      const res = await apiClient.get(`/procurement/inward-entries/${entryId}`);
      if (res.success) {
        const entry = res.data;
        setInwardNo(entry.inward_no);
        setEntryCompany({ label: entry.company_label, code: entry.company_code });
        setPurchaseOrderId(entry.purchase_order_id);
        setInwardDate(toDateInputValue(entry.inward_date));
        setChallanNo(entry.challan_no || '');
        setChallanDate(toDateInputValue(entry.challan_date));
        setRemarks(entry.remarks || '');
        setItems((entry.items || []).map((it) => ({
          id: it.id,
          product_name: it.product_name,
          design_no: it.design_no,
          description: it.description,
          unit: it.unit,
          ordered_qty: it.ordered_qty,
          received_qty: String(it.received_qty ?? ''),
          remarks: it.remarks || '',
        })));
        if (entry.status !== 'pending') {
          setBlockedReason('This receipt has already been QC-inspected and can no longer be edited.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load Goods Inward entry');
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    queueMicrotask(async () => {
      await fetchPos();
      if (entryId) {
        await fetchEntry();
      } else {
        setLoading(false);
      }
    });
  }, [entryId, fetchPos, fetchEntry]);

  const handlePoChange = (e) => {
    const poId = e.target.value;
    setPurchaseOrderId(poId);
    setItems([]);
    if (poId) loadPoDetails(poId);
  };

  const selectedPo = pos.find((p) => String(p.id) === String(purchaseOrderId)) || null;
  const company = entryId
    ? entryCompany
    : (selectedPo ? { label: selectedPo.company_label, code: selectedPo.company_code } : null);

  const updateItem = (index, patch) => {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    setItems(next);
  };

  const submit = async () => {
    setSaving(true);
    setErrors([]);

    try {
      let res;
      if (entryId) {
        const payload = {
          inward_date: inwardDate,
          challan_no: challanNo || null,
          challan_date: challanDate || null,
          remarks: remarks || null,
          items: items.map((it) => ({
            id: it.id,
            received_qty: Number(it.received_qty) || 0,
            remarks: it.remarks || null,
          })),
        };
        res = await apiClient.put(`/procurement/inward-entries/${entryId}`, payload);
        if (res.success) {
          router.push(`/procurement/inward-entries/${entryId}`);
          return;
        }
      } else {
        const payload = {
          inward_date: inwardDate,
          purchase_order_id: purchaseOrderId,
          challan_no: challanNo || null,
          challan_date: challanDate || null,
          remarks: remarks || null,
          items: items
            .filter((it) => Number(it.received_qty) > 0)
            .map((it) => ({
              purchase_order_item_id: it.purchase_order_item_id,
              product_id: it.product_id || null,
              description: it.description || '',
              unit: it.unit || '',
              ordered_qty: it.ordered_qty,
              received_qty: Number(it.received_qty) || 0,
              remarks: it.remarks || null,
            })),
        };
        res = await apiClient.post('/procurement/inward-entries', payload);
        if (res.success) {
          router.push(`/procurement/inward-entries/${res.data.id}`);
          return;
        }
      }
    } catch (err) {
      console.error(err);
      // Inward's validation errors come back keyed-by-field ({errors:{field:[msg]}}),
      // not as an array like PO/Inquiry/OC — and business-rule errors (e.g. over the
      // PO balance) surface as a plain string message with no structured errors at
      // all (see Phase 4B report §14.3). Handle both shapes.
      if (err.data?.errors && typeof err.data.errors === 'object' && !Array.isArray(err.data.errors)) {
        setErrors(Object.values(err.data.errors).flat());
      } else {
        setErrors([err.message || 'Failed to save Goods Inward entry']);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading form data...</div>;
  }

  if (blockedReason) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-4 text-sm">
        {blockedReason}
        <div className="mt-2">
          <Link href={`/procurement/inward-entries/${entryId}`} className="underline font-medium">Back to receipt</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 max-w-5xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <FormSection title="Header Details" icon="bi-box-arrow-in-down">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Inward Number</label>
            <input type="text" readOnly value={entryId ? inwardNo : 'Auto-generated (GT/INW/xxx)'} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Order <span className="text-red-500">*</span></label>
            {entryId ? (
              <input type="text" readOnly value={selectedPo?.po_num || `#${purchaseOrderId}`} className="form-input w-full rounded border-gray-300 text-sm bg-gray-50 border-dashed text-gray-500" />
            ) : (
              <select value={purchaseOrderId} onChange={handlePoChange} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="">Select Raised / Partial PO...</option>
                {pos.map((p) => <option key={p.id} value={p.id}>{p.po_num} — {p.supplier_company_name} ({PO_STATUS_BADGES[p.status]?.label || p.status})</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
            <div className="py-1.5">
              {company ? <CompanyBadge label={company.label} code={company.code} /> : <span className="text-sm text-gray-400">From the selected purchase order</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Inward Date <span className="text-red-500">*</span></label>
            <input type="date" required value={inwardDate} onChange={(e) => setInwardDate(e.target.value)} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Challan / DC No.</label>
            <input type="text" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Challan Date</label>
            <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} className="form-input w-full rounded border-gray-300 text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Receipt Remarks</label>
            <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-textarea w-full rounded border-gray-300 text-sm"></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Items" icon="bi-table">
        {!entryId && !purchaseOrderId && (
          <p className="text-sm text-gray-500">Select a Purchase Order above to load its items.</p>
        )}
        {poItemsLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></span>
            Loading PO items...
          </div>
        )}
        {items.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Product / Description</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Ordered</th>
                  {!entryId && <th className="px-3 py-2 font-medium text-right">Prev. Received</th>}
                  {!entryId && <th className="px-3 py-2 font-medium text-right">Balance</th>}
                  <th className="px-3 py-2 font-medium text-right w-32">Received Qty</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={item.id || item.purchase_order_item_id}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.product_name || item.design_no || '—'}
                      {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{item.ordered_qty}</td>
                    {!entryId && <td className="px-3 py-2 text-right text-gray-500">{item.previously_received_qty}</td>}
                    {!entryId && <td className="px-3 py-2 text-right font-semibold text-blue-700">{item.remaining_qty}</td>}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={entryId ? undefined : item.ordered_qty}
                        value={item.received_qty}
                        onChange={(e) => updateItem(index, { received_qty: e.target.value })}
                        className="form-input w-24 rounded border-gray-300 text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.remarks} onChange={(e) => updateItem(index, { remarks: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <div className="bg-white border rounded shadow-sm px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <Link href={entryId ? `/procurement/inward-entries/${entryId}` : '/procurement/inward-entries'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
        <button type="button" disabled={saving || items.length === 0} onClick={submit} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
          <i className="bi bi-check-lg me-1"></i> {saving ? 'Saving…' : entryId ? 'Update Inward Receipt' : 'Save Inward Receipt'}
        </button>
      </div>
    </form>
  );
}
