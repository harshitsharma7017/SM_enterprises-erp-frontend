'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PLAN_STATUS_BADGES, REQUIREMENT_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function MaterialPlanShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await apiClient.get(`/planning/material-plans/${id}`);
      setPlan(res.data?.plan || null);
    } catch (err) {
      setError(err.message || 'Failed to load material plan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchPlan);
  }, [fetchPlan]);

  const run = async (action, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/planning/material-plans/${id}/${action}`);
      setNotice(res.message || null);
      await fetchPlan();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete draft plan ${plan.plan_no}?`)) return;
    try {
      await apiClient.delete(`/planning/material-plans/${id}`);
      router.push('/planning/material-plans');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading material plan...</div></DashboardLayout>;
  if (!plan) {
    return <DashboardLayout><div className="alert alert-danger">{error || 'Material plan not found'}</div></DashboardLayout>;
  }

  const canEdit = can('material-plan.edit');

  return (
    <DashboardLayout>
      <PageHeading
        title={plan.plan_no}
        breadcrumbs={[{ label: 'Material Plans', href: '/planning/material-plans' }, { label: plan.plan_no }]}
        actions={(
          <>
            {plan.status === 'draft' && canEdit && (
              <Link href={`/planning/material-plans/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}>
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {plan.status === 'draft' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('mark-planned', 'Mark this plan planned? Its quantities will count as planned against the requirements.')} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}>
                <i className="bi bi-check2-circle me-1"></i> Mark Planned
              </button>
            )}
            {plan.status === 'planned' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('revert-to-draft', 'Revert this plan to draft?')} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Revert to Draft
              </button>
            )}
            {plan.status === 'planned' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('close', 'Close this plan? A closed plan cannot be reopened.')} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-lock me-1"></i> Close
              </button>
            )}
            {plan.status === 'draft' && can('material-plan.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/material-plans" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Plan Details" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={plan.company_label} code={plan.company_code} /></dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">Title</dt><dd className="mt-1 text-fg">{plan.title}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={plan.status} config={PLAN_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Planning Period</dt><dd className="mt-1 text-fg">{formatDate(plan.period_start)} – {formatDate(plan.period_end)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Financial Year</dt><dd className="mt-1 text-fg">{plan.financial_year}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Created By</dt><dd className="mt-1 text-fg">{plan.creator_name || '—'}</dd></div>
          {plan.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{plan.remarks}</dd></div>}
        </dl>
      </Card>

      <Card title="Planned Materials" variant="info">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Source Projection</th>
                <th>Material</th>
                <th className="text-right">Required</th>
                <th className="text-right">Planned (this plan)</th>
                <th className="text-right">Pending (plan)</th>
                <th className="text-right">Ordered</th>
                <th className="text-right">Pending (order)</th>
                <th className="text-right bg-blue-50">In stock</th>
                <th className="text-right bg-blue-50">Open POs</th>
                <th className="text-right bg-blue-50">Stock + open POs</th>
                <th>UOM</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {can('material-requirement.view')
                      ? <Link href={`/planning/material-requirements/${item.material_requirement_id}`} className="font-mono text-link hover:underline">{item.requirement_no}</Link>
                      : <span className="font-mono">{item.requirement_no}</span>}
                    <div className="mt-1"><WorkflowBadge status={item.requirement_status} config={REQUIREMENT_STATUS_BADGES} /></div>
                  </td>
                  <td className="text-fg-muted">
                    <div className="font-mono">{item.projection_no}</div>
                    <div className="text-xs text-fg-subtle">{item.brand_name}</div>
                  </td>
                  <td className="cell-strong">{item.product_name}</td>
                  <td className="text-right">{formatQuantity(item.required_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right">{formatQuantity(item.planned_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right">{formatQuantity(item.pending_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right">{formatQuantity(item.ordered_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right">{formatQuantity(item.order_pending_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right bg-blue-50/40">{formatQuantity(item.stock_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right bg-blue-50/40">{formatQuantity(item.open_po_quantity, item.uom_decimal_places)}</td>
                  <td className="text-right bg-blue-50/40">{formatQuantity(Number(item.stock_quantity || 0) + Number(item.open_po_quantity || 0), item.uom_decimal_places)}</td>
                  <td className="font-mono text-fg-muted">{item.uom_code}</td>
                  <td>{item.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fg-subtle mt-2 mb-0">Pending (plan) is per requirement across all planned/closed plans. Ordered counts confirmed purchase orders raised from this plan line; Pending (order) = planned on this plan − ordered. Material availability (shaded) is live for the plan&apos;s company: In stock = the stock ledger across all locations; Open POs = still to arrive on raised / partial purchase orders of the product. It is not reserved for this plan and may also serve other plans or orders.</p>
      </Card>
    </DashboardLayout>
  );
}
