'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PurchaseOrderForm from '@/components/procurement/purchase-orders/PurchaseOrderForm';

export default function CreatePurchaseOrderPage() {
  return (
    <DashboardLayout>
      <PageHeading
        title="New Purchase Order"
        breadcrumbs={[{ label: 'Purchase Orders', href: '/procurement/purchase-orders' }, { label: 'New' }]}
      />
      <PurchaseOrderForm />
    </DashboardLayout>
  );
}
