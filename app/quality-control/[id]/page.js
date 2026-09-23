'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, QC_STATUS_BADGES, POSTING_STATUS_BADGES, qcBadgeStatus } from '@/components/ui/Badge';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

function Figure({ label, value, tone = 'text-gray-900' }) {
  return (
    <div className="rounded border border-gray-200 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

export default function QcShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [qc, setQc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchQc = useCallback(async () => {
    try {
      const res = await apiClient.get(`/quality-control/${id}`);
      setQc(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load inspection');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchQc);
  }, [fetchQc]);

  const run = async (action, body) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/quality-control/${id}/${action}`, body);
      setNotice(res.message || null);
      await fetchQc();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const complete = () => {
    if (confirm(`Complete ${qc.qc_no}? Quantities are final once completed.`)) run('complete');
  };
  const cancel = () => {
    const reason = prompt(`Cancel ${qc.qc_no}? It stays in the history and the lot quantity becomes available for re-inspection.\n\nReason (optional):`);
    if (reason !== null) run('cancel', { reason });
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading inspection...</div></DashboardLayout>;
  if (!qc) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Inspection not found'}</div></DashboardLayout>;

  const dp = qc.uom_decimal_places;
  const q = (v) => (v === null || v === undefined ? '—' : `${formatQuantity(v, dp)} ${qc.unit || ''}`);
  const isDraft = qc.status === 'draft';
  const isCompleted = qc.status === 'completed';
  const rejected = Number(qc.rejected_quantity || 0);
  const returnable = rejected - Number(qc.returned_quantity) - Number(qc.return_draft_quantity);
  const debitable = rejected - Number(qc.debited_quantity) - Number(qc.debit_draft_quantity);

  return (
    <DashboardLayout>
      <PageHeading
        title={qc.qc_no}
        breadcrumbs={[{ label: 'Quality Control', href: '/quality-control' }, { label: qc.qc_no }]}
        actions={(
          <>
            {isDraft && can('inward-entry.approve') && (
              <Link href={`/quality-control/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>
            )}
            {isDraft && can('inward-entry.approve') && (
              <button type="button" disabled={busy} onClick={complete} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Complete</button>
            )}
            {isCompleted && returnable > 0 && can('supplier-return.create') && (
              <Link href={`/procurement/returns/create?quality_inspection_id=${id}`} className={`${BTN} border border-amber-300 text-amber-800 hover:bg-amber-50`}><i className="bi bi-box-arrow-up me-1"></i> Return to Supplier</Link>
            )}
            {isCompleted && debitable > 0 && can('debit-note.create') && (
              <Link href={`/finance/debit-notes/create?quality_inspection_id=${id}`} className={`${BTN} border border-purple-300 text-purple-800 hover:bg-purple-50`}><i className="bi bi-file-earmark-minus me-1"></i> Debit Note</Link>
            )}
            {qc.status !== 'cancelled' && can('inward-entry.approve') && (
              <button type="button" disabled={busy} onClick={cancel} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/quality-control" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Pending — the result is set when the inspection is completed.</div>}
      {qc.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
          Cancelled {formatDateTime(qc.cancelled_at)} by {qc.canceller_name || '—'}{qc.cancellation_reason ? ` — ${qc.cancellation_reason}` : ''}. Kept for history; it no longer counts.
        </div>
      )}

      <Card title="Inspection" variant="primary">
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <WorkflowBadge status={qcBadgeStatus(qc)} config={QC_STATUS_BADGES} />
          <span className="text-gray-500">Inspected on {formatDate(qc.inspection_date)}</span>
          {qc.completed_at && <span className="text-gray-500">· completed {formatDateTime(qc.completed_at)} by {qc.completer_name || '—'}</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
          <Figure label="Inspected" value={q(qc.inspected_quantity)} />
          <Figure label="Accepted" value={q(qc.accepted_quantity)} tone="text-green-700" />
          <Figure label="Rejected" value={q(qc.rejected_quantity)} tone="text-red-700" />
          <Figure label="Marked for return (QC)" value={q(qc.return_quantity)} />
          <Figure label="Returned (posted)" value={q(qc.returned_quantity)} />
          <Figure label="Returns in draft" value={q(qc.return_draft_quantity)} />
          <Figure label="Rejected, not returned" value={q(rejected - Number(qc.returned_quantity))} tone="text-amber-700" />
          <Figure label="Debited (posted)" value={`${q(qc.debited_quantity)} · ${formatAmount(qc.debited_amount)}`} />
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Shade</dt><dd className="mt-1 text-gray-900">{qc.shade || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Edge-to-Edge Shade</dt><dd className="mt-1 text-gray-900">{qc.edge_to_edge_shade || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Weaving Defects</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{qc.weaving_defects || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{qc.remarks || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Recorded by</dt><dd className="mt-1 text-gray-900">{qc.creator_name || '—'} · {formatDateTime(qc.created_at)}</dd></div>
        </dl>
      </Card>

      <Card title="Source & Traceability" variant="info">
        <TraceChain doc={qc} quantityLabel="Lot quantity" />
      </Card>

      <Card title="Supplier Returns" variant="info">
        {qc.returns.length === 0 ? <p className="text-sm text-gray-500 m-0">No returns against this inspection.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Return No.</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium">Reason</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {qc.returns.map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5">{can('supplier-return.view') ? <Link href={`/procurement/returns/${r.id}`} className="font-mono text-blue-600 hover:underline">{r.return_no}</Link> : <span className="font-mono">{r.return_no}</span>}</td>
                  <td className="py-1.5 text-gray-600">{formatDate(r.return_date)}</td>
                  <td className="py-1.5 text-right">{q(r.quantity)}</td>
                  <td className="py-1.5 text-gray-600">{r.reason || '—'}</td>
                  <td className="py-1.5"><WorkflowBadge status={r.status} config={POSTING_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Debit Notes" variant="info">
        {qc.debit_notes.length === 0 ? <p className="text-sm text-gray-500 m-0">No debit notes against this inspection.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Debit Note</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium text-right">Amount</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {qc.debit_notes.map((d) => (
                <tr key={d.id}>
                  <td className="py-1.5">{can('debit-note.view') ? <Link href={`/finance/debit-notes/${d.id}`} className="font-mono text-blue-600 hover:underline">{d.debit_note_no}</Link> : <span className="font-mono">{d.debit_note_no}</span>}</td>
                  <td className="py-1.5 text-gray-600">{formatDate(d.debit_note_date)}</td>
                  <td className="py-1.5 text-right">{q(d.quantity)}</td>
                  <td className="py-1.5 text-right">{d.amount === null ? '—' : formatAmount(d.amount)}</td>
                  <td className="py-1.5"><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {qc.lot_inspections.length > 0 && (
        <Card title="Other Inspections of this Lot" variant="info">
          <ul className="list-none p-0 m-0 space-y-1 text-sm">
            {qc.lot_inspections.map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                <Link href={`/quality-control/${h.id}`} className="font-mono text-blue-600 hover:underline">{h.qc_no}</Link>
                <span className="text-gray-500">{formatDate(h.inspection_date)} · {q(h.inspected_quantity)}</span>
                <WorkflowBadge status={qcBadgeStatus(h)} config={QC_STATUS_BADGES} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}
