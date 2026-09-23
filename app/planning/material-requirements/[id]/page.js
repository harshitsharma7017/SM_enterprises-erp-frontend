'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, REQUIREMENT_STATUS_BADGES, PLAN_STATUS_BADGES, PO_STATUS_BADGES, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function MaterialRequirementShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchRequirement = useCallback(async () => {
    try {
      const res = await apiClient.get(`/planning/material-requirements/${id}`);
      setRequirement(res.data?.requirement || null);
    } catch (err) {
      setError(err.message || 'Failed to load material requirement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchRequirement);
  }, [fetchRequirement]);

  const run = async (request) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await request();
      setNotice(res.message || null);
      await fetchRequirement();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    const remarks = prompt('Reason for closing this requirement (optional):');
    if (remarks === null) return;
    run(() => apiClient.post(`/planning/material-requirements/${id}/close`, { remarks }));
  };

  const remove = async () => {
    if (!confirm(`Delete requirement ${requirement.requirement_no}? It can be generated again from its projection.`)) return;
    try {
      await apiClient.delete(`/planning/material-requirements/${id}`);
      router.push('/planning/material-requirements');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading material requirement...</div></DashboardLayout>;
  if (!requirement) {
    return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Material requirement not found'}</div></DashboardLayout>;
  }

  const r = requirement;
  const dp = r.uom_decimal_places;

  return (
    <DashboardLayout>
      <PageHeading
        title={r.requirement_no}
        breadcrumbs={[{ label: 'Material Requirements', href: '/planning/material-requirements' }, { label: r.requirement_no }]}
        actions={(
          <>
            {r.status !== 'closed' && can('material-requirement.edit') && (
              <button type="button" disabled={busy} onClick={close} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                <i className="bi bi-x-circle me-1"></i> Close
              </button>
            )}
            {r.status === 'closed' && can('material-requirement.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/material-requirements/${id}/reopen`))} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reopen
              </button>
            )}
            {r.status === 'open' && r.plans.length === 0 && r.purchase_orders.length === 0 && can('material-requirement.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/material-requirements" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Requirement" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={r.company_label} code={r.company_code} /></dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Source Projection</dt>
            <dd className="mt-1 font-mono">
              {can('brand-projection.view')
                ? <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className="text-blue-600 hover:underline">{r.projection_no}</Link>
                : r.projection_no}
            </dd>
          </div>
          <div><dt className="text-gray-500 text-xs">Brand</dt><dd className="mt-1 text-gray-900">{r.brand_name}</dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={r.status} config={REQUIREMENT_STATUS_BADGES} /></dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Material</dt><dd className="mt-1 text-gray-900">{r.product_name} <span className="text-xs text-gray-500">({r.item_group_code}{r.material_type_name ? ` · ${r.material_type_name}` : ''})</span></dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Projection Period</dt><dd className="mt-1 text-gray-900">{formatDate(r.period_start)} – {formatDate(r.period_end)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Required</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.required_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Planned (committed plans)</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.planned_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Pending</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.pending_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Ordered (confirmed POs)</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.ordered_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Pending to order</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.order_pending_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">On draft POs</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.order_reserved_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Not yet on any plan</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.available_quantity, dp)} <span className="text-sm font-mono text-gray-500">{r.uom_code}</span></dd></div>
          {r.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{r.remarks}</dd></div>}
        </dl>
        <p className="text-xs text-gray-500 mt-4 mb-0">Material, UOM and required quantity are read from the finalized projection line — they are not stored separately.</p>
      </Card>

      <Card title="Material Plans" variant="info">
        {r.plans.length === 0 ? (
          <p className="text-sm text-gray-500 m-0">This requirement is not on any material plan yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left border border-gray-200 rounded-md">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Plan No.</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium text-right">Planned Qty</th>
                <th className="px-3 py-2 font-medium">Plan Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {r.plans.map((p) => (
                <tr key={p.material_plan_id}>
                  <td className="px-3 py-2 font-mono">
                    {can('material-plan.view')
                      ? <Link href={`/planning/material-plans/${p.material_plan_id}`} className="text-blue-600 hover:underline">{p.plan_no}</Link>
                      : p.plan_no}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{p.title}</td>
                  <td className="px-3 py-2 text-right">{formatQuantity(p.planned_quantity, dp)} {r.uom_code}</td>
                  <td className="px-3 py-2"><WorkflowBadge status={p.status} config={PLAN_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Purchase Orders" variant="success">
        {r.purchase_orders.length === 0 ? (
          <p className="text-sm text-gray-500 m-0">No purchase orders have been raised against this requirement yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left border border-gray-200 rounded-md">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">PO No.</th>
                <th className="px-3 py-2 font-medium">Origin</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">PO Date</th>
                <th className="px-3 py-2 font-medium text-right">Ordered Qty</th>
                <th className="px-3 py-2 font-medium">PO Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {r.purchase_orders.map((po) => (
                <tr key={po.purchase_order_id}>
                  <td className="px-3 py-2 font-mono">
                    {can('purchase-order.view')
                      ? <Link href={`/procurement/purchase-orders/${po.purchase_order_id}`} className="text-blue-600 hover:underline">{po.po_num}</Link>
                      : po.po_num}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{PO_ORIGIN_LABELS[po.origin] || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{po.supplier_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(po.po_date)}</td>
                  <td className="px-3 py-2 text-right">{formatQuantity(po.ordered_quantity, dp)} {r.uom_code}</td>
                  <td className="px-3 py-2"><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-gray-500 mt-2 mb-0">Only confirmed purchase orders count as ordered. Draft POs hold their quantity; cancelled POs count for nothing.</p>
      </Card>
    </DashboardLayout>
  );
}
