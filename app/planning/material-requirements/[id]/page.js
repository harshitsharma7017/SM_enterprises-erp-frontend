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

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading material requirement...</div></DashboardLayout>;
  if (!requirement) {
    return <DashboardLayout><div className="alert alert-danger">{error || 'Material requirement not found'}</div></DashboardLayout>;
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
              <button type="button" disabled={busy} onClick={close} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-x-circle me-1"></i> Close
              </button>
            )}
            {r.status === 'closed' && can('material-requirement.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/material-requirements/${id}/reopen`))} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reopen
              </button>
            )}
            {r.status === 'open' && r.plans.length === 0 && r.purchase_orders.length === 0 && can('material-requirement.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/material-requirements" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Requirement" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={r.company_label} code={r.company_code} /></dd></div>
          <div>
            <dt className="text-fg-subtle text-xs">Source Projection</dt>
            <dd className="mt-1 font-mono">
              {can('brand-projection.view')
                ? <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className="text-link hover:underline">{r.projection_no}</Link>
                : r.projection_no}
            </dd>
          </div>
          <div><dt className="text-fg-subtle text-xs">Brand</dt><dd className="mt-1 text-fg">{r.brand_name}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={r.status} config={REQUIREMENT_STATUS_BADGES} /></dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">Material</dt><dd className="mt-1 text-fg">{r.product_name} <span className="text-xs text-fg-subtle">({r.item_group_code}{r.material_type_name ? ` · ${r.material_type_name}` : ''})</span></dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">Projection Period</dt><dd className="mt-1 text-fg">{formatDate(r.period_start)} – {formatDate(r.period_end)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Required</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.required_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Planned (committed plans)</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.planned_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Pending</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.pending_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Ordered (confirmed POs)</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.ordered_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Pending to order</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.order_pending_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">On draft POs</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.order_reserved_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Not yet on any plan</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(r.available_quantity, dp)} <span className="text-sm font-mono text-fg-subtle">{r.uom_code}</span></dd></div>
          {r.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{r.remarks}</dd></div>}
        </dl>
        <p className="text-xs text-fg-subtle mt-4 mb-0">Material, UOM and required quantity are read from the finalized projection line — they are not stored separately.</p>
      </Card>

      <Card title="Material Plans" variant="info">
        {r.plans.length === 0 ? (
          <p className="text-sm text-fg-subtle m-0">This requirement is not on any material plan yet.</p>
        ) : (
          <table className="data-table border border-line rounded-md">
            <thead>
              <tr>
                <th>Plan No.</th>
                <th>Title</th>
                <th className="text-right">Planned Qty</th>
                <th>Plan Status</th>
              </tr>
            </thead>
            <tbody>
              {r.plans.map((p) => (
                <tr key={p.material_plan_id}>
                  <td className="font-mono">
                    {can('material-plan.view')
                      ? <Link href={`/planning/material-plans/${p.material_plan_id}`} className="text-link hover:underline">{p.plan_no}</Link>
                      : p.plan_no}
                  </td>
                  <td className="text-fg-muted">{p.title}</td>
                  <td className="text-right">{formatQuantity(p.planned_quantity, dp)} {r.uom_code}</td>
                  <td><WorkflowBadge status={p.status} config={PLAN_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Purchase Orders" variant="success">
        {r.purchase_orders.length === 0 ? (
          <p className="text-sm text-fg-subtle m-0">No purchase orders have been raised against this requirement yet.</p>
        ) : (
          <table className="data-table border border-line rounded-md">
            <thead>
              <tr>
                <th>PO No.</th>
                <th>Origin</th>
                <th>Supplier</th>
                <th>PO Date</th>
                <th className="text-right">Ordered Qty</th>
                <th>PO Status</th>
              </tr>
            </thead>
            <tbody>
              {r.purchase_orders.map((po) => (
                <tr key={po.purchase_order_id}>
                  <td className="font-mono">
                    {can('purchase-order.view')
                      ? <Link href={`/procurement/purchase-orders/${po.purchase_order_id}`} className="text-link hover:underline">{po.po_num}</Link>
                      : po.po_num}
                  </td>
                  <td className="text-fg-muted">{PO_ORIGIN_LABELS[po.origin] || '—'}</td>
                  <td className="text-fg-muted">{po.supplier_name || '—'}</td>
                  <td className="text-fg-muted">{formatDate(po.po_date)}</td>
                  <td className="text-right">{formatQuantity(po.ordered_quantity, dp)} {r.uom_code}</td>
                  <td><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-fg-subtle mt-2 mb-0">Only confirmed purchase orders count as ordered. Draft POs hold their quantity; cancelled POs count for nothing.</p>
      </Card>
    </DashboardLayout>
  );
}
