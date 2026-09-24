'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WorkflowBadge, ALLOCATION_STATUS_BADGES } from '@/components/ui/Badge';
import { formatQuantity } from '@/components/sales/shared/format';

/** Orders this finished material is allocated to (finished lot → order item → customer). */
export default function OrderAllocationsCard({ allocations, can }) {
  if (!allocations || allocations.length === 0) return null;
  return (
    <Card title="Allocated to Orders" variant="info">
      <table className="min-w-full text-sm">
        <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Order</th><th className="py-1.5 font-medium">Customer</th><th className="py-1.5 font-medium">Item</th><th className="py-1.5 font-medium text-right">Quantity</th><th className="py-1.5 font-medium">Status</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {allocations.map((a) => (
            <tr key={a.id}>
              <td className="py-1.5">{can('order-confirmation.view') ? <Link href={`/sales/order-confirmations/${a.order_confirmation_id}`} className="font-mono text-blue-600 hover:underline">{a.oc_num}</Link> : <span className="font-mono">{a.oc_num}</span>}</td>
              <td className="py-1.5 text-gray-700">{a.buyer_name || '—'}</td>
              <td className="py-1.5 text-gray-700">{a.design_no || a.item_description || '—'}</td>
              <td className="py-1.5 text-right">{formatQuantity(a.quantity, 6)} {a.unit}</td>
              <td className="py-1.5"><WorkflowBadge status={a.status} config={ALLOCATION_STATUS_BADGES} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
