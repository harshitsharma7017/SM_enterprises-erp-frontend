'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PlanForm from '@/components/planning/PlanForm';

export default function CreateMaterialPlanPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Material Plan" breadcrumbs={[{ label: 'Material Plans', href: '/planning/material-plans' }, { label: 'New' }]} />
      <PlanForm />
    </DashboardLayout>
  );
}
