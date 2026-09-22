'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InwardEntryForm from '@/components/procurement/inward-entries/InwardEntryForm';

export default function EditInwardEntryPage({ params }) {
  const { id } = use(params);

  return (
    <DashboardLayout>
      <PageHeading
        title="Edit Goods Inward Receipt"
        breadcrumbs={[
          { label: 'Goods Inward', href: '/procurement/inward-entries' },
          { label: 'View', href: `/procurement/inward-entries/${id}` },
          { label: 'Edit' },
        ]}
      />
      <InwardEntryForm entryId={id} />
    </DashboardLayout>
  );
}
