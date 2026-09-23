'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import GrnForm from '@/components/procurement/grn/GrnForm';

export default function CreateGrnPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Goods Receipt" breadcrumbs={[{ label: 'Goods Receipts', href: '/procurement/grn' }, { label: 'New' }]} />
      <GrnForm />
    </DashboardLayout>
  );
}
