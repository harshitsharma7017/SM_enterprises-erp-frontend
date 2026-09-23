'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, LOT_STATUS_BADGES, PO_ORIGIN_LABELS, QC_STATUS_BADGES, qcBadgeStatus } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

function Step({ label, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true"></span>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm text-gray-900">{children}</div>
      </div>
    </li>
  );
}

export default function LotShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [lot, setLot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/procurement/lots/${id}`)
      .then((res) => { if (mounted) setLot(res.data?.lot || null); })
      .catch((err) => { if (mounted) setError(err.message || 'Failed to load lot'); });
    return () => { mounted = false; };
  }, [id]);

  if (error) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error}</div></DashboardLayout>;
  if (!lot) return <DashboardLayout><div className="p-4 text-gray-500">Loading lot...</div></DashboardLayout>;

  const t = lot.trace || {};
  const dp = lot.uom_decimal_places;
  const uninspected = Number(lot.quantity) - Number(lot.qc_claimed_quantity);
  const canInspect = lot.status === 'received' && lot.receipt_status === 'posted' && uninspected > 0 && can('inward-entry.approve');

  return (
    <DashboardLayout>
      <PageHeading
        title={lot.lot_no}
        breadcrumbs={[{ label: 'Lots', href: '/procurement/lots' }, { label: lot.lot_no }]}
        actions={(
          <>
            {canInspect && (
              <Link href={`/quality-control/create?lot_id=${lot.id}`} className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"><i className="bi bi-clipboard-check me-1"></i> Inspect</Link>
            )}
            <Link href="/procurement/lots" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>
          </>
        )}
      />

      <Card title="Lot" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={lot.company_label} code={lot.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={lot.status} config={LOT_STATUS_BADGES} /></dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Material</dt><dd className="mt-1 text-gray-900">{lot.product_name} <span className="text-xs text-gray-500">({lot.item_group_code})</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Quantity</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(lot.quantity, lot.uom_decimal_places)} <span className="text-sm font-mono text-gray-500">{lot.unit}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Width</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(lot.width_inch, 3)} <span className="text-sm text-gray-500">inch</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Mill Lot No.</dt><dd className="mt-1 text-gray-900">{lot.supplier_lot_no || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Received</dt><dd className="mt-1 text-gray-900">{formatDate(lot.received_date)}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Supplier</dt><dd className="mt-1 text-gray-900">{lot.supplier_name}</dd></div>
        </dl>
      </Card>

      <Card title="Quality Control" variant="info">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Received</div><div className="font-semibold">{formatQuantity(lot.quantity, dp)} {lot.unit}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Inspected</div><div className="font-semibold">{formatQuantity(lot.qc_inspected_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Accepted</div><div className="font-semibold text-green-700">{formatQuantity(lot.qc_accepted_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Rejected</div><div className="font-semibold text-red-700">{formatQuantity(lot.qc_rejected_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Returned / Rejected not returned</div><div className="font-semibold">{formatQuantity(lot.returned_quantity, dp)} / {formatQuantity(Number(lot.qc_rejected_quantity) - Number(lot.returned_quantity), dp)}</div></div>
        </div>
        {lot.inspections.length === 0 ? <p className="text-sm text-gray-500 m-0">Not inspected yet.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">QC No.</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium text-right">Inspected</th><th className="py-1.5 font-medium text-right">Accepted</th><th className="py-1.5 font-medium text-right">Rejected</th><th className="py-1.5 font-medium text-right">Returned</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lot.inspections.map((qc) => (
                <tr key={qc.id}>
                  <td className="py-1.5"><Link href={`/quality-control/${qc.id}`} className="font-mono text-blue-600 hover:underline">{qc.qc_no}</Link></td>
                  <td className="py-1.5 text-gray-600">{formatDate(qc.inspection_date)}</td>
                  <td className="py-1.5 text-right">{formatQuantity(qc.inspected_quantity, dp)}</td>
                  <td className="py-1.5 text-right">{qc.accepted_quantity === null ? '—' : formatQuantity(qc.accepted_quantity, dp)}</td>
                  <td className="py-1.5 text-right">{qc.rejected_quantity === null ? '—' : formatQuantity(qc.rejected_quantity, dp)}</td>
                  <td className="py-1.5 text-right">{formatQuantity(qc.returned_quantity, dp)}</td>
                  <td className="py-1.5"><WorkflowBadge status={qcBadgeStatus(qc)} config={QC_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Traceability" variant="info">
        <ol className="list-none p-0 m-0 space-y-3">
          <Step label="Goods receipt">
            <Link href={`/procurement/grn/${lot.inward_entry_id}`} className="font-mono text-blue-600 hover:underline">{lot.inward_no}</Link>
            <span className="text-gray-500"> · {formatDate(t.inward_date)}{t.challan_no ? ` · challan ${t.challan_no}` : ''}</span>
          </Step>
          <Step label={`Purchase order (${PO_ORIGIN_LABELS[lot.purchase_order_origin] || ''})`}>
            {can('purchase-order.view')
              ? <Link href={`/procurement/purchase-orders/${lot.purchase_order_id}`} className="font-mono text-blue-600 hover:underline">{lot.po_num}</Link>
              : <span className="font-mono">{lot.po_num}</span>}
            <span className="text-gray-500"> · {formatDate(t.po_date)}</span>
          </Step>
          {t.oc_num && (
            <Step label="Order confirmation">
              <Link href={`/sales/order-confirmations/${t.order_confirmation_id}`} className="font-mono text-blue-600 hover:underline">{t.oc_num}</Link>
            </Step>
          )}
          {t.plan_no && (
            <Step label="Material plan">
              <Link href={`/planning/material-plans/${t.material_plan_id}`} className="font-mono text-blue-600 hover:underline">{t.plan_no}</Link>
            </Step>
          )}
          {t.requirement_no && (
            <Step label="Material requirement">
              <Link href={`/planning/material-requirements/${t.material_requirement_id}`} className="font-mono text-blue-600 hover:underline">{t.requirement_no}</Link>
            </Step>
          )}
          {t.projection_no && (
            <Step label="Brand projection">
              <Link href={`/planning/brand-projections/${t.brand_projection_id}`} className="font-mono text-blue-600 hover:underline">{t.projection_no}</Link>
              <span className="text-gray-500"> · {t.brand_name}</span>
            </Step>
          )}
        </ol>
      </Card>
    </DashboardLayout>
  );
}
