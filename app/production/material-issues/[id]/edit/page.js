'use client';

import { use } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import MaterialIssueForm from '@/components/production/MaterialIssueForm';

export default function EditMaterialIssuePage({ params }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <PageHeading title="Edit Material Issue" breadcrumbs={[{ label: 'Material Issues', href: '/production/material-issues' }, { label: 'Edit' }]} />
      <MaterialIssueForm issueId={id} />
    </DashboardLayout>
  );
}
