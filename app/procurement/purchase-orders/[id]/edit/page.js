'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PurchaseOrderForm from '@/components/procurement/purchase-orders/PurchaseOrderForm';

export default function EditPurchaseOrderPage({ params }) {
  const { id } = use(params);

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
      <PurchaseOrderForm poId={id} />
    </DashboardLayout>
  );
}
