'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import PermissionMatrix from '@/components/administration/PermissionMatrix';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { isSystemRole } from '@/components/administration/permissionRegistry';

export default function RoleShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [role, setRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [roleRes, permsRes, usersRes] = await Promise.all([
        apiClient.get(`/user-management/roles/${id}`),
        apiClient.get('/user-management/permissions'),
        apiClient.get('/user-management/users?limit=1000').catch(() => null),
      ]);
      setRole(roleRes.data);
      setAllPermissions(permsRes.data || []);
      setAssignedUsers((usersRes?.data || []).filter((u) => (u.roles || []).some((r) => r.id === Number(id))));
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to load role');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading role...</div>
      </DashboardLayout>
    );
  }

  if (error || !role) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Role not found'}</div>
      </DashboardLayout>
    );
  }

  const isSystem = isSystemRole(role.name);
  const isSuperAdmin = role.name === 'Super Admin';
  const selectedNames = isSuperAdmin ? allPermissions.map((p) => p.name) : (role.permissions || []).map((p) => p.name);

  return (
    <DashboardLayout>
      <PageHeading
        title={role.name}
        breadcrumbs={[{ label: 'Roles', href: '/user-management/roles' }, { label: role.name }]}
        actions={(
          <>
            {can('role.edit') && !isSystem && (
              <Link href={`/user-management/roles/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/user-management/roles" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-white border rounded shadow-sm p-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {isSystem && (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
            <i className="bi bi-shield-lock-fill"></i> System role
          </span>
        )}
        <span className="text-gray-500">{assignedUsers.length} user(s) assigned</span>
        <span className="text-gray-500">{isSuperAdmin ? 'All permissions' : `${selectedNames.length} permission(s)`}</span>
      </div>

      {assignedUsers.length > 0 && (
        <div className="bg-white border rounded shadow-sm p-4 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Assigned Users</div>
          <div className="flex flex-wrap gap-2">
            {assignedUsers.map((u) => (
              <span key={u.id} className="text-xs bg-gray-100 border border-gray-200 text-gray-700 px-2 py-1 rounded">{u.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border rounded shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Permissions</div>
        <PermissionMatrix permissions={allPermissions} selected={selectedNames} onChange={() => {}} readonly />
      </div>
    </DashboardLayout>
  );
}
