'use client';
import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProductionPlanForm from '@/components/production/ProductionPlanForm';

export default function EditProductionPlanPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Production Plan" breadcrumbs={[{ label: 'Production Plans', href: '/production/plans' }, { label: 'Edit' }]} />
      <ProductionPlanForm planId={id} />
    </DashboardLayout>
  );
}
