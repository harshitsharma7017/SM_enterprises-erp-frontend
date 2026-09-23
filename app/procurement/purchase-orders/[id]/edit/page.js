'use client';

import { use, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PurchaseOrderForm from '@/components/procurement/purchase-orders/PurchaseOrderForm';
import PlanningPoForm from '@/components/procurement/purchase-orders/PlanningPoForm';
import { apiClient } from '@/lib/api-client';

export default function EditPurchaseOrderPage({ params }) {
  const { id } = use(params);
  // OC purchase orders keep the existing form; planning POs use their own.
  const [origin, setOrigin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/procurement/purchase-orders/${id}`)
      .then((res) => { if (mounted) setOrigin(res.data?.origin || 'order_confirmation'); })
      .catch((err) => { if (mounted) setError(err.message || 'Failed to load Purchase Order'); });
    return () => { mounted = false; };
  }, [id]);

  return (
    <DashboardLayout>
      <PageHeading
        title="Edit Purchase Order"
        breadcrumbs={[
          { label: 'Purchase Orders', href: '/procurement/purchase-orders' },
          { label: 'View', href: `/procurement/purchase-orders/${id}` },
          { label: 'Edit' },
        ]}
      />
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      {!error && !origin && <div className="p-4 text-gray-500">Loading Purchase Order...</div>}
      {origin === 'order_confirmation' && <PurchaseOrderForm poId={id} />}
      {origin && origin !== 'order_confirmation' && <PlanningPoForm poId={id} />}
    </DashboardLayout>
  );
}
