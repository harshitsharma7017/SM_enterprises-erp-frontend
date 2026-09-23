'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, POSTING_STATUS_BADGES, QC_STATUS_BADGES } from '@/components/ui/Badge';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';
const AMOUNT_BASIS = { po_price: 'Quantity × PO price', manual: 'Entered manually (PO has no price)', none: 'No amount (PO has no price)' };

export default function DebitNoteShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchNote = useCallback(async () => {
    try {
      const res = await apiClient.get(`/finance/debit-notes/${id}`);
      setNote(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load debit note');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchNote);
  }, [fetchNote]);

  const run = async (action, confirmText) => {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/finance/debit-notes/${id}/${action}`);
      setNotice(res.message || null);
      await fetchNote();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading debit note...</div></DashboardLayout>;
  if (!note) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Debit note not found'}</div></DashboardLayout>;

  const dp = note.uom_decimal_places;
  const q = (v) => `${formatQuantity(v, dp)} ${note.unit || ''}`;
  const isDraft = note.status === 'draft';

  return (
    <DashboardLayout>
      <PageHeading
        title={note.debit_note_no}
        breadcrumbs={[{ label: 'Debit Notes', href: '/finance/debit-notes' }, { label: note.debit_note_no }]}
        actions={(
          <>
            {isDraft && can('debit-note.edit') && (
              <Link href={`/finance/debit-notes/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>
            )}
            {isDraft && can('debit-note.approve') && (
              <button type="button" disabled={busy} onClick={() => run('post', `Post ${note.debit_note_no}? A posted debit note is final and cannot be edited.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Post</button>
            )}
            {note.status !== 'cancelled' && can('debit-note.approve') && (
              <button type="button" disabled={busy} onClick={() => run('cancel', `Cancel ${note.debit_note_no}?`)} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/finance/debit-notes" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — only posted debit notes are final.</div>}

      <Card title="Debit Note" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={note.status} config={POSTING_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Date</dt><dd className="mt-1 text-gray-900">{formatDate(note.debit_note_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Supplier</dt><dd className="mt-1 text-gray-900">{note.supplier_name}{note.supplier_gst_number && <div className="text-xs text-gray-500">GSTIN {note.supplier_gst_number}</div>}</dd></div>
          <div><dt className="text-gray-500 text-xs">Quantity</dt><dd className="mt-1 text-lg font-semibold">{q(note.quantity)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Unit Price</dt><dd className="mt-1 text-gray-900">{note.unit_price === null ? '—' : formatAmount(note.unit_price)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Amount</dt><dd className="mt-1 text-lg font-semibold">{note.amount === null ? '—' : formatAmount(note.amount)}</dd><dd className="text-xs text-gray-500">{AMOUNT_BASIS[note.amount_basis]} · no tax applied</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Reason</dt><dd className="mt-1 text-gray-900">{note.reason || '—'}</dd></div>
          <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{note.remarks || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{note.creator_name || '—'} · {formatDateTime(note.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Posted</dt><dd className="mt-1 text-gray-900">{note.posted_at ? `${formatDateTime(note.posted_at)} · ${note.poster_name || '—'}` : '—'}</dd></div>
          {note.cancelled_at && <div><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-gray-900">{formatDateTime(note.cancelled_at)} · {note.canceller_name || '—'}</dd></div>}
        </dl>
      </Card>

      <Card title="Rejection / Return" variant="info">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Inspection</dt>
            <dd className="mt-1">
              {can('inward-entry.view') ? <Link href={`/quality-control/${note.quality_inspection_id}`} className="font-mono text-blue-600 hover:underline">{note.qc_no}</Link> : <span className="font-mono">{note.qc_no}</span>}{' '}
              {note.qc_result && <WorkflowBadge status={note.qc_result} config={QC_STATUS_BADGES} />}
            </dd>
          </div>
          <div><dt className="text-gray-500 text-xs">Rejected at QC</dt><dd className="mt-1 text-gray-900">{q(note.qc_rejected_quantity)}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Supplier Return</dt>
            <dd className="mt-1">
              {note.supplier_return_id ? (
                <>
                  {can('supplier-return.view') ? <Link href={`/procurement/returns/${note.supplier_return_id}`} className="font-mono text-blue-600 hover:underline">{note.return_no}</Link> : <span className="font-mono">{note.return_no}</span>}
                  <span className="text-xs text-gray-500"> · {formatDate(note.return_date)} · {q(note.return_quantity)}</span>
                </>
              ) : <span className="text-gray-500">None — rejected material not returned</span>}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Source & Traceability" variant="info">
        <TraceChain doc={note} />
      </Card>
    </DashboardLayout>
  );
}
