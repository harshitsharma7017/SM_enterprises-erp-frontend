'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WorkflowBadge, ALLOCATION_STATUS_BADGES } from '@/components/ui/Badge';
import { formatQuantity } from '@/components/sales/shared/format';

/** Orders this lot is allocated to (finished or bought-in lot → order item → customer). */
export default function OrderAllocationsCard({ allocations, can }) {
  if (!allocations || allocations.length === 0) return null;
  return (
    <Card title="Allocated to Orders" variant="info">
      <table className="data-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Item</th><th className="text-right">Quantity</th><th>Status</th></tr></thead>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.id}>
              <td>{can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${a.order_confirmation_id}`} className="font-mono text-link hover:underline">{a.oc_num}</Link> : <span className="font-mono">{a.oc_num}</span>}</td>
              <td className="text-fg-muted">{a.buyer_name || '—'}</td>
              <td className="text-fg-muted">{a.design_no || a.item_description || '—'}</td>
              <td className="text-right">{formatQuantity(a.quantity, 6)} {a.unit}</td>
              <td><WorkflowBadge status={a.status} config={ALLOCATION_STATUS_BADGES} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
