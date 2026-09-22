'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, INQUIRY_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatAmount } from '@/components/sales/shared/format';

export default function InquiryShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);

  const fetchInquiry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/inquiries/${id}`);
      if (res.success) setInquiry(res.data.inquiry);
    } catch (err) {
      console.error(err);
      setError('Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchInquiry);
  }, [fetchInquiry]);

  const convertToOc = async () => {
    setConverting(true);
    try {
      const res = await apiClient.post(`/inquiries/${id}/convert-to-oc`);
      if (res.success) {
        router.push(`/sales/order-confirmations/${res.data.id}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to convert to Order Confirmation');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading inquiry...</div>
      </DashboardLayout>
    );
  }

  if (error || !inquiry) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Inquiry not found'}</div>
      </DashboardLayout>
    );
  }

  const canConvert = can('order-confirmation.create') && inquiry.status !== 'converted_to_oc'
    && (inquiry.items || []).some((it) => it.status === 'confirmed');

  const total = (inquiry.items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <DashboardLayout>
      <PageHeading
        title={inquiry.inquiry_no}
        breadcrumbs={[{ label: 'Inquiries', href: '/sales/inquiries' }, { label: inquiry.inquiry_no }]}
        actions={(
          <>
            {canConvert && (
              <button type="button" disabled={converting} onClick={convertToOc} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50">
                <i className="bi bi-arrow-right-circle me-1"></i> {converting ? 'Converting…' : 'Convert to OC'}
              </button>
            )}
            {can('inquiry.edit') && (
              <Link href={`/sales/inquiries/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/sales/inquiries" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Status</dt><dd className="mt-0.5"><WorkflowBadge status={inquiry.status} config={INQUIRY_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500">Inquiry Date</dt><dd className="mt-0.5 text-gray-900">{formatDate(inquiry.inquiry_date)}</dd></div>
          <div><dt className="text-gray-500">Buyer&apos;s Ref / Season</dt><dd className="mt-0.5 text-gray-900">{inquiry.buyer_ref || '—'}</dd></div>
          <div><dt className="text-gray-500">Source</dt><dd className="mt-0.5 text-gray-900">{inquiry.source_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Buyer</dt><dd className="mt-0.5 text-gray-900">{inquiry.buyer_company_name || '—'} {inquiry.buyer_display_code ? `(${inquiry.buyer_display_code})` : ''}</dd></div>
          <div><dt className="text-gray-500">Category</dt><dd className="mt-0.5 text-gray-900">{inquiry.category_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Order Format</dt><dd className="mt-0.5 text-gray-900">{inquiry.format_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Agent</dt><dd className="mt-0.5 text-gray-900">{inquiry.agent_name ? `${inquiry.agent_name}${inquiry.agent_commission_value != null ? ` (${inquiry.agent_commission_value}${inquiry.agent_commission_type === 'percent' ? '%' : ''})` : ''}` : '—'}</dd></div>
          <div><dt className="text-gray-500">Currency / Exchange Rate</dt><dd className="mt-0.5 text-gray-900">{inquiry.currency_iso_code || '—'}{inquiry.exchange_rate ? ` @ ₹${inquiry.exchange_rate}` : ''}</dd></div>
          <div><dt className="text-gray-500">Expected Shipment</dt><dd className="mt-0.5 text-gray-900">{inquiry.expected_shipment_date ? formatDate(inquiry.expected_shipment_date) : '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500">Remarks</dt><dd className="mt-0.5 text-gray-900">{inquiry.remarks || '—'}</dd></div>
        </dl>
      </div>

      <div className="bg-white border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b font-semibold text-sm text-gray-700">Items &amp; Costing</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Design No.</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Colour / Size</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">FOB</th>
                <th className="px-3 py-2 font-medium text-right">Price</th>
                <th className="px-3 py-2 font-medium text-right">Cost Price</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(inquiry.items || []).length === 0 ? (
                <tr><td colSpan="12" className="text-center py-6 text-gray-400">No items.</td></tr>
              ) : inquiry.items.map((item, i) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{item.design_no || '—'}</div>
                    {item.custom_values && typeof item.custom_values === 'object' && Object.entries(item.custom_values).map(([k, v]) => (
                      <div key={k} className="text-[11px] text-gray-500">{k.replace(/_/g, ' ')}: {v}</div>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{item.product_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.supplier_company_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {(item.colours || []).map((c, ci) => (
                      <div key={ci} className="mb-0.5">
                        {c.colour && <span className="font-medium">{c.colour}: </span>}
                        {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.fob_value_name || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatAmount(item.price)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{formatAmount(item.cost_price)}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatAmount(item.amount)}</td>
                  <td className="px-3 py-2"><WorkflowBadge status={item.status} config={INQUIRY_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
            {(inquiry.items || []).length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan="10" className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Delivery Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{inquiry.delivery_details || 'None recorded.'}</div>
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">Packing Details</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{inquiry.packing_details || 'None recorded.'}</div>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Buyer Follow-up</div>
        {(inquiry.follow_ups || []).length === 0 ? (
          <p className="text-sm text-gray-400">No follow-up entries recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {inquiry.follow_ups.map((f) => (
              <li key={f.id} className="text-sm text-gray-700">
                <span className="text-gray-500">{formatDate(f.follow_up_date)}</span> — {f.comment}
                {f.creator_name && <span className="text-gray-400"> ({f.creator_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-gray-400">
        Created {formatDateTime(inquiry.created_at)}{inquiry.creator_name ? ` by ${inquiry.creator_name}` : ''} · Last updated {formatDateTime(inquiry.updated_at)}{inquiry.updater_name ? ` by ${inquiry.updater_name}` : ''}
      </div>
    </DashboardLayout>
  );
}
