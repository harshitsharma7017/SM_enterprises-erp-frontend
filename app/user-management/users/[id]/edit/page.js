'use client';

import { use, useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import UserForm from '@/components/administration/UserForm';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export default function UserEditPage({ params }) {
  const { id } = use(params);
  useAuth(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/user-management/users/${id}`);
      setUser(res.data);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchUser);
  }, [fetchUser]);

  return (
    <DashboardLayout>
      <PageHeading title="Edit User" breadcrumbs={[{ label: 'Users', href: '/user-management/users' }, { label: user?.name || '...' }]} />
      <Card title={user ? `Edit — ${user.name}` : 'Edit User'} variant="primary">
        {loading ? (
          <div className="p-4 text-gray-500">Loading user...</div>
        ) : error || !user ? (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'User not found'}</div>
        ) : (
          <UserForm mode="edit" user={user} />
        )}
      </Card>
    </DashboardLayout>
  );
}
