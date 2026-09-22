'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import OcForm from '@/components/sales/order-confirmations/OcForm';

export default function EditOcPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <PageHeading
        title="Edit Order Confirmation"
        breadcrumbs={[
          { label: 'Order Confirmations', href: '/sales/order-confirmations' },
          { label: 'View', href: `/sales/order-confirmations/${id}` },
          { label: 'Edit' },
        ]}
      />
      <OcForm ocId={id} />
    </DashboardLayout>
  );
}
