'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import InwardEntryForm from '@/components/procurement/inward-entries/InwardEntryForm';

export default function CreateInwardEntryPage() {
  return (
    <DashboardLayout>
      <PageHeading
        title="New Goods Inward Receipt"
        breadcrumbs={[{ label: 'Goods Inward', href: '/procurement/inward-entries' }, { label: 'New' }]}
      />
      <InwardEntryForm />
    </DashboardLayout>
  );
}
