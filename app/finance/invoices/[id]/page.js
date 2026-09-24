'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, COMMERCIAL_STATUS_BADGES, DISPATCH_TYPE_LABELS, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, formatAmount } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';
const LINK = 'font-mono text-blue-600 hover:underline';

export default function InvoiceShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await apiClient.get(`/finance/invoices/${id}`);
      setInvoice(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchInvoice);
  }, [fetchInvoice]);

  const run = async (action, body) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/finance/invoices/${id}/${action}`, body);
      setNotice(res.message || null);
      await fetchInvoice();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading invoice...</div></DashboardLayout>;
  if (!invoice) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Invoice not found'}</div></DashboardLayout>;

  const isDraft = invoice.status === 'draft';
  const title = invoice.invoice_no || `Draft invoice #${invoice.id}`;
  const issue = () => {
    if (confirm('Issue this invoice? It gets its invoice number and can then no longer be edited or cancelled.')) run('issue');
  };
  const cancel = () => {
    const reason = prompt('Cancel this draft invoice?\n\nReason (optional):');
    if (reason !== null) run('cancel', { reason });
  };
  const download = () => apiClient.download(`/finance/invoices/${id}/document`, `${(invoice.invoice_no || `INVOICE-DRAFT-${invoice.id}`).replace(/\//g, '-')}.pdf`).catch((err) => setError(err.message));
  const traces = [...new Map(invoice.items.filter((i) => i.production).map((i) => [i.processing_record_id, i.production])).values()];
  const poTraces = [...new Map(invoice.items.filter((i) => i.po_trace).map((i) => [i.purchase_order_id, i])).values()];

  return (
    <DashboardLayout>
      <PageHeading
        title={title}
        breadcrumbs={[{ label: 'Invoices', href: '/finance/invoices' }, { label: title }]}
        actions={(
          <>
            <button type="button" onClick={download} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}><i className="bi bi-file-earmark-pdf me-1"></i> Document</button>
            {isDraft && can('invoice.edit') && <Link href={`/finance/invoices/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>}
            {isDraft && can('invoice.issue') && <button type="button" disabled={busy} onClick={issue} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-send-check me-1"></i> Issue</button>}
            {isDraft && can('invoice.cancel') && <button type="button" disabled={busy} onClick={cancel} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>}
            <Link href="/finance/invoices" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — no invoice number yet, and its quantities are not counted as invoiced until it is issued.</div>}
      {invoice.status === 'issued' && <div className="bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded mb-4 text-sm">Issued invoices are frozen. Cancelling or reversing one needs an accounting treatment (credit note / Tally) that is not defined yet.</div>}

      <Card title="Invoice" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={invoice.company_label} code={invoice.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={invoice.status} config={COMMERCIAL_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Invoice date</dt><dd className="mt-1 text-gray-900">{formatDate(invoice.invoice_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Customer</dt><dd className="mt-1 text-gray-900">{invoice.buyer_name}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Order</dt>
            <dd className="mt-1">{invoice.oc_num ? (can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${invoice.order_confirmation_id}`} className={LINK}>{invoice.oc_num}</Link> : <span className="font-mono">{invoice.oc_num}</span>) : '— (direct dispatch)'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Proforma invoice</dt>
            <dd className="mt-1">{invoice.pi_no ? (can('proforma-invoice.view') ? <Link href={`/finance/proforma-invoices/${invoice.proforma_invoice_id}`} className={LINK}>{invoice.pi_no}</Link> : <span className="font-mono">{invoice.pi_no}</span>) : '—'}</dd>
          </div>
          <div><dt className="text-gray-500 text-xs">Currency</dt><dd className="mt-1 text-gray-900">{invoice.currency_code || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Reference</dt><dd className="mt-1 text-gray-900">{invoice.reference || '—'}</dd></div>
          {invoice.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{invoice.remarks}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{invoice.creator_name || '—'} · {formatDateTime(invoice.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Issued</dt><dd className="mt-1 text-gray-900">{invoice.issued_at ? `${formatDateTime(invoice.issued_at)} · ${invoice.issuer_name || '—'}` : '—'}</dd></div>
          {invoice.cancelled_at && <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-red-700">{formatDateTime(invoice.cancelled_at)} · {invoice.canceller_name || '—'}{invoice.cancellation_reason ? ` — ${invoice.cancellation_reason}` : ''}</dd></div>}
        </dl>
      </Card>

      <Card title="Lines" variant="info">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 text-xs text-left">
            <tr>
              <th className="py-1.5 font-medium">Product</th>
              <th className="py-1.5 font-medium">Dispatch</th>
              <th className="py-1.5 font-medium">Lot / PO</th>
              <th className="py-1.5 font-medium text-right">Dispatched</th>
              <th className="py-1.5 font-medium text-right">Invoiced</th>
              <th className="py-1.5 font-medium text-right">Unit price</th>
              <th className="py-1.5 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5 text-gray-900">{i.product_name}{i.description && <div className="text-xs text-gray-500">{i.description}</div>}</td>
                <td className="py-1.5">
                  {can('dispatch.view') ? <Link href={`/dispatch/${i.dispatch_id}`} className={LINK}>{i.dispatch_no}</Link> : <span className="font-mono">{i.dispatch_no}</span>}
                  <div className="text-xs text-gray-500">{formatDate(i.dispatch_date)} · {DISPATCH_TYPE_LABELS[i.dispatch_type]}</div>
                </td>
                <td className="py-1.5">{i.lot_id ? <Link href={`/procurement/lots/${i.lot_id}`} className={LINK}>{i.lot_no}</Link> : <span className="font-mono text-xs">{i.po_num}</span>}</td>
                <td className="py-1.5 text-right text-gray-600">{formatQuantity(i.dispatched_quantity, i.uom_decimal_places)}</td>
                <td className="py-1.5 text-right font-semibold whitespace-nowrap">{formatQuantity(i.quantity, i.uom_decimal_places)} {i.unit}</td>
                <td className="py-1.5 text-right">{i.unit_price === null ? <span className="text-amber-700 text-xs">Not priced</span> : formatAmount(i.unit_price)}</td>
                <td className="py-1.5 text-right">{i.amount === null ? '—' : formatAmount(i.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan="6" className="py-2 text-right text-xs text-gray-500">Total of priced lines {invoice.currency_code ? `(${invoice.currency_code})` : ''}</td><td className="py-2 text-right font-semibold">{formatAmount(invoice.total_amount || 0)}</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-500 mt-2 mb-0">Every line bills a posted dispatch line. Unit price is the order item&apos;s price; amount = quantity × unit price. No tax, discount, freight or other charge is calculated, and nothing is posted to accounts{invoice.unpriced_lines_count > 0 ? `; ${invoice.unpriced_lines_count} line(s) have no order price` : ''}.</p>
      </Card>

      <Card title="Traceability" variant="info">
        {traces.length === 0 && poTraces.length === 0 && <p className="text-sm text-gray-500 m-0">—</p>}
        <div className="space-y-6">
          {traces.map((production) => <ProductionTrace key={production.processing_record_id} production={production} companyLabel={invoice.company_label} companyCode={invoice.company_code} />)}
          {poTraces.map((i) => (
            <ol key={i.purchase_order_id} className="list-none p-0 m-0 space-y-2 text-sm">
              <li>Direct supplier dispatch <span className="font-mono">{i.dispatch_no}</span> · purchase order {can('purchase-order.view') ? <Link href={`/procurement/purchase-orders/${i.purchase_order_id}`} className={LINK}>{i.po_num}</Link> : <span className="font-mono">{i.po_num}</span>} ({PO_ORIGIN_LABELS[i.po_trace.origin] || i.po_trace.origin}) · supplier / mill {i.supplier_name}</li>
              {i.po_trace.oc_num && <li>Order confirmation <span className="font-mono">{i.po_trace.oc_num}</span></li>}
              {i.po_trace.plan_no && <li>Material plan <Link href={`/planning/material-plans/${i.po_trace.material_plan_id}`} className={LINK}>{i.po_trace.plan_no}</Link></li>}
              {(i.po_trace.requirements || []).map((r) => (
                <li key={r.material_requirement_id}>
                  Requirement <Link href={`/planning/material-requirements/${r.material_requirement_id}`} className={LINK}>{r.requirement_no}</Link>
                  {' → '}projection <Link href={`/planning/brand-projections/${r.brand_projection_id}`} className={LINK}>{r.projection_no}</Link>
                  <span className="text-gray-500"> · {r.brand_name}</span>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
