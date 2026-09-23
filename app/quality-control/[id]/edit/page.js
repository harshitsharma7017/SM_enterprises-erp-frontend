'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import QcForm from '@/components/quality/QcForm';

export default function EditQcPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Inspection" breadcrumbs={[{ label: 'Quality Control', href: '/quality-control' }, { label: 'Edit' }]} />
      <QcForm qcId={id} />
    </DashboardLayout>
  );
}
