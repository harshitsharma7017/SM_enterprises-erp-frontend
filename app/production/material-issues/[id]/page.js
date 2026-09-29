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
import DocumentButton from '@/components/ui/DocumentButton';

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

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading material issue...</div></DashboardLayout>;
  if (!issue) return <DashboardLayout><div className="alert alert-danger">{error || 'Material issue not found'}</div></DashboardLayout>;

  const isDraft = issue.status === 'draft';

  return (
    <DashboardLayout>
      <PageHeading
        title={issue.issue_no}
        breadcrumbs={[{ label: 'Material Issues', href: '/production/material-issues' }, { label: issue.issue_no }]}
        actions={(
          <>
            <DocumentButton endpoint={`/production/material-issues/${id}/document`} number={issue.issue_no} onError={setError} />
            {isDraft && can('material-issue.edit') && (
              <Link href={`/production/material-issues/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}><i className="bi bi-pencil me-1"></i> Edit</Link>
            )}
            {isDraft && can('material-issue.post') && (
              <button type="button" disabled={busy} onClick={() => run('post', `Issue ${issue.issue_no}? Stock is reduced now and the issue cannot be edited or cancelled afterwards.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Post / Issue</button>
            )}
            {isDraft && can('material-issue.cancel') && (
              <button type="button" disabled={busy} onClick={() => run('cancel', `Cancel draft ${issue.issue_no}?`)} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>
            )}
            <Link href="/production/material-issues" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — stock is not reduced until the issue is posted. Available quantities below are live.</div>}

      <Card title="Issue" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={issue.company_label} code={issue.company_code} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={issue.status} config={MATERIAL_ISSUE_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Issue Date</dt><dd className="mt-1 text-fg">{formatDate(issue.issue_date)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Source Location</dt><dd className="mt-1 text-fg"><span className="font-mono">{issue.location_code}</span> · {issue.location_name}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Job Reference</dt><dd className="mt-1 text-fg">{issue.job_reference || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Received by</dt><dd className="mt-1 text-fg">{issue.receiver_name || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Supervisor / Cutting</dt><dd className="mt-1 text-fg">{issue.supervisor_name || '—'}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Foreman</dt><dd className="mt-1 text-fg">{issue.foreman_name || '—'}</dd></div>
          {issue.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg">{issue.remarks}</dd></div>}
          <div><dt className="text-fg-subtle text-xs">Created</dt><dd className="mt-1 text-fg">{issue.creator_name || '—'} · {formatDateTime(issue.created_at)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Posted</dt><dd className="mt-1 text-fg">{issue.posted_at ? `${formatDateTime(issue.posted_at)} · ${issue.poster_name || '—'}` : '—'}</dd></div>
          {issue.cancelled_at && <div><dt className="text-fg-subtle text-xs">Cancelled</dt><dd className="mt-1 text-fg">{formatDateTime(issue.cancelled_at)} · {issue.canceller_name || '—'}</dd></div>}
        </dl>
      </Card>

      <Card title="Issued Lots" variant="info">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lot</th>
              <th>Material</th>
              <th className="text-right">Width</th>
              <th className="text-right">Quantity</th>
              {isDraft && <th className="text-right">Available now</th>}
              <th>Stock Movement</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {issue.items.map((item) => (
              <tr key={item.id}>
                <td><Link href={`/procurement/lots/${item.lot_id}`} className="font-mono text-link hover:underline">{item.lot_no}</Link></td>
                <td>{item.product_name}</td>
                <td className="text-right">{formatQuantity(item.width_inch, 3)}&quot;</td>
                <td className="text-right font-semibold whitespace-nowrap">{formatQuantity(item.quantity, item.uom_decimal_places)} {item.unit}</td>
                {isDraft && <td className={`text-right ${Number(item.available_quantity) < Number(item.quantity) ? 'text-[var(--danger)]' : 'text-fg-muted'}`}>{formatQuantity(item.available_quantity, item.uom_decimal_places)}</td>}
                <td>
                  {item.stock_movement_id ? (
                    can('stock.ledger') ? <Link href={`/inventory/ledger/${item.stock_movement_id}`} className="font-mono text-link hover:underline">{item.stock_movement_no}</Link> : <span className="font-mono">{item.stock_movement_no}</span>
                  ) : <span className="text-fg-subtle">On posting</span>}
                </td>
                <td className="text-fg-muted">{item.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Processing" variant="info">
        {issue.processing_record_id ? (
          <p className="text-sm m-0">
            <Link href={`/production/processing/${issue.processing_record_id}`} className="font-mono text-link hover:underline">{issue.processing_no}</Link>{' '}
            <WorkflowBadge status={issue.processing_status} config={PROCESSING_STATUS_BADGES} />
          </p>
        ) : issue.status === 'issued' && can('processing.create') ? (
          <form onSubmit={startProcessing} className="filter-bar">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Start date *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" />
            </div>
            <button type="submit" disabled={busy} className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">
              <i className="bi bi-gear-wide-connected me-1"></i> Start Processing
            </button>
          </form>
        ) : (
          <p className="text-sm text-fg-subtle m-0">{issue.status === 'issued' ? 'Processing not started.' : 'Processing starts once the material is issued.'}</p>
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
