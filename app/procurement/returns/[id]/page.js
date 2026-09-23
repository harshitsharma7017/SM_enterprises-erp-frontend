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

export default function SupplierReturnShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchReturn = useCallback(async () => {
    try {
      const res = await apiClient.get(`/procurement/supplier-returns/${id}`);
      setRet(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load return');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchReturn);
  }, [fetchReturn]);

  const run = async (action, confirmText) => {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/procurement/supplier-returns/${id}/${action}`);
      setNotice(res.message || null);
      await fetchReturn();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading return...</div></DashboardLayout>;
  if (!ret) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Return not found'}</div></DashboardLayout>;

  const dp = ret.uom_decimal_places;
  const q = (v) => (v === null || v === undefined ? '—' : `${formatQuantity(v, dp)} ${ret.unit || ''}`);
  const debited = ret.debit_notes.filter((d) => d.status !== 'cancelled').reduce((sum, d) => sum + Number(d.quantity), 0);

  return (
    <DashboardLayout>
      <PageHeading
        title={ret.return_no}
        breadcrumbs={[{ label: 'Supplier Returns', href: '/procurement/returns' }, { label: ret.return_no }]}
        actions={(
          <>
            {ret.status === 'draft' && can('supplier-return.post') && (
              <button type="button" disabled={busy} onClick={() => run('post', `Post ${ret.return_no}? The quantity counts as returned to the supplier.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Post Return</button>
            )}
            {ret.status === 'posted' && Number(ret.quantity) - debited > 0 && can('debit-note.create') && (
              <Link href={`/finance/debit-notes/create?quality_inspection_id=${ret.quality_inspection_id}&supplier_return_id=${ret.id}`} className={`${BTN} border border-purple-300 text-purple-800 hover:bg-purple-50`}><i className="bi bi-file-earmark-minus me-1"></i> Debit Note</Link>
            )}
            {ret.status !== 'cancelled' && can('supplier-return.cancel') && (
              <button type="button" disabled={busy} onClick={() => run('cancel', `Cancel ${ret.return_no}?`)} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/procurement/returns" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {ret.status === 'draft' && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — reserves the rejected quantity but does not count as returned until posted.</div>}

      <Card title="Return" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={ret.status} config={POSTING_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Return Date</dt><dd className="mt-1 text-gray-900">{formatDate(ret.return_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Quantity</dt><dd className="mt-1 text-lg font-semibold">{q(ret.quantity)}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Inspection</dt>
            <dd className="mt-1">
              <Link href={`/quality-control/${ret.quality_inspection_id}`} className="font-mono text-blue-600 hover:underline">{ret.qc_no}</Link>{' '}
              <WorkflowBadge status={ret.qc_status === 'completed' ? ret.qc_result : ret.qc_status} config={QC_STATUS_BADGES} />
              <div className="text-xs text-gray-500">Rejected {q(ret.qc_rejected_quantity)}{ret.qc_marked_return_quantity !== null ? ` · marked for return ${q(ret.qc_marked_return_quantity)}` : ''}</div>
            </dd>
          </div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Reason</dt><dd className="mt-1 text-gray-900">{ret.reason || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{ret.remarks || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{ret.creator_name || '—'} · {formatDateTime(ret.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Posted</dt><dd className="mt-1 text-gray-900">{ret.posted_at ? `${formatDateTime(ret.posted_at)} · ${ret.poster_name || '—'}` : '—'}</dd></div>
          {ret.cancelled_at && <div><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-gray-900">{formatDateTime(ret.cancelled_at)} · {ret.canceller_name || '—'}</dd></div>}
        </dl>
      </Card>

      <Card title="Source & Traceability" variant="info">
        <TraceChain doc={ret} />
      </Card>

      <Card title="Debit Notes" variant="info">
        {ret.debit_notes.length === 0 ? <p className="text-sm text-gray-500 m-0">No debit notes against this return.</p> : (
          <ul className="list-none p-0 m-0 space-y-1 text-sm">
            {ret.debit_notes.map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                {can('debit-note.view') ? <Link href={`/finance/debit-notes/${d.id}`} className="font-mono text-blue-600 hover:underline">{d.debit_note_no}</Link> : <span className="font-mono">{d.debit_note_no}</span>}
                <span className="text-gray-500">{formatDate(d.debit_note_date)} · {q(d.quantity)}{d.amount !== null ? ` · ${formatAmount(d.amount)}` : ''}</span>
                <WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}
