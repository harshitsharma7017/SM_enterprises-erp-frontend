'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, COMMERCIAL_STATUS_BADGES, DISPATCH_TYPE_LABELS } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, formatAmount, toDateInputValue } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';
const LINK = 'font-mono text-blue-600 hover:underline';
const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const EMPTY_REF = { confirmation_reference: '', confirmation_date: '', payment_reference: '', payment_date: '', commercial_remarks: '' };

export default function ProformaInvoiceShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [pi, setPi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [refForm, setRefForm] = useState(null);

  const fetchPi = useCallback(async () => {
    try {
      const res = await apiClient.get(`/finance/proforma-invoices/${id}`);
      setPi(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load proforma invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchPi);
  }, [fetchPi]);

  const run = async (request) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await request();
      setNotice(res.message || null);
      setRefForm(null);
      await fetchPi();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading proforma invoice...</div></DashboardLayout>;
  if (!pi) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Proforma invoice not found'}</div></DashboardLayout>;

  const isDraft = pi.status === 'draft';
  const isIssued = pi.status === 'issued';
  const issue = () => {
    if (confirm(`Issue ${pi.pi_no}? Its order, lines and quantities are then frozen.`)) run(() => apiClient.post(`/finance/proforma-invoices/${id}/issue`));
  };
  const cancel = () => {
    const reason = prompt(`Cancel ${pi.pi_no}?${isIssued ? '\n\nA reason is required for an issued PI.' : ''}\n\nReason:`);
    if (reason !== null) run(() => apiClient.post(`/finance/proforma-invoices/${id}/cancel`, { reason }));
  };
  const download = () => apiClient.download(`/finance/proforma-invoices/${id}/document`, `${pi.pi_no.replace(/\//g, '-')}.pdf`).catch((err) => setError(err.message));
  const editRef = () => setRefForm({
    confirmation_reference: pi.confirmation_reference || '',
    confirmation_date: toDateInputValue(pi.confirmation_date),
    payment_reference: pi.payment_reference || '',
    payment_date: toDateInputValue(pi.payment_date),
    commercial_remarks: pi.commercial_remarks || '',
  });
  const saveRef = (e) => {
    e.preventDefault();
    run(() => apiClient.put(`/finance/proforma-invoices/${id}/commercial-reference`, refForm));
  };
  const setRef = (name) => (e) => setRefForm((prev) => ({ ...(prev || EMPTY_REF), [name]: e.target.value }));
  const traces = [...new Map(pi.trace.allocations.filter((a) => a.production).map((a) => [a.processing_record_id, a.production])).values()];

  return (
    <DashboardLayout>
      <PageHeading
        title={pi.pi_no}
        breadcrumbs={[{ label: 'Proforma Invoices', href: '/finance/proforma-invoices' }, { label: pi.pi_no }]}
        actions={(
          <>
            <button type="button" onClick={download} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}><i className="bi bi-file-earmark-pdf me-1"></i> Document</button>
            {isDraft && can('proforma-invoice.edit') && <Link href={`/finance/proforma-invoices/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Edit</Link>}
            {isDraft && can('proforma-invoice.issue') && <button type="button" disabled={busy} onClick={issue} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}><i className="bi bi-send-check me-1"></i> Issue</button>}
            {isIssued && can('invoice.create') && <Link href={`/finance/invoices/create?order_confirmation_id=${pi.order_confirmation_id}`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-file-earmark-check me-1"></i> New Invoice</Link>}
            {pi.status !== 'cancelled' && can('proforma-invoice.cancel') && <button type="button" disabled={busy} onClick={cancel} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Cancel</button>}
            <Link href="/finance/proforma-invoices" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {isDraft && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">Draft — editable, and its quantities are not counted against the order until it is issued.</div>}

      <Card title="Proforma Invoice" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={pi.company_label} code={pi.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={pi.status} config={COMMERCIAL_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">PI date</dt><dd className="mt-1 text-gray-900">{formatDate(pi.pi_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Valid until</dt><dd className="mt-1 text-gray-900">{formatDate(pi.valid_until)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Customer</dt><dd className="mt-1 text-gray-900">{pi.buyer_name}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Order</dt>
            <dd className="mt-1">{can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${pi.order_confirmation_id}`} className={LINK}>{pi.oc_num}</Link> : <span className="font-mono">{pi.oc_num}</span>}{pi.order_buyer_ref && <span className="text-xs text-gray-500"> · buyer ref. {pi.order_buyer_ref}</span>}</dd>
          </div>
          <div><dt className="text-gray-500 text-xs">Currency</dt><dd className="mt-1 text-gray-900">{pi.currency_code || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Customer reference</dt><dd className="mt-1 text-gray-900">{pi.reference || '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Payment terms</dt><dd className="mt-1 text-gray-900">{pi.payment_terms || '—'}</dd></div>
          {pi.remarks && <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{pi.remarks}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-1 text-gray-900">{pi.creator_name || '—'} · {formatDateTime(pi.created_at)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Issued</dt><dd className="mt-1 text-gray-900">{pi.issued_at ? `${formatDateTime(pi.issued_at)} · ${pi.issuer_name || '—'}` : '—'}</dd></div>
          {pi.cancelled_at && <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Cancelled</dt><dd className="mt-1 text-red-700">{formatDateTime(pi.cancelled_at)} · {pi.canceller_name || '—'}{pi.cancellation_reason ? ` — ${pi.cancellation_reason}` : ''}</dd></div>}
        </dl>
      </Card>

      <Card title="Lines" variant="info">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 text-xs text-left">
            <tr>
              <th className="py-1.5 font-medium">Product / description</th>
              <th className="py-1.5 font-medium text-right">Ordered</th>
              <th className="py-1.5 font-medium text-right">PI quantity</th>
              <th className="py-1.5 font-medium text-right">Unit price</th>
              <th className="py-1.5 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pi.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5 text-gray-900">{i.product_name || i.description}{i.product_name && i.description && <div className="text-xs text-gray-500">{i.description}</div>}</td>
                <td className="py-1.5 text-right text-gray-600">{formatQuantity(i.item_ordered_quantity, i.uom_decimal_places)}</td>
                <td className="py-1.5 text-right font-semibold whitespace-nowrap">{formatQuantity(i.quantity, i.uom_decimal_places)} {i.unit}</td>
                <td className="py-1.5 text-right">{i.unit_price === null ? <span className="text-amber-700 text-xs">Not priced</span> : formatAmount(i.unit_price)}</td>
                <td className="py-1.5 text-right">{i.amount === null ? '—' : formatAmount(i.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan="4" className="py-2 text-right text-xs text-gray-500">Total of priced lines {pi.currency_code ? `(${pi.currency_code})` : ''}</td><td className="py-2 text-right font-semibold">{formatAmount(pi.total_amount || 0)}</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-500 mt-2 mb-0">Unit price is the order item&apos;s price; amount = quantity × unit price. No tax, discount, freight or other charge is calculated{pi.unpriced_lines_count > 0 ? `; ${pi.unpriced_lines_count} line(s) have no price on the order` : ''}.</p>
      </Card>

      <Card title="Confirmation / payment reference" variant="info">
        {refForm ? (
          <form onSubmit={saveRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div><label className="block text-xs text-gray-600 mb-1">Confirmation reference</label><input type="text" maxLength={100} value={refForm.confirmation_reference} onChange={setRef('confirmation_reference')} className={INPUT} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">Confirmation date</label><input type="date" value={refForm.confirmation_date} onChange={setRef('confirmation_date')} className={INPUT} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">Payment reference</label><input type="text" maxLength={100} value={refForm.payment_reference} onChange={setRef('payment_reference')} className={INPUT} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">Payment date</label><input type="date" value={refForm.payment_date} onChange={setRef('payment_date')} className={INPUT} /></div>
            <div className="md:col-span-4"><label className="block text-xs text-gray-600 mb-1">Remarks</label><input type="text" maxLength={2000} value={refForm.commercial_remarks} onChange={setRef('commercial_remarks')} className={INPUT} /></div>
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" disabled={busy} className={`${BTN} bg-blue-600 hover:bg-blue-700 text-white`}>Save reference</button>
              <button type="button" onClick={() => setRefForm(null)} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500 text-xs">Confirmation</dt><dd className="mt-1 text-gray-900">{pi.confirmation_reference || '—'}{pi.confirmation_date && <span className="text-gray-500"> · {formatDate(pi.confirmation_date)}</span>}</dd></div>
              <div><dt className="text-gray-500 text-xs">Payment</dt><dd className="mt-1 text-gray-900">{pi.payment_reference || '—'}{pi.payment_date && <span className="text-gray-500"> · {formatDate(pi.payment_date)}</span>}</dd></div>
              <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900">{pi.commercial_remarks || '—'}</dd></div>
              {pi.commercial_updated_at && <div className="md:col-span-4 text-xs text-gray-500">Recorded {formatDateTime(pi.commercial_updated_at)} · {pi.commercial_updater_name || '—'}</div>}
            </dl>
            {isIssued && can('proforma-invoice.edit') && <button type="button" onClick={editRef} className={`${BTN} mt-3 border border-blue-300 text-blue-700 hover:bg-blue-50`}><i className="bi bi-pencil me-1"></i> Record reference</button>}
          </>
        )}
        <p className="text-xs text-gray-500 mt-2 mb-0">References are recorded as entered. The ERP does not track payment status or balances; the payment workflow is still to be defined.</p>
      </Card>

      <Card title="Invoices on this PI" variant="info">
        {pi.invoices.length === 0 ? <p className="text-sm text-gray-500 m-0">None yet.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Invoice</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium text-right">Amount</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pi.invoices.map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5">{can('invoice.view') ? <Link href={`/finance/invoices/${i.id}`} className={LINK}>{i.invoice_no || `Draft #${i.id}`}</Link> : <span className="font-mono">{i.invoice_no || `Draft #${i.id}`}</span>}</td>
                  <td className="py-1.5">{formatDate(i.invoice_date)}</td>
                  <td className="py-1.5 text-right">{i.total_amount === null ? '—' : formatAmount(i.total_amount)}</td>
                  <td className="py-1.5"><WorkflowBadge status={i.status} config={COMMERCIAL_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Traceability" variant="info">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Order dispatches</h4>
        {pi.trace.dispatches.length === 0 ? <p className="text-sm text-gray-500">No posted dispatch on {pi.oc_num} yet.</p> : (
          <table className="min-w-full text-sm mb-4">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Dispatch</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Type</th><th className="py-1.5 font-medium">Lot / PO</th><th className="py-1.5 font-medium text-right">Quantity</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pi.trace.dispatches.map((d) => (
                <tr key={d.id}>
                  <td className="py-1.5">{can('dispatch.view') ? <Link href={`/dispatch/${d.dispatch_id}`} className={LINK}>{d.dispatch_no}</Link> : <span className="font-mono">{d.dispatch_no}</span>}</td>
                  <td className="py-1.5">{formatDate(d.dispatch_date)}</td>
                  <td className="py-1.5 text-xs">{DISPATCH_TYPE_LABELS[d.dispatch_type]}</td>
                  <td className="py-1.5">{d.lot_id ? <Link href={`/procurement/lots/${d.lot_id}`} className={LINK}>{d.lot_no}</Link> : <span className="font-mono text-xs">{d.po_num}</span>}</td>
                  <td className="py-1.5 text-right">{formatQuantity(d.quantity, d.uom_decimal_places)} {d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Production allocated to the order</h4>
        {pi.trace.allocations.length === 0 ? <p className="text-sm text-gray-500 m-0">No finished production allocated.</p> : (
          <>
            <ul className="list-none p-0 mb-4 space-y-1 text-sm">
              {pi.trace.allocations.map((a) => (
                <li key={a.id}>{a.design_no || a.item_description || a.product_name}: {formatQuantity(a.quantity, a.uom_decimal_places)} from finished lot <Link href={`/procurement/lots/${a.lot_id}`} className={LINK}>{a.lot_no}</Link> <span className="text-gray-500">({a.processing_no})</span></li>
              ))}
            </ul>
            <div className="space-y-6">
              {traces.map((production) => <ProductionTrace key={production.processing_record_id} production={production} companyLabel={pi.company_label} companyCode={pi.company_code} />)}
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
