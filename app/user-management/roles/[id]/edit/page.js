'use client';

import { use, useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import RoleForm from '@/components/administration/RoleForm';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export default function RoleEditPage({ params }) {
  const { id } = use(params);
  useAuth(true);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRole = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/user-management/roles/${id}`);
      setRole(res.data);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load role');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchRole);
  }, [fetchRole]);

  return (
    <DashboardLayout>
      <PageHeading title="Edit Role" breadcrumbs={[{ label: 'Roles', href: '/user-management/roles' }, { label: role?.name || '...' }]} />
      <Card title={role ? `Edit — ${role.name}` : 'Edit Role'} variant="primary">
        {loading ? (
          <div className="p-4 text-gray-500">Loading role...</div>
        ) : error || !role ? (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Role not found'}</div>
        ) : (
          <RoleForm mode="edit" role={role} />
        )}
      </Card>
    </DashboardLayout>
  );
}
