'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { StatusBadge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';
import { useAuth } from '@/hooks/useAuth';
import { isProtectedUser } from '@/components/administration/permissionRegistry';

export default function UserShowPage({ params }) {
  const { id } = use(params);
  const { can, user: currentUser } = useAuth(true);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/user-management/users/${id}`);
      setTarget(res.data);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchUser);
  }, [fetchUser]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-fg-subtle">Loading user...</div>
      </DashboardLayout>
    );
  }

  if (error || !target) {
    return (
      <DashboardLayout>
        <div className="alert alert-danger">{error || 'User not found'}</div>
      </DashboardLayout>
    );
  }

  const protectedAccount = isProtectedUser(target);
  const isSelf = currentUser && Number(currentUser.id) === Number(target.id);

  return (
    <DashboardLayout>
      <PageHeading
        title={target.name}
        breadcrumbs={[{ label: 'Users', href: '/user-management/users' }, { label: target.name }]}
        actions={(
          <>
            {can('user.edit') && (
              <Link href={`/user-management/users/${id}/edit`} className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/user-management/users" className="border border-line-strong px-3 py-1.5 rounded text-sm text-fg-muted hover:bg-surface-hover">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-surface border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-fg-subtle">Name</dt>
            <dd className="mt-0.5 text-fg">
              {target.name}
              {protectedAccount && <i className="bi bi-shield-lock-fill text-amber-500 ml-1.5" title="Protected system account"></i>}
              {isSelf && <span className="ml-1.5 text-xs text-fg-subtle">(you)</span>}
            </dd>
          </div>
          <div><dt className="text-fg-subtle">Email</dt><dd className="mt-0.5 text-fg">{target.email}</dd></div>
          <div><dt className="text-fg-subtle">Phone</dt><dd className="mt-0.5 text-fg">{target.phone || '—'}</dd></div>
          <div><dt className="text-fg-subtle">Status</dt><dd className="mt-0.5"><StatusBadge status={target.is_active ? 'active' : 'inactive'} /></dd></div>
          <div>
            <dt className="text-fg-subtle">Roles</dt>
            <dd className="mt-0.5">
              {(target.roles || []).length === 0 ? '—' : (
                <div className="flex flex-wrap gap-1">
                  {target.roles.map((r) => (
                    <span key={r.id} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">{r.name}</span>
                  ))}
                </div>
              )}
            </dd>
          </div>
          <div><dt className="text-fg-subtle">Created</dt><dd className="mt-0.5 text-fg">{formatDateTime(target.created_at)}</dd></div>
        </dl>
      </div>
    </DashboardLayout>
  );
}
