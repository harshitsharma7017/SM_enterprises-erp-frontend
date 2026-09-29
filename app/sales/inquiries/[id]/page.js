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
        <div className="p-4 text-fg-subtle">Loading inquiry...</div>
      </DashboardLayout>
    );
  }

  if (error || !inquiry) {
    return (
      <DashboardLayout>
        <div className="alert alert-danger">{error || 'Inquiry not found'}</div>
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
              <Link href={`/sales/inquiries/${id}/edit`} className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/sales/inquiries" className="border border-line-strong px-3 py-1.5 rounded text-sm text-fg-muted hover:bg-surface-hover">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-surface border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle">Status</dt><dd className="mt-0.5"><WorkflowBadge status={inquiry.status} config={INQUIRY_STATUS_BADGES} /></dd></div>
          <div><dt className="text-fg-subtle">Inquiry Date</dt><dd className="mt-0.5 text-fg">{formatDate(inquiry.inquiry_date)}</dd></div>
          <div><dt className="text-fg-subtle">Buyer&apos;s Ref / Season</dt><dd className="mt-0.5 text-fg">{inquiry.buyer_ref || '—'}</dd></div>
          <div><dt className="text-fg-subtle">Source</dt><dd className="mt-0.5 text-fg">{inquiry.source_name || '—'}</dd></div>
          <div><dt className="text-fg-subtle">Buyer</dt><dd className="mt-0.5 text-fg">{inquiry.buyer_company_name || '—'} {inquiry.buyer_display_code ? `(${inquiry.buyer_display_code})` : ''}</dd></div>
          <div><dt className="text-fg-subtle">Category</dt><dd className="mt-0.5 text-fg">{inquiry.category_name || '—'}</dd></div>
          <div><dt className="text-fg-subtle">Order Format</dt><dd className="mt-0.5 text-fg">{inquiry.format_name || '—'}</dd></div>
          <div><dt className="text-fg-subtle">Agent</dt><dd className="mt-0.5 text-fg">{inquiry.agent_name ? `${inquiry.agent_name}${inquiry.agent_commission_value != null ? ` (${inquiry.agent_commission_value}${inquiry.agent_commission_type === 'percent' ? '%' : ''})` : ''}` : '—'}</dd></div>
          <div><dt className="text-fg-subtle">Currency / Exchange Rate</dt><dd className="mt-0.5 text-fg">{inquiry.currency_iso_code || '—'}{inquiry.exchange_rate ? ` @ ₹${inquiry.exchange_rate}` : ''}</dd></div>
          <div><dt className="text-fg-subtle">Expected Shipment</dt><dd className="mt-0.5 text-fg">{inquiry.expected_shipment_date ? formatDate(inquiry.expected_shipment_date) : '—'}</dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle">Remarks</dt><dd className="mt-0.5 text-fg">{inquiry.remarks || '—'}</dd></div>
        </dl>
      </div>

      <div className="bg-surface border rounded shadow-sm mb-4 overflow-hidden">
        <div className="bg-surface-raised px-4 py-2.5 border-b font-semibold text-sm text-fg-muted">Items &amp; Costing</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Design No.</th>
                <th>Product</th>
                <th>Supplier</th>
                <th>Colour / Size</th>
                <th>Unit</th>
                <th>FOB</th>
                <th className="text-right">Price</th>
                <th className="text-right">Cost Price</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(inquiry.items || []).length === 0 ? (
                <tr><td colSpan="12" className="text-center">No items.</td></tr>
              ) : inquiry.items.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="text-fg">{item.design_no || '—'}</div>
                    {item.custom_values && typeof item.custom_values === 'object' && Object.entries(item.custom_values).map(([k, v]) => (
                      <div key={k} className="text-[11px] text-fg-subtle">{k.replace(/_/g, ' ')}: {v}</div>
                    ))}
                  </td>
                  <td className="text-fg-muted">{item.product_name || '—'}</td>
                  <td className="text-fg-muted">{item.supplier_company_name || '—'}</td>
                  <td className="text-fg-muted">
                    {(item.colours || []).map((c, ci) => (
                      <div key={ci} className="mb-0.5">
                        {c.colour && <span className="font-medium">{c.colour}: </span>}
                        {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                      </div>
                    ))}
                  </td>
                  <td className="text-fg-muted">{item.unit || '—'}</td>
                  <td className="text-fg-muted">{item.fob_value_name || '—'}</td>
                  <td className="text-right cell-strong">{formatAmount(item.price)}</td>
                  <td className="text-right">{formatAmount(item.cost_price)}</td>
                  <td className="text-right cell-strong">{item.qty}</td>
                  <td className="text-right cell-strong">{formatAmount(item.amount)}</td>
                  <td><WorkflowBadge status={item.status} config={INQUIRY_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
            {(inquiry.items || []).length > 0 && (
              <tfoot>
                <tr className="border-t">
                  <td colSpan="10" className="text-right font-semibold text-fg-muted">Total</td>
                  <td className="text-right cell-strong">{formatAmount(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-raised border rounded p-3">
          <div className="text-xs font-semibold text-fg-subtle mb-1">Delivery Details</div>
          <div className="text-sm text-fg whitespace-pre-wrap">{inquiry.delivery_details || 'None recorded.'}</div>
        </div>
        <div className="bg-surface-raised border rounded p-3">
          <div className="text-xs font-semibold text-fg-subtle mb-1">Packing Details</div>
          <div className="text-sm text-fg whitespace-pre-wrap">{inquiry.packing_details || 'None recorded.'}</div>
        </div>
      </div>

      <div className="bg-surface border rounded shadow-sm p-4 mb-4">
        <div className="text-sm font-semibold text-fg-muted mb-2">Buyer Follow-up</div>
        {(inquiry.follow_ups || []).length === 0 ? (
          <p className="text-sm text-fg-subtle">No follow-up entries recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {inquiry.follow_ups.map((f) => (
              <li key={f.id} className="text-sm text-fg-muted">
                <span className="text-fg-subtle">{formatDate(f.follow_up_date)}</span> — {f.comment}
                {f.creator_name && <span className="text-fg-subtle"> ({f.creator_name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-fg-subtle">
        Created {formatDateTime(inquiry.created_at)}{inquiry.creator_name ? ` by ${inquiry.creator_name}` : ''} · Last updated {formatDateTime(inquiry.updated_at)}{inquiry.updater_name ? ` by ${inquiry.updater_name}` : ''}
      </div>
    </DashboardLayout>
  );
}
