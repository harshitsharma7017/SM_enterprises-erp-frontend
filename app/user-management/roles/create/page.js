'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import RoleForm from '@/components/administration/RoleForm';
import { useAuth } from '@/hooks/useAuth';

export default function RoleCreatePage() {
  useAuth(true);

  return (
    <DashboardLayout>
      <PageHeading title="Add Role" breadcrumbs={[{ label: 'Roles', href: '/user-management/roles' }, { label: 'Add' }]} />
      <Card title="New Role" variant="primary">
        <RoleForm mode="create" />
      </Card>
    </DashboardLayout>
  );
}
