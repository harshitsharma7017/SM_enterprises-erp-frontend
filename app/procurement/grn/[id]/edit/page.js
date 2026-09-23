'use client';
import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import GrnForm from '@/components/procurement/grn/GrnForm';

export default function EditGrnPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Goods Receipt" breadcrumbs={[{ label: 'Goods Receipts', href: '/procurement/grn' }, { label: 'Edit' }]} />
      <GrnForm grnId={id} />
    </DashboardLayout>
  );
}
