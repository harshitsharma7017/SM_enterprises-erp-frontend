'use client';
import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import ProjectionForm from '@/components/planning/ProjectionForm';

export default function EditBrandProjectionPage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Brand Projection" breadcrumbs={[{ label: 'Brand Projections', href: '/planning/brand-projections' }, { label: 'Edit' }]} />
      <ProjectionForm projectionId={id} />
    </DashboardLayout>
  );
}
