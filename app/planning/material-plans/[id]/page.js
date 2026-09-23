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

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading material plan...</div></DashboardLayout>;
  if (!plan) {
    return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Material plan not found'}</div></DashboardLayout>;
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
              <Link href={`/planning/material-plans/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}>
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {plan.status === 'draft' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('mark-planned', 'Mark this plan planned? Its quantities will count as planned against the requirements.')} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}>
                <i className="bi bi-check2-circle me-1"></i> Mark Planned
              </button>
            )}
            {plan.status === 'planned' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('revert-to-draft', 'Revert this plan to draft?')} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Revert to Draft
              </button>
            )}
            {plan.status === 'planned' && canEdit && (
              <button type="button" disabled={busy} onClick={() => run('close', 'Close this plan? A closed plan cannot be reopened.')} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                <i className="bi bi-lock me-1"></i> Close
              </button>
            )}
            {plan.status === 'draft' && can('material-plan.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/material-plans" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Plan Details" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={plan.company_label} code={plan.company_code} /></dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Title</dt><dd className="mt-1 text-gray-900">{plan.title}</dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={plan.status} config={PLAN_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Planning Period</dt><dd className="mt-1 text-gray-900">{formatDate(plan.period_start)} – {formatDate(plan.period_end)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Financial Year</dt><dd className="mt-1 text-gray-900">{plan.financial_year}</dd></div>
          <div><dt className="text-gray-500 text-xs">Created By</dt><dd className="mt-1 text-gray-900">{plan.creator_name || '—'}</dd></div>
          {plan.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{plan.remarks}</dd></div>}
        </dl>
      </Card>

      <Card title="Planned Materials" variant="info">
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Requirement</th>
                <th className="px-3 py-2 font-medium">Source Projection</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium text-right">Required</th>
                <th className="px-3 py-2 font-medium text-right">Planned (this plan)</th>
                <th className="px-3 py-2 font-medium text-right">Pending</th>
                <th className="px-3 py-2 font-medium">UOM</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    {can('material-requirement.view')
                      ? <Link href={`/planning/material-requirements/${item.material_requirement_id}`} className="font-mono text-blue-600 hover:underline">{item.requirement_no}</Link>
                      : <span className="font-mono">{item.requirement_no}</span>}
                    <div className="mt-1"><WorkflowBadge status={item.requirement_status} config={REQUIREMENT_STATUS_BADGES} /></div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div className="font-mono">{item.projection_no}</div>
                    <div className="text-xs text-gray-500">{item.brand_name}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-900">{item.product_name}</td>
                  <td className="px-3 py-2 text-right">{formatQuantity(item.required_quantity, item.uom_decimal_places)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatQuantity(item.planned_quantity, item.uom_decimal_places)}</td>
                  <td className="px-3 py-2 text-right">{formatQuantity(item.pending_quantity, item.uom_decimal_places)}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{item.uom_code}</td>
                  <td className="px-3 py-2 text-gray-500">{item.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">Pending is per requirement across all planned/closed plans. A draft plan&apos;s quantities are reserved but not yet counted as planned.</p>
      </Card>
    </DashboardLayout>
  );
}
