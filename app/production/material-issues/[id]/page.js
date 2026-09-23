'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, MATERIAL_ISSUE_STATUS_BADGES, PROCESSING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, todayDateInputValue } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function MaterialIssueShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [startDate, setStartDate] = useState(todayDateInputValue());

  const fetchIssue = useCallback(async () => {
    try {
      const res = await apiClient.get(`/production/material-issues/${id}`);
      setIssue(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load material issue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchIssue);
  }, [fetchIssue]);

  const run = async (action, confirmText) => {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/production/material-issues/${id}/${action}`);
      setNotice(res.message || null);
      await fetchIssue();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const startProcessing = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post('/production/processing', { material_issue_id: Number(id), start_date: startDate });
      router.push(`/production/processing/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Could not start processing');
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading material issue...</div></DashboardLayout>;
  if (!issue) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Material issue not found'}</div></DashboardLayout>;

  const isDraft = issue.status === 'draft';

  return (
    <DashboardLayout>
      <PageHeading
        title={issue.issue_no}
        breadcrumbs={[{ label: 'Material Issues', href: '/production/material-issues' }, { label: issue.issue_no }]}
        actions={(
          <>
            {isDraft && can('material-issue.edit') && (
              <Link href={`/production/material-issues/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>
            )}
            {isDraft && can('material-issue.post') && (
              <button type="button" disabled={busy} onClick={() => run('post', `Issue ${issue.issue_no}? Stock is reduced now and the issue cannot be edited or cancelled afterwards.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Post / Issue</button>
            )}
            {isDraft && can('material-issue.cancel') && (
              <button type="button" disabled={busy} onClick={() => run('cancel', `Cancel draft ${issue.issue_no}?`)} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/production/material-issues" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — stock is not reduced until the issue is posted. Available quantities below are live.</div>}

      <Card title="Issue" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={issue.company_label} code={issue.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={issue.status} config={MATERIAL_ISSUE_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Issue Date</dt><dd className="mt-1 text-gray-900">{formatDate(issue.issue_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Source Location</dt><dd className="mt-1 text-gray-900"><span className="font-mono">{issue.location_code}</span> · {issue.location_name}</dd></div>
          <div><dt className="text-gray-500 text-xs">Job Reference</dt><dd className="mt-1 text-gray-900">{issue.job_reference || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Received by</dt><dd className="mt-1 text-gray-900">{issue.receiver_name || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Supervisor / Cutting</dt><dd className="mt-1 text-gray-900">{issue.supervisor_name || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Foreman</dt><dd className="mt-1 text-gray-900">{issue.foreman_name || '—'}</dd></div>
          {issue.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900">{issue.remarks}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{issue.creator_name || '—'} · {formatDateTime(issue.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Posted</dt><dd className="mt-1 text-gray-900">{issue.posted_at ? `${formatDateTime(issue.posted_at)} · ${issue.poster_name || '—'}` : '—'}</dd></div>
          {issue.cancelled_at && <div><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-gray-900">{formatDateTime(issue.cancelled_at)} · {issue.canceller_name || '—'}</dd></div>}
        </dl>
      </Card>

      <Card title="Issued Lots" variant="info">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 text-xs text-left">
            <tr>
              <th className="py-1.5 font-medium">Lot</th>
              <th className="py-1.5 font-medium">Material</th>
              <th className="py-1.5 font-medium text-right">Width</th>
              <th className="py-1.5 font-medium text-right">Quantity</th>
              {isDraft && <th className="py-1.5 font-medium text-right">Available now</th>}
              <th className="py-1.5 font-medium">Stock Movement</th>
              <th className="py-1.5 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {issue.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5"><Link href={`/procurement/lots/${item.lot_id}`} className="font-mono text-blue-600 hover:underline">{item.lot_no}</Link></td>
                <td className="py-1.5">{item.product_name}</td>
                <td className="py-1.5 text-right">{formatQuantity(item.width_inch, 3)}&quot;</td>
                <td className="py-1.5 text-right font-semibold whitespace-nowrap">{formatQuantity(item.quantity, item.uom_decimal_places)} {item.unit}</td>
                {isDraft && <td className={`py-1.5 text-right ${Number(item.available_quantity) < Number(item.quantity) ? 'text-red-600' : 'text-gray-600'}`}>{formatQuantity(item.available_quantity, item.uom_decimal_places)}</td>}
                <td className="py-1.5">
                  {item.stock_movement_id ? (
                    can('stock.ledger') ? <Link href={`/inventory/ledger/${item.stock_movement_id}`} className="font-mono text-blue-600 hover:underline">{item.stock_movement_no}</Link> : <span className="font-mono">{item.stock_movement_no}</span>
                  ) : <span className="text-gray-400">On posting</span>}
                </td>
                <td className="py-1.5 text-gray-600">{item.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Processing" variant="info">
        {issue.processing_record_id ? (
          <p className="text-sm m-0">
            <Link href={`/production/processing/${issue.processing_record_id}`} className="font-mono text-blue-600 hover:underline">{issue.processing_no}</Link>{' '}
            <WorkflowBadge status={issue.processing_status} config={PROCESSING_STATUS_BADGES} />
          </p>
        ) : issue.status === 'issued' && can('processing.create') ? (
          <form onSubmit={startProcessing} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start date *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input rounded border-gray-300 text-sm" />
            </div>
            <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">
              <i className="bi bi-gear-wide-connected me-1"></i> Start Processing
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500 m-0">{issue.status === 'issued' ? 'Processing not started.' : 'Processing starts once the material is issued.'}</p>
        )}
      </Card>

      {issue.items.map((item) => (
        <Card key={item.id} title={`Traceability · ${item.lot_no}`} variant="info">
          <TraceChain doc={{ ...item, company_label: issue.company_label, company_code: issue.company_code }} />
        </Card>
      ))}
    </DashboardLayout>
  );
}
