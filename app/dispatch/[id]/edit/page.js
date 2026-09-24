'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import DispatchForm from '@/components/dispatch/DispatchForm';

export default function EditDispatchPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Dispatch" breadcrumbs={[{ label: 'Dispatches', href: '/dispatch' }, { label: 'Edit' }]} />
      <DispatchForm dispatchId={id} />
    </DashboardLayout>
  );
}
