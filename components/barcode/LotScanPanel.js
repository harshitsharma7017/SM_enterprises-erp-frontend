'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import CompanyBadge from '@/components/company/CompanyBadge';
import TraceChain from '@/components/quality/TraceChain';
import ProductionTrace from '@/components/production/ProductionTrace';
import { WorkflowBadge, LOT_SOURCE_LABELS, COMMERCIAL_STATUS_BADGES, BARCODE_STATUS_BADGES } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';

const LINK = 'font-mono text-blue-600 hover:underline';
const QC_LABELS = { not_inspected: 'Not inspected', partially_inspected: 'Partially inspected', inspected: 'Inspected' };

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="mt-1 text-gray-900">{children}</dd>
    </div>
  );
}

/**
 * What a barcode identifies, read from the lot (authoritative): material,
 * quantity, width, job reference, QC / lot status, current stock per
 * location, and the existing trace — GRN → PO → supplier, or finished lot →
 * processing → issue → source lots — plus order / dispatch / PI / invoice
 * links (finance documents only when the API returned them).
 * `data` is a scan result or a barcode detail: { barcode fields, lot, stock_by_location, commercial }.
 */
export default function LotScanPanel({ data, barcode }) {
  const { can } = useAuth(true);
  const lot = data.lot;
  const dp = lot.uom_decimal_places;
  const lotLink = can('inward-entry.view') ? <Link href={`/procurement/lots/${lot.id}`} className={LINK}>{lot.lot_no}</Link> : <span className="font-mono">{lot.lot_no}</span>;
  const commercial = data.commercial || {};

  return (
    <>
      <Card title="Lot" variant="primary">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Field label="Barcode"><span className="font-mono">{barcode.barcode_value}</span> <WorkflowBadge status={barcode.status} config={BARCODE_STATUS_BADGES} /></Field>
          <Field label="Lot">{lotLink}</Field>
          <Field label="Company"><CompanyBadge label={lot.company_label} code={lot.company_code} /></Field>
          <Field label="Source">{LOT_SOURCE_LABELS[lot.source_type]}</Field>
          <Field label="Material">{lot.product_name} {lot.item_group_code && <span className="text-xs text-gray-500">({lot.item_group_code})</span>}</Field>
          <Field label="Lot quantity">{formatQuantity(lot.quantity, dp)} <span className="font-mono text-gray-500">{lot.unit || lot.uom_code}</span></Field>
          <Field label="Width">{lot.width_inch ? `${formatQuantity(lot.width_inch, 3)} inch` : '—'}</Field>
          <Field label="Received / produced">{formatDate(lot.received_date)}</Field>
          {lot.source_type === 'grn' ? (
            <>
              <Field label="Goods receipt / bill">{lot.inward_no}{lot.trace?.challan_no ? <span className="text-gray-500 text-xs"> · challan {lot.trace.challan_no}</span> : ''}</Field>
              <Field label="Supplier">{lot.supplier_name}{lot.supplier_lot_no ? <span className="text-gray-500 text-xs"> · mill lot {lot.supplier_lot_no}</span> : ''}</Field>
              <Field label="Quality control">{QC_LABELS[lot.qc_state] || lot.qc_state}</Field>
            </>
          ) : (
            <Field label="Processing / job">{lot.processing_no}{barcode.job_reference ? <span className="text-gray-500 text-xs"> · job {barcode.job_reference}</span> : ''}</Field>
          )}
          <Field label="Lot status">{lot.status === 'received' ? 'Received' : 'Cancelled'}</Field>
          <Field label="Current stock"><span className="font-semibold">{formatQuantity(lot.stock_quantity, dp)}</span> {lot.unit}</Field>
          {data.stock_at_location !== null && data.stock_at_location !== undefined && <Field label="Stock at this location"><span className="font-semibold">{formatQuantity(data.stock_at_location, dp)}</span> {lot.unit}</Field>}
          <Field label="Issued / dispatched">{formatQuantity(lot.stock_issued_quantity, dp)} / {formatQuantity(lot.stock_dispatched_quantity, dp)}</Field>
        </dl>
        {data.stock_by_location?.length > 0 && (
          <table className="min-w-full text-sm mt-4">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Location</th><th className="py-1.5 font-medium text-right">In stock</th><th className="py-1.5 font-medium">Last movement</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.stock_by_location.map((b) => (
                <tr key={b.location_id}>
                  <td className="py-1.5"><span className="font-mono">{b.location_code}</span> · {b.location_name}</td>
                  <td className="py-1.5 text-right font-semibold">{formatQuantity(b.quantity, dp)} {b.unit}</td>
                  <td className="py-1.5 text-gray-500">{formatDate(b.last_movement_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Traceability" variant="info">
        {lot.source_type === 'production'
          ? <ProductionTrace production={lot.production} companyLabel={lot.company_label} companyCode={lot.company_code} />
          : <TraceChain doc={{ ...lot, lot_id: lot.id, lot_quantity: lot.quantity, inward_date: lot.trace?.inward_date }} />}
        {lot.material_issues?.length > 0 && (
          <div className="mt-4 text-sm">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Issued to production</h4>
            <ul className="list-none p-0 m-0 space-y-1">
              {lot.material_issues.map((m) => (
                <li key={m.material_issue_item_id}>
                  {can('material-issue.view') ? <Link href={`/production/material-issues/${m.material_issue_id}`} className={LINK}>{m.issue_no}</Link> : <span className="font-mono">{m.issue_no}</span>}
                  <span className="text-gray-500"> · {formatQuantity(m.quantity, dp)} · {m.status}{m.job_reference ? ` · job ${m.job_reference}` : ''}</span>
                  {m.processing_no && <> → {can('processing.view') ? <Link href={`/production/processing/${m.processing_record_id}`} className={LINK}>{m.processing_no}</Link> : <span className="font-mono">{m.processing_no}</span>}</>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(lot.order_allocations?.length > 0 || lot.dispatches?.length > 0) && (
          <div className="mt-4 text-sm space-y-1">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Orders &amp; dispatches</h4>
            {lot.order_allocations.map((a) => (
              <div key={`a${a.id}`}>Allocated {formatQuantity(a.quantity, dp)} to order {can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${a.order_confirmation_id}`} className={LINK}>{a.oc_num}</Link> : <span className="font-mono">{a.oc_num}</span>} <span className="text-gray-500">· {a.buyer_name} · {a.status}</span></div>
            ))}
            {lot.dispatches.map((d) => (
              <div key={`d${d.id}`}>Dispatch {can('dispatch.view') ? <Link href={`/dispatch/${d.dispatch_id}`} className={LINK}>{d.dispatch_no}</Link> : <span className="font-mono">{d.dispatch_no}</span>} <span className="text-gray-500">· {formatQuantity(d.quantity, dp)} {d.unit} · {formatDate(d.dispatch_date)} · {d.status}</span></div>
            ))}
          </div>
        )}
        {(commercial.proforma_invoices?.length > 0 || commercial.invoices?.length > 0) && (
          <div className="mt-4 text-sm space-y-1">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Commercial documents</h4>
            {(commercial.proforma_invoices || []).map((p) => (
              <div key={`p${p.id}`}>Proforma invoice <Link href={`/finance/proforma-invoices/${p.id}`} className={LINK}>{p.pi_no}</Link> <span className="text-gray-500">· {p.oc_num}</span> <WorkflowBadge status={p.status} config={COMMERCIAL_STATUS_BADGES} /></div>
            ))}
            {(commercial.invoices || []).map((i) => (
              <div key={`i${i.id}`}>Invoice <Link href={`/finance/invoices/${i.id}`} className={LINK}>{i.invoice_no || `Draft #${i.id}`}</Link> <span className="text-gray-500">· {formatDate(i.invoice_date)}</span> <WorkflowBadge status={i.status} config={COMMERCIAL_STATUS_BADGES} /></div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4 mb-0">Scanned details are read live from the lot and the stock ledger{barcode.created_at ? ` · barcode created ${formatDateTime(barcode.created_at)}` : ''}.</p>
      </Card>
    </>
  );
}
