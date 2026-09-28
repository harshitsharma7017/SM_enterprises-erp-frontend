'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProductionPlanForm from '@/components/production/ProductionPlanForm';

export default function CreateProductionPlanPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Production Plan" breadcrumbs={[{ label: 'Production Plans', href: '/production/plans' }, { label: 'New' }]} />
      <ProductionPlanForm />
    </DashboardLayout>
  );
}
