'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import UserForm from '@/components/administration/UserForm';
import { useAuth } from '@/hooks/useAuth';

export default function UserCreatePage() {
  useAuth(true);

  return (
    <DashboardLayout>
      <PageHeading title="Add User" breadcrumbs={[{ label: 'Users', href: '/user-management/users' }, { label: 'Add' }]} />
      <Card title="New User" variant="primary">
        <UserForm mode="create" />
      </Card>
    </DashboardLayout>
  );
}
