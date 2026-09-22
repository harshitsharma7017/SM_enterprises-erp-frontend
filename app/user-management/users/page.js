'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { StatusBadge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';
import { isProtectedUser } from '@/components/administration/permissionRegistry';

/**
 * Users — mirrors the original ERP's user-management/users/index.blade.php:
 * search + role + status filters, a protected-account shield badge, roles
 * as badges, a clickable status toggle, and view/edit/delete actions.
 */
export default function UsersIndexPage() {
  const { can, user: currentUser } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/user-management/roles');
        setRoleOptions(res.data || []);
      } catch {
        // Filter dropdown degrades to empty; page still usable without it.
      }
    });
  }, []);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ page: String(page), limit: '15' });
      if (filters.search) query.set('search', filters.search);
      if (filters.role) query.set('role', filters.role);
      if (filters.status !== '') query.set('status', filters.status);

      const res = await apiClient.get(`/user-management/users?${query.toString()}`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 15, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', role: '', status: '' });
    setPage(1);
  };

  const toggleStatus = async (u) => {
    try {
      await apiClient.patch(`/user-management/users/${u.id}/toggle-status`);
      fetchRows();
    } catch (err) {
      alert(err.data?.error || err.message || 'Failed to toggle status');
    }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    try {
      await apiClient.delete(`/user-management/users/${u.id}`);
      fetchRows();
    } catch (err) {
      alert(err.data?.error || err.message || 'Failed to delete user');
    }
  };

  const pagination = toPaginationFromCurrentPageMeta(meta);

  const Actions = can('user.create') ? (
    <Link href="/user-management/users/create" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center">
      <i className="bi bi-plus-lg mr-1"></i> Add User
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Users" />

      <Card title="Users" variant="primary" actions={Actions}>
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text" name="search" value={filters.search} onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Name, email or phone"
            />
          </div>
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <select name="role" value={filters.role} onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All roles</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded text-sm">
            Reset
          </button>
        </form>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading users...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-people" title="No users found" message="Try clearing the filters, or add a new user." />
              ) : (
                rows.map((u) => {
                  const protectedAccount = isProtectedUser(u);
                  const isSelf = currentUser && Number(currentUser.id) === Number(u.id);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="font-semibold text-gray-800">{u.name}</span>
                        {protectedAccount && <i className="bi bi-shield-lock-fill text-amber-500 ml-1.5" title="Protected system account"></i>}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{u.email}</td>
                      <td className="px-4 py-2 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-4 py-2">
                        {(u.roles || []).length === 0 ? (
                          <span className="text-xs text-gray-400">No role</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span key={r.id} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">{r.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge
                          status={u.is_active ? 'active' : 'inactive'}
                          onClick={can('user.edit') && !protectedAccount && !isSelf ? () => toggleStatus(u) : undefined}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          {can('user.view') && (
                            <Link href={`/user-management/users/${u.id}`} className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0" title="View">
                              <i className="bi bi-eye"></i>
                            </Link>
                          )}
                          {can('user.edit') && (
                            <Link href={`/user-management/users/${u.id}/edit`} className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 border-r-0" title="Edit">
                              <i className="bi bi-pencil"></i>
                            </Link>
                          )}
                          {can('user.delete') && (
                            <button
                              type="button"
                              disabled={protectedAccount || isSelf}
                              onClick={() => deleteUser(u)}
                              className={`px-2 py-1 text-sm bg-white border rounded-r-md ${protectedAccount || isSelf ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                              title={protectedAccount ? 'Protected system account' : isSelf ? 'You cannot delete yourself' : 'Delete'}
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

        <Pagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
