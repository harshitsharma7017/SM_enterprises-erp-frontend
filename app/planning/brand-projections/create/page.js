'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProjectionForm from '@/components/planning/ProjectionForm';

export default function CreateBrandProjectionPage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Brand Projection" breadcrumbs={[{ label: 'Brand Projections', href: '/planning/brand-projections' }, { label: 'New' }]} />
      <ProjectionForm />
    </DashboardLayout>
  );
}
