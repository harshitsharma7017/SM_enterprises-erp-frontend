'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, LOT_STATUS_BADGES, PO_ORIGIN_LABELS, QC_STATUS_BADGES, qcBadgeStatus, MATERIAL_ISSUE_STATUS_BADGES, PROCESSING_STATUS_BADGES, POSTING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import ProductionTrace from '@/components/production/ProductionTrace';
import OrderAllocationsCard from '@/components/sales/order-confirmations/OrderAllocationsCard';
import LotBarcodeCard from '@/components/barcode/LotBarcodeCard';
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

  // Finished material: no GRN, QC or supplier — its source is the processing record.
  if (lot.source_type === 'production') {
    return (
      <DashboardLayout>
        <PageHeading
          title={lot.lot_no}
          breadcrumbs={[{ label: 'Lots', href: '/procurement/lots' }, { label: lot.lot_no }]}
          actions={<Link href="/procurement/lots" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>}
        />
        <Card title="Finished-Material Lot" variant="primary">
          <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={lot.company_label} code={lot.company_code} /></dd></div>
            <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={lot.status} config={LOT_STATUS_BADGES} /></dd></div>
            <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Product</dt><dd className="mt-1 text-gray-900">{lot.product_name} <span className="text-xs text-gray-500">({lot.item_group_code})</span></dd></div>
            <div><dt className="text-gray-500 text-xs">Produced quantity</dt><dd className="mt-1 text-lg font-semibold">{formatQuantity(lot.quantity, dp)} <span className="text-sm font-mono text-gray-500">{lot.unit}</span></dd></div>
            <div><dt className="text-gray-500 text-xs">Posted to stock</dt><dd className="mt-1 text-gray-900">{formatDate(lot.received_date)}</dd></div>
            <div><dt className="text-gray-500 text-xs">Dispatched</dt><dd className="mt-1 text-gray-900">{formatQuantity(lot.stock_dispatched_quantity, dp)} {lot.unit}</dd></div>
            <div>
              <dt className="text-gray-500 text-xs">Usable stock now</dt>
              <dd className="mt-1 text-lg font-semibold text-blue-800">{formatQuantity(lot.stock_quantity, dp)} {lot.unit}</dd>
            </div>
            {can('stock.view') && <div><dt className="text-gray-500 text-xs">Stock</dt><dd className="mt-1"><Link href={`/inventory/stock/${lot.id}`} className="text-blue-600 hover:underline">Stock movements →</Link></dd></div>}
          </dl>
        </Card>
        <LotBarcodeCard lot={lot} can={can} />
        <Card title="Traceability" variant="info">
          <ProductionTrace production={lot.production} companyLabel={lot.company_label} companyCode={lot.company_code} />
        </Card>
        <OrderAllocationsCard allocations={lot.order_allocations} can={can} />
        {lot.dispatches.length > 0 && (
          <Card title="Dispatched" variant="info">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Dispatch</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Order</th><th className="py-1.5 font-medium">Customer</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lot.dispatches.map((d) => (
                  <tr key={d.id}>
                    <td className="py-1.5">{can('dispatch.view') ? <Link href={`/dispatch/${d.dispatch_id}`} className="font-mono text-blue-600 hover:underline">{d.dispatch_no}</Link> : <span className="font-mono">{d.dispatch_no}</span>}</td>
                    <td className="py-1.5 text-gray-600">{formatDate(d.dispatch_date)}</td>
                    <td className="py-1.5 font-mono text-xs">{d.oc_num || '—'}</td>
                    <td className="py-1.5 text-gray-700">{d.buyer_name || d.destination_name || '—'}</td>
                    <td className="py-1.5 text-right">{formatQuantity(d.quantity, dp)} {d.unit}</td>
                    <td className="py-1.5"><WorkflowBadge status={d.status} config={POSTING_STATUS_BADGES} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </DashboardLayout>
    );
  }

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

      <LotBarcodeCard lot={lot} can={can} />

      <Card title="Quality Control" variant="info">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Received</div><div className="font-semibold">{formatQuantity(lot.quantity, dp)} {lot.unit}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Inspected</div><div className="font-semibold">{formatQuantity(lot.qc_inspected_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Accepted</div><div className="font-semibold text-green-700">{formatQuantity(lot.qc_accepted_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Rejected</div><div className="font-semibold text-red-700">{formatQuantity(lot.qc_rejected_quantity, dp)}</div></div>
          <div className="rounded border border-gray-200 p-2"><div className="text-xs text-gray-500">Returned / Rejected not returned</div><div className="font-semibold">{formatQuantity(lot.returned_quantity, dp)} / {formatQuantity(Number(lot.qc_rejected_quantity) - Number(lot.returned_quantity), dp)}</div></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded border border-blue-200 bg-blue-50 p-2 text-sm mb-3">
          <span className="text-blue-800">Usable stock now: <span className="font-semibold">{formatQuantity(lot.stock_quantity, dp)} {lot.unit}</span></span>
          <span className="text-blue-700 text-xs">(accepted posted to stock {formatQuantity(lot.stock_received_quantity, dp)} · issued to production {formatQuantity(lot.stock_issued_quantity, dp)})</span>
          {can('stock.view') && <Link href={`/inventory/stock/${lot.id}`} className="ml-auto text-blue-700 hover:underline text-xs">Stock movements →</Link>}
        </div>
        {lot.inspections.length === 0 ? <p className="text-sm text-gray-500 m-0">Not inspected yet.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">QC No.</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium text-right">Inspected</th><th className="py-1.5 font-medium text-right">Accepted</th><th className="py-1.5 font-medium text-right">Rejected</th><th className="py-1.5 font-medium text-right">Returned</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 font-medium">Stock</th></tr></thead>
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
                  <td className="py-1.5 font-mono text-xs">{qc.stock_movement_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {lot.material_issues.length > 0 && (
        <Card title="Material Issues & Processing" variant="info">
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Issue</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Job Ref.</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 font-medium">Processing</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lot.material_issues.map((mi) => (
                <tr key={mi.material_issue_item_id}>
                  <td className="py-1.5">{can('material-issue.view') ? <Link href={`/production/material-issues/${mi.material_issue_id}`} className="font-mono text-blue-600 hover:underline">{mi.issue_no}</Link> : <span className="font-mono">{mi.issue_no}</span>}</td>
                  <td className="py-1.5 text-gray-600">{formatDate(mi.issue_date)}</td>
                  <td className="py-1.5 text-gray-700">{mi.job_reference || '—'}</td>
                  <td className="py-1.5 text-right">{formatQuantity(mi.quantity, dp)} {lot.unit}</td>
                  <td className="py-1.5"><WorkflowBadge status={mi.status} config={MATERIAL_ISSUE_STATUS_BADGES} /></td>
                  <td className="py-1.5">
                    {mi.processing_record_id ? (
                      <span className="inline-flex items-center gap-1">
                        {can('processing.view') ? <Link href={`/production/processing/${mi.processing_record_id}`} className="font-mono text-xs text-blue-600 hover:underline">{mi.processing_no}</Link> : <span className="font-mono text-xs">{mi.processing_no}</span>}
                        <WorkflowBadge status={mi.processing_status} config={PROCESSING_STATUS_BADGES} />
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
