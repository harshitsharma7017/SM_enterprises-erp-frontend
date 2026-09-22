'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import OcForm from '@/components/sales/order-confirmations/OcForm';

export default function CreateOcPage() {
  return (
    <DashboardLayout>
      <PageHeading
        title="New Order Confirmation"
        breadcrumbs={[{ label: 'Order Confirmations', href: '/sales/order-confirmations' }, { label: 'New' }]}
      />
      <OcForm />
    </DashboardLayout>
  );
}
