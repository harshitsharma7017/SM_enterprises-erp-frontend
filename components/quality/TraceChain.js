'use client';

import Link from 'next/link';
import CompanyBadge from '@/components/company/CompanyBadge';
import { PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

function Field({ label, children, wide = false }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="mt-1 text-gray-900">{children}</dd>
    </div>
  );
}

const LINK = 'font-mono text-blue-600 hover:underline';

/**
 * Read-only source of a QC / return / debit note: company, supplier, PO, GRN,
 * lot, material, UOM, width — and where the PO came from (order
 * confirmation, or material plan → requirement → brand projection).
 * `doc` carries the joined columns every one of those endpoints returns.
 */
export default function TraceChain({ doc, quantityLabel = 'Lot quantity', quantity = doc.lot_quantity }) {
  const { can } = useAuth(true);
  const t = doc.trace || {};
  return (
    <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
      <Field label="Company"><CompanyBadge label={doc.company_label} code={doc.company_code} /></Field>
      <Field label="Supplier">{doc.supplier_name}</Field>
      <Field label={`Purchase Order (${PO_ORIGIN_LABELS[doc.purchase_order_origin] || '—'})`}>
        {can('purchase-order.view') ? <Link href={`/procurement/purchase-orders/${doc.purchase_order_id}`} className={LINK}>{doc.po_num}</Link> : <span className="font-mono">{doc.po_num}</span>}
      </Field>
      <Field label="Goods Receipt">
        <Link href={`/procurement/grn/${doc.inward_entry_id}`} className={LINK}>{doc.inward_no}</Link>
        {doc.inward_date && <span className="text-gray-500 text-xs"> · {formatDate(doc.inward_date)}</span>}
      </Field>
      <Field label="Lot">
        <Link href={`/procurement/lots/${doc.lot_id}`} className={LINK}>{doc.lot_no}</Link>
        {doc.supplier_lot_no && <span className="text-gray-500 text-xs"> · mill lot {doc.supplier_lot_no}</span>}
      </Field>
      <Field label="Material">{doc.product_name} {doc.item_group_code && <span className="text-xs text-gray-500">({doc.item_group_code})</span>}</Field>
      <Field label="Width">{formatQuantity(doc.width_inch, 3)} inch</Field>
      {quantity !== undefined && <Field label={quantityLabel}>{formatQuantity(quantity, doc.uom_decimal_places)} <span className="font-mono text-gray-500">{doc.unit}</span></Field>}
      {(t.oc_num || t.plan_no || t.requirement_no) && (
        <Field label="Source" wide>
          {t.oc_num && <div>Order confirmation <Link href={`/sales/order-confirmations/${t.order_confirmation_id}`} className={LINK}>{t.oc_num}</Link></div>}
          {t.plan_no && <div>Material plan <Link href={`/planning/material-plans/${t.material_plan_id}`} className={LINK}>{t.plan_no}</Link></div>}
          {t.requirement_no && (
            <div>
              Requirement <Link href={`/planning/material-requirements/${t.material_requirement_id}`} className={LINK}>{t.requirement_no}</Link>
              {t.projection_no && <> → projection <Link href={`/planning/brand-projections/${t.brand_projection_id}`} className={LINK}>{t.projection_no}</Link></>}
              {t.brand_name && <span className="text-gray-500"> · {t.brand_name}</span>}
            </div>
          )}
        </Field>
      )}
    </dl>
  );
}
