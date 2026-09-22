'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';

const STATUS_META = {
  pending: { label: 'Pending Inspection', icon: 'bi-clock-history', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'QC Approved', icon: 'bi-check-circle', className: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'QC Rejected', icon: 'bi-x-circle', className: 'bg-red-100 text-red-800 border-red-200' },
};

/**
 * QC is not a separate module in the original ERP — it's this card on the
 * Goods Inward show page, gated by `inward-entry.approve`. Submitting sets
 * the whole entry's status (approved/rejected) and, per item, passed_qty /
 * rejected_qty / qc_remarks. See Phase 4B report §10/§12 — note PO fulfillment
 * status is driven by raw received_qty, not by QC-passed qty, so this action
 * does not gate whether the PO is considered "received."
 */
export default function QcPanel({ entry, can, onQcDone }) {
  const [rows, setRows] = useState(
    (entry.items || []).map((it) => {
      // passed_qty is always a computed function of received - rejected (the
      // same invariant handleRejectedChange enforces on every edit below) —
      // it must be derived here too, not read from the raw DB default (0 for
      // a never-yet-inspected entry), or a user who submits without touching
      // Rejected would send passed_qty=0 for a fully-passing receipt.
      const rejected = it.rejected_qty || 0;
      return {
        id: it.id,
        product_name: it.product_name,
        received_qty: it.received_qty,
        passed_qty: String(Math.max(0, it.received_qty - rejected)),
        rejected_qty: String(rejected),
        qc_remarks: it.qc_remarks || '',
      };
    })
  );
  const [decision, setDecision] = useState('approved');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const statusMeta = STATUS_META[entry.status] || STATUS_META.pending;

  const updateRow = (index, patch) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    setRows(next);
  };

  const handleRejectedChange = (index, value) => {
    const row = rows[index];
    const rejected = Math.max(0, Math.min(Number(value) || 0, row.received_qty));
    const passed = Math.max(0, row.received_qty - rejected);
    updateRow(index, { rejected_qty: String(rejected), passed_qty: String(passed) });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post(`/procurement/inward-entries/${entry.id}/approve`, {
        status: decision,
        items: rows.map((r) => ({
          id: r.id,
          passed_qty: Number(r.passed_qty) || 0,
          rejected_qty: Number(r.rejected_qty) || 0,
          qc_remarks: r.qc_remarks || null,
        })),
      });
      if (res.success) onQcDone();
    } catch (err) {
      // Business-rule errors here (e.g. "Total QC quantity cannot exceed
      // received quantity") surface as a plain message, not structured
      // field errors — see Phase 4B report §11(b).
      setError(err.message || 'Failed to submit QC sign-off');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-amber-300 rounded shadow-sm mb-4 overflow-hidden">
      <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold text-sm text-gray-800">Quality Control (QC) Inspection Pass</span>
        <span className={`badge border rounded-md px-2 py-1 text-xs font-medium ${statusMeta.className}`}>
          <i className={`bi ${statusMeta.icon} me-1`}></i>{statusMeta.label}
        </span>
      </div>

      <div className="p-4">
        {entry.qc_inspected_at && (
          <p className="text-xs text-gray-500 mb-3">
            Inspected Date: {formatDateTime(entry.qc_inspected_at)}
            {entry.qc_inspector_name ? ` · Inspected By: ${entry.qc_inspector_name}` : ''}
          </p>
        )}

        {entry.status !== 'pending' ? (
          <p className="text-sm text-gray-500">This receipt has already been QC-inspected.</p>
        ) : !can('inward-entry.approve') ? (
          <p className="text-sm text-gray-400">QC inspection requires the <code>inward-entry.approve</code> permission.</p>
        ) : (
          <>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-3">{error}</div>}

            <div className="overflow-x-auto border border-gray-200 rounded-md mb-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product / Description</th>
                    <th className="px-3 py-2 font-medium text-right">Received</th>
                    <th className="px-3 py-2 font-medium text-right w-28">Passed Qty</th>
                    <th className="px-3 py-2 font-medium text-right w-28">Rejected Qty</th>
                    <th className="px-3 py-2 font-medium">QC Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-900">{row.product_name || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.received_qty}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">{row.passed_qty}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={row.received_qty}
                          value={row.rejected_qty}
                          onChange={(e) => handleRejectedChange(index, e.target.value)}
                          className="form-input w-20 rounded border-gray-300 text-sm text-right text-red-700"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={row.qc_remarks} onChange={(e) => updateRow(index, { qc_remarks: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4 max-w-sm">
              <label className="block text-xs font-medium text-gray-700 mb-1">QC Decision</label>
              <select value={decision} onChange={(e) => setDecision(e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                <option value="approved">Approve (QC Pass)</option>
                <option value="rejected">Reject Shipment</option>
              </select>
            </div>

            <button type="button" disabled={submitting} onClick={submit} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
              <i className="bi bi-shield-check me-1"></i> {submitting ? 'Submitting…' : 'Submit QC Sign-off'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
