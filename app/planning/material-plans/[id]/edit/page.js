'use client';
import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PlanForm from '@/components/planning/PlanForm';

export default function EditMaterialPlanPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Material Plan" breadcrumbs={[{ label: 'Material Plans', href: '/planning/material-plans' }, { label: 'Edit' }]} />
      <PlanForm planId={id} />
    </DashboardLayout>
  );
}
