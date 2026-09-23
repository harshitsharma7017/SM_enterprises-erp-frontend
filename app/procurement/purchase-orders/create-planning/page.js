'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PlanningPoForm from '@/components/procurement/purchase-orders/PlanningPoForm';

export default function CreatePlanningPurchaseOrderPage() {
  return (
    <DashboardLayout>
      <PageHeading
        title="New Planning Purchase Order"
        breadcrumbs={[{ label: 'Purchase Orders', href: '/procurement/purchase-orders' }, { label: 'New Planning PO' }]}
      />
      <PlanningPoForm />
    </DashboardLayout>
  );
}
