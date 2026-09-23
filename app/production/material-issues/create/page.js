'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import MaterialIssueForm from '@/components/production/MaterialIssueForm';

export default function CreateMaterialIssuePage() {
  return (
    <DashboardLayout>
      <PageHeading title="New Material Issue" breadcrumbs={[{ label: 'Material Issues', href: '/production/material-issues' }, { label: 'New' }]} />
      <MaterialIssueForm />
    </DashboardLayout>
  );
}
