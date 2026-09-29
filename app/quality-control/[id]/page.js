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
import { formatDate, formatDateTime, formatQuantity, formatAmount, todayDateInputValue } from '@/components/sales/shared/format';
import DocumentButton from '@/components/ui/DocumentButton';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

function Figure({ label, value, tone = 'text-fg' }) {
  return (
    <div className="rounded border border-line p-2">
      <div className="text-xs text-fg-subtle">{label}</div>
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
  const [locations, setLocations] = useState([]);
  const [posting, setPosting] = useState({ location_id: '', movement_date: todayDateInputValue(), remarks: '' });

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

  // Active locations of the QC's company, for Post to Stock.
  const qcCompanyId = qc?.company_id;
  useEffect(() => {
    if (!qcCompanyId || !can('stock.post')) return;
    apiClient.get(`/inventory/locations?company_id=${qcCompanyId}&status=active&limit=500`)
      .then((res) => setLocations(res.data || []))
      .catch(() => setLocations([]));
  }, [qcCompanyId, can]);

  const postToStock = async (e) => {
    e.preventDefault();
    if (!confirm(`Post the accepted ${qc.accepted_quantity ? formatQuantity(qc.accepted_quantity, qc.uom_decimal_places) : ''} ${qc.unit || ''} of ${qc.qc_no} to stock? This creates an immutable stock movement and the inspection can no longer be cancelled.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post('/inventory/stock/receive-qc', { ...posting, quality_inspection_id: Number(id), location_id: Number(posting.location_id) });
      setNotice(res.message || null);
      await fetchQc();
    } catch (err) {
      setError(err.message || 'Posting to stock failed');
    } finally {
      setBusy(false);
    }
  };

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

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading inspection...</div></DashboardLayout>;
  if (!qc) return <DashboardLayout><div className="alert alert-danger">{error || 'Inspection not found'}</div></DashboardLayout>;

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
            <DocumentButton endpoint={`/quality-control/${id}/document`} number={qc.qc_no} onError={setError} />
            {isDraft && can('inward-entry.approve') && (
              <Link href={`/quality-control/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}><i className="bi bi-pencil me-1"></i> Edit</Link>
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
            {qc.status !== 'cancelled' && !qc.stock_movement_id && can('inward-entry.approve') && (
              <button type="button" disabled={busy} onClick={cancel} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/quality-control" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
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
          <span className="text-fg-subtle">Inspected on {formatDate(qc.inspection_date)}</span>
          {qc.completed_at && <span className="text-fg-subtle">· completed {formatDateTime(qc.completed_at)} by {qc.completer_name || '—'}</span>}
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
          <div><dt className="text-fg-subtle text-xs">Shade</dt><dd className="mt-1 text-fg">{qc.shade || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Edge-to-Edge Shade</dt><dd className="mt-1 text-fg">{qc.edge_to_edge_shade || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Weaving Defects</dt><dd className="mt-1 text-fg whitespace-pre-line">{qc.weaving_defects || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{qc.remarks || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Recorded by</dt><dd className="mt-1 text-fg">{qc.creator_name || '—'} · {formatDateTime(qc.created_at)}</dd></div>
        </dl>
      </Card>

      {isCompleted && Number(qc.accepted_quantity) > 0 && (
        <Card title="Stock" variant="info">
          {qc.stock_movement_id ? (
            <p className="text-sm m-0">
              Accepted {q(qc.stock_quantity)} posted to stock as{' '}
              {can('stock.ledger') ? <Link href={`/inventory/ledger/${qc.stock_movement_id}`} className="font-mono text-link hover:underline">{qc.stock_movement_no}</Link> : <span className="font-mono">{qc.stock_movement_no}</span>}
              {' '}on {formatDate(qc.stock_movement_date)} at <span className="font-mono">{qc.stock_location_code}</span> ({qc.stock_location_name}).
            </p>
          ) : can('stock.post') ? (
            <form onSubmit={postToStock} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <p className="md:col-span-5 text-sm m-0 text-fg-muted">Accepted {q(qc.accepted_quantity)} is not in stock yet. Rejected quantity never enters usable stock.</p>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Location *</label>
                <select required value={posting.location_id} onChange={(e) => setPosting({ ...posting, location_id: e.target.value })} className="form-select">
                  <option value="">{locations.length ? '— Select —' : 'No active location'}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Date *</label>
                <input type="date" required value={posting.movement_date} onChange={(e) => setPosting({ ...posting, movement_date: e.target.value })} className="form-input" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-fg-muted mb-1">Remarks</label>
                <input type="text" maxLength={2000} value={posting.remarks} onChange={(e) => setPosting({ ...posting, remarks: e.target.value })} className="form-input" />
              </div>
              <button type="submit" disabled={busy || !posting.location_id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">
                <i className="bi bi-box-arrow-in-down me-1"></i> Post to Stock
              </button>
            </form>
          ) : (
            <p className="text-sm text-fg-subtle m-0">Accepted quantity not posted to stock yet.</p>
          )}
        </Card>
      )}

      <Card title="Source & Traceability" variant="info">
        <TraceChain doc={qc} quantityLabel="Lot quantity" />
      </Card>

      <Card title="Supplier Returns" variant="info">
        {qc.returns.length === 0 ? <p className="text-sm text-fg-subtle m-0">No returns against this inspection.</p> : (
          <table className="data-table">
            <thead><tr><th>Return No.</th><th>Date</th><th className="text-right">Quantity</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {qc.returns.map((r) => (
                <tr key={r.id}>
                  <td>{can('supplier-return.view') ? <Link href={`/procurement/returns/${r.id}`} className="font-mono text-link hover:underline">{r.return_no}</Link> : <span className="font-mono">{r.return_no}</span>}</td>
                  <td className="text-fg-muted">{formatDate(r.return_date)}</td>
                  <td className="text-right">{q(r.quantity)}</td>
                  <td className="text-fg-muted">{r.reason || '—'}</td>
                  <td><WorkflowBadge status={r.status} config={POSTING_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Debit Notes" variant="info">
        {qc.debit_notes.length === 0 ? <p className="text-sm text-fg-subtle m-0">No debit notes against this inspection.</p> : (
          <table className="data-table">
            <thead><tr><th>Debit Note</th><th>Date</th><th className="text-right">Quantity</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {qc.debit_notes.map((d) => (
                <tr key={d.id}>
                  <td>{can('debit-note.view') ? <Link href={`/finance/debit-notes/${d.id}`} className="font-mono text-link hover:underline">{d.debit_note_no}</Link> : <span className="font-mono">{d.debit_note_no}</span>}</td>
                  <td className="text-fg-muted">{formatDate(d.debit_note_date)}</td>
                  <td className="text-right">{q(d.quantity)}</td>
                  <td className="text-right">{d.amount === null ? '—' : formatAmount(d.amount)}</td>
                  <td><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
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
                <Link href={`/quality-control/${h.id}`} className="font-mono text-link hover:underline">{h.qc_no}</Link>
                <span className="text-fg-subtle">{formatDate(h.inspection_date)} · {q(h.inspected_quantity)}</span>
                <WorkflowBadge status={qcBadgeStatus(h)} config={QC_STATUS_BADGES} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}
