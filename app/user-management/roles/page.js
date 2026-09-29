'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { isSystemRole } from '@/components/administration/permissionRegistry';

/**
 * Roles — mirrors the original ERP's user-management/roles/index.blade.php.
 * The Node API has no permissions_count/users_count on GET /roles (unlike
 * the original's Role::withCount(['permissions','users'])), so these are
 * computed client-side: one GET /roles/:id per role for its permission
 * count (Super Admin is special-cased to "All", matching the original —
 * its permissions come from a bypass, not the pivot table), and one
 * GET /users?limit=1000 tally for role membership counts.
 */
export default function RolesIndexPage() {
  const { can } = useAuth(true);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rolesRes = await apiClient.get('/user-management/roles');
      const baseRoles = rolesRes.data || [];

      const [detailResults, usersRes] = await Promise.all([
        Promise.all(baseRoles.map((r) => apiClient.get(`/user-management/roles/${r.id}`).catch(() => null))),
        apiClient.get('/user-management/users?limit=1000').catch(() => null),
      ]);

      const usersByRole = new Map();
      (usersRes?.data || []).forEach((u) => {
        (u.roles || []).forEach((r) => usersByRole.set(r.id, (usersByRole.get(r.id) || 0) + 1));
      });

      const enriched = baseRoles.map((role, i) => ({
        ...role,
        permissions_count: detailResults[i]?.data?.permissions?.length ?? 0,
        users_count: usersByRole.get(role.id) || 0,
      }));

      setRoles(enriched);
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchRoles);
  }, [fetchRoles]);

  const deleteRole = async (role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await apiClient.delete(`/user-management/roles/${role.id}`);
      fetchRoles();
    } catch (err) {
      alert(err.data?.error || err.message || 'Failed to delete role');
    }
  };

  const Actions = can('role.create') ? (
    <Link href="/user-management/roles/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center">
      <i className="bi bi-plus-lg mr-1"></i> Add Role
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Roles" />

      <Card title="Roles" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Role</th>
                <th className="text-center w-32">Permissions</th>
                <th className="text-center w-24">Users</th>
                <th className="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">Loading roles...</td></tr>
              ) : (
                roles.map((role, i) => {
                  const isSystem = isSystemRole(role.name);
                  return (
                    <tr key={role.id}>
                      <td>{i + 1}</td>
                      <td>
                        <span className="font-semibold text-fg">{role.name}</span>
                        {isSystem && (
                          <i className="bi bi-shield-lock-fill text-amber-500 ml-1.5" title="System role — cannot be renamed or deleted"></i>
                        )}
                      </td>
                      <td className="text-center">
                        {role.name === 'Super Admin' ? (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">All</span>
                        ) : (
                          <span className="text-xs bg-surface-raised border border-line text-fg-muted px-2 py-0.5 rounded">{role.permissions_count}</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="text-xs bg-surface-raised border border-line text-fg-muted px-2 py-0.5 rounded">{role.users_count}</span>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          {can('role.view') && (
                            <Link href={`/user-management/roles/${role.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-fg-muted hover:bg-surface-hover rounded-l-md border-r-0" title="View">
                              <i className="bi bi-eye"></i>
                            </Link>
                          )}
                          {can('role.edit') && (
                            <Link href={`/user-management/roles/${role.id}/edit`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover border-r-0" title="Edit">
                              <i className="bi bi-pencil"></i>
                            </Link>
                          )}
                          {can('role.delete') && (
                            <button
                              type="button"
                              disabled={isSystem || role.users_count > 0}
                              onClick={() => deleteRole(role)}
                              className={`px-2 py-1 text-sm bg-surface border rounded-r-md ${isSystem || role.users_count > 0 ? 'text-[var(--control-fg-disabled)] border-line cursor-not-allowed' : 'border-line-strong text-[var(--danger)] hover:bg-red-50'}`}
                              title={isSystem ? 'System role' : role.users_count > 0 ? `Assigned to ${role.users_count} user(s)` : 'Delete'}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="bg-surface-raised border border-line rounded p-3 mt-3 text-sm text-fg-muted">
        <i className="bi bi-info-circle mr-1"></i>
        <strong>System roles</strong> cannot be renamed or deleted. You can still change what most of them
        can do — only Super Admin is fixed.
      </div>
    </DashboardLayout>
  );
}
