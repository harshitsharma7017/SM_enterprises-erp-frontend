'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import CompanyBadge from '@/components/company/CompanyBadge';
import { WorkflowBadge, PRODUCTION_PLAN_STATUS_BADGES, PRODUCTION_LINE_BADGES, PROCESSING_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';
import { lineStatus, pendingOf } from '@/components/production/productionPlanProgress';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium';
const LINK = 'font-mono text-link hover:underline';

export default function ProductionPlanPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/production/plans/${id}`);
      setPlan(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load the production plan');
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const run = async (action, body, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post(`/production/plans/${id}/${action}`, body || {});
      setNotice(res.message || null);
      setPlan(res.data);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(`Delete draft ${plan.plan_no}?`)) return;
    try {
      await apiClient.delete(`/production/plans/${id}`);
      router.push('/production/plans');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (!plan) return <DashboardLayout>{error ? <div className="alert alert-danger">{error}</div> : <div className="p-8 text-center text-fg-subtle">Loading…</div>}</DashboardLayout>;

  const canEdit = can('production-plan.edit');
  const isDraft = plan.status === 'draft';
  const isPlanned = plan.status === 'planned';

  return (
    <DashboardLayout>
      <PageHeading
        title={plan.plan_no}
        breadcrumbs={[{ label: 'Production Plans', href: '/production/plans' }, { label: plan.plan_no }]}
        actions={(
          <>
            {isDraft && canEdit && <Link href={`/production/plans/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}><i className="bi bi-pencil me-1"></i> Edit</Link>}
            {isDraft && canEdit && <button type="button" disabled={busy} onClick={() => run('mark-planned', null, `Mark ${plan.plan_no} planned? Its lines are then fixed and processing can be booked against them.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-check2-circle me-1"></i> Mark Planned</button>}
            {isPlanned && canEdit && <button type="button" disabled={busy} onClick={() => run('complete', null, `Complete ${plan.plan_no}? No more processing can be booked against it.`)} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-flag me-1"></i> Complete</button>}
            {isPlanned && canEdit && Number(plan.processing_count) === 0 && <button type="button" disabled={busy} onClick={() => run('revert-to-draft')} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Revert to Draft</button>}
            {(isDraft || isPlanned) && canEdit && Number(plan.processing_count) === 0 && <button type="button" disabled={busy} onClick={() => { const reason = prompt('Reason for cancelling (optional):'); if (reason !== null) run('cancel', { reason }); }} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>}
            {isDraft && can('production-plan.delete') && <button type="button" onClick={remove} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}><i className="bi bi-trash me-1"></i> Delete</button>}
            <Link href="/production/plans" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isPlanned && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-sm">Book processing against a line from the processing record (Production → Processing → the record → &quot;Production plan line&quot;). Its posted output counts as produced here.</div>}

      <Card title="Production Plan" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={plan.company_label} code={plan.company_code} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={plan.status} config={PRODUCTION_PLAN_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Plan date</dt><dd className="mt-1 text-fg">{formatDate(plan.plan_date)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Target date</dt><dd className="mt-1 text-fg">{plan.target_date ? formatDate(plan.target_date) : '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">Title</dt><dd className="mt-1 text-fg">{plan.title}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Lines produced</dt><dd className="mt-1 text-fg">{plan.produced_lines_count} of {plan.lines_count}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Processing booked</dt><dd className="mt-1 text-fg">{plan.processing_count}</dd></div>
          {plan.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{plan.remarks}</dd></div>}
          <div><dt className="text-fg-subtle text-xs">Created</dt><dd className="mt-1 text-fg">{plan.creator_name || '—'} · {formatDateTime(plan.created_at)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Planned</dt><dd className="mt-1 text-fg">{plan.planned_at ? `${formatDateTime(plan.planned_at)} · ${plan.planner_name || '—'}` : '—'}</dd></div>
          {plan.closed_at && <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">{plan.status === 'cancelled' ? 'Cancelled' : 'Completed'}</dt><dd className="mt-1 text-fg">{formatDateTime(plan.closed_at)} · {plan.closer_name || '—'}{plan.cancellation_reason ? ` — ${plan.cancellation_reason}` : ''}</dd></div>}
        </dl>
      </Card>

      <Card title="Planned vs produced" variant="info">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th>For order</th>
                <th className="text-right">Planned</th><th className="text-right">In production</th>
                <th className="text-right">Produced</th><th className="text-right">Pending</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((l) => (
                <tr key={l.id}>
                  <td className="cell-strong">{l.product_name} <span className="text-xs text-fg-subtle">({l.item_group_code})</span>{l.remarks && <div className="text-xs text-fg-subtle">{l.remarks}</div>}</td>
                  <td>{l.oc_num ? (can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${l.order_confirmation_id}`} className={LINK}>{l.oc_num}</Link> : <span className="font-mono">{l.oc_num}</span>) : <span className="text-fg-subtle">Stock</span>}{l.design_no && <div className="text-xs text-fg-subtle">{l.design_no}</div>}</td>
                  <td className="text-right">{formatQuantity(l.planned_quantity, l.uom_decimal_places)} {l.uom_code}</td>
                  <td className="text-right text-fg-muted">{formatQuantity(l.in_process_quantity, l.uom_decimal_places)}</td>
                  <td className="text-right">{formatQuantity(l.produced_quantity, l.uom_decimal_places)}</td>
                  <td className="text-right font-semibold">{formatQuantity(pendingOf(l), l.uom_decimal_places)}</td>
                  <td><WorkflowBadge status={lineStatus(l)} config={PRODUCTION_LINE_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">Produced = output posted to stock by the processing booked against the line; in production = quantity recorded on booked records whose output is not posted yet; pending = planned − produced.</p>
      </Card>

      <Card title="Material availability" variant="info">
        {plan.materials.length === 0 ? <p className="text-sm text-fg-subtle m-0">No BOM on these products — add components (Qty / piece) on the product master to see what the pending quantity needs.</p> : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>For product</th><th>Component (BOM)</th><th className="text-right">Per unit</th><th className="text-right">Pending to make</th><th className="text-right">Needed</th><th className="text-right">In stock</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {plan.materials.map((m, i) => {
                    const short = m.stock_quantity !== null && Number(m.stock_quantity) < Number(m.required_quantity);
                    return (
                      <tr key={i}>
                        <td className="text-fg-muted">{m.product_name}</td>
                        <td className="cell-strong">{m.component_name}{m.remarks && <div className="text-xs text-fg-subtle">{m.remarks}</div>}</td>
                        <td className="text-right">{Number(m.qty_per_unit)} {m.unit}</td>
                        <td className="text-right text-fg-muted">{Number(m.pending_quantity)}</td>
                        <td className="text-right">{Number(m.required_quantity)} {m.unit}</td>
                        <td className={`text-right ${short ? 'text-red-700 font-semibold' : ''}`}>{m.stock_quantity === null ? '—' : `${Number(m.stock_quantity)} ${m.component_uom_code || ''}`}</td>
                        <td>{m.stock_quantity === null ? 'Not a product of this company — no stock figure' : m.unit_differs ? `BOM unit ${m.unit} ≠ stock unit ${m.component_uom_code}; not converted` : short ? 'Stock is below what is needed' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-fg-subtle mt-2 mb-0">Needed = pending × the BOM&apos;s qty per unit. In stock is the company&apos;s whole stock of the component (all locations) and is not reserved for this plan.</p>
          </>
        )}
      </Card>

      <Card title="Processing booked against this plan" variant="info">
        {plan.processing.length === 0 ? <p className="text-sm text-fg-subtle m-0">None yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Processing</th><th>Issue / job</th><th>Dates</th><th className="text-right">Produced (recorded)</th><th>Output lot</th><th>Status</th></tr></thead>
            <tbody>
              {plan.processing.map((p) => (
                <tr key={p.id}>
                  <td>{can('processing.view') ? <Link href={`/production/processing/${p.id}`} className={LINK}>{p.processing_no}</Link> : <span className="font-mono">{p.processing_no}</span>}</td>
                  <td className="text-fg-muted">{p.issue_no}{p.job_reference && <div className="text-xs text-fg-subtle">{p.job_reference}</div>}</td>
                  <td className="text-fg-muted">{formatDate(p.start_date)}{p.completion_date && ` → ${formatDate(p.completion_date)}`}</td>
                  <td className="text-right">{p.produced_quantity === null ? '—' : `${Number(p.produced_quantity)} ${p.produced_unit || ''}`}</td>
                  <td>{p.output_lot_id ? <Link href={`/procurement/lots/${p.output_lot_id}`} className={LINK}>{p.output_lot_no}</Link> : <span className="text-fg-subtle">Not posted</span>}</td>
                  <td><WorkflowBadge status={p.status} config={PROCESSING_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </DashboardLayout>
  );
}
