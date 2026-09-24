'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WorkflowBadge, COMMERCIAL_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatAmount } from '@/components/sales/shared/format';

const LINK = 'font-mono text-blue-600 hover:underline';
const BTN = 'px-2.5 py-1 rounded text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50';

/**
 * An order's proforma invoice and invoice history. Each list is only
 * requested with its own view permission (the API enforces it too).
 */
export default function OrderCommercialDocuments({ ocId, orderStatus }) {
  const { can } = useAuth(true);
  const canPi = can('proforma-invoice.view');
  const canInvoice = can('invoice.view');
  const [proformas, setProformas] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canPi) return;
    apiClient.get(`/finance/proforma-invoices?order_confirmation_id=${ocId}&limit=100`).then((res) => setProformas(res.data || [])).catch((err) => setError(err.message));
  }, [ocId, canPi]);
  useEffect(() => {
    if (!canInvoice) return;
    apiClient.get(`/finance/invoices?order_confirmation_id=${ocId}&limit=100`).then((res) => setInvoices(res.data || [])).catch((err) => setError(err.message));
  }, [ocId, canInvoice]);

  if (!canPi && !canInvoice) return null;
  const confirmed = orderStatus === 'confirmed';

  return (
    <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700 flex items-center justify-between">
        <span>Proforma Invoices &amp; Invoices</span>
        <span className="flex gap-2">
          {confirmed && can('proforma-invoice.create') && <Link href={`/finance/proforma-invoices/create?order_confirmation_id=${ocId}`} className={BTN}><i className="bi bi-file-earmark-text me-1"></i> New PI</Link>}
          {confirmed && can('invoice.create') && <Link href={`/finance/invoices/create?order_confirmation_id=${ocId}`} className={BTN}><i className="bi bi-file-earmark-check me-1"></i> New Invoice</Link>}
        </span>
      </div>
      <div className="p-4 space-y-4 text-sm">
        {error && <div className="bg-red-50 text-red-600 p-2 rounded">{error}</div>}
        {canPi && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Proforma invoices</h4>
            {proformas.length === 0 ? <p className="text-gray-500 m-0">None.</p> : (
              <table className="min-w-full">
                <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1 font-medium">PI</th><th className="py-1 font-medium">Date</th><th className="py-1 font-medium text-right">Amount</th><th className="py-1 font-medium">Payment ref.</th><th className="py-1 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {proformas.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1"><Link href={`/finance/proforma-invoices/${p.id}`} className={LINK}>{p.pi_no}</Link></td>
                      <td className="py-1">{formatDate(p.pi_date)}</td>
                      <td className="py-1 text-right">{p.total_amount === null ? '—' : `${formatAmount(p.total_amount)} ${p.currency_code || ''}`}</td>
                      <td className="py-1">{p.payment_reference || '—'}</td>
                      <td className="py-1"><WorkflowBadge status={p.status} config={COMMERCIAL_STATUS_BADGES} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {canInvoice && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Invoices</h4>
            {invoices.length === 0 ? <p className="text-gray-500 m-0">None.</p> : (
              <table className="min-w-full">
                <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1 font-medium">Invoice</th><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">PI</th><th className="py-1 font-medium">Dispatch</th><th className="py-1 font-medium text-right">Amount</th><th className="py-1 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td className="py-1"><Link href={`/finance/invoices/${i.id}`} className={LINK}>{i.invoice_no || `Draft #${i.id}`}</Link></td>
                      <td className="py-1">{formatDate(i.invoice_date)}</td>
                      <td className="py-1 font-mono text-xs">{i.pi_no || '—'}</td>
                      <td className="py-1 font-mono text-xs">{i.dispatch_nos}</td>
                      <td className="py-1 text-right">{i.total_amount === null ? '—' : `${formatAmount(i.total_amount)} ${i.currency_code || ''}`}</td>
                      <td className="py-1"><WorkflowBadge status={i.status} config={COMMERCIAL_STATUS_BADGES} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
