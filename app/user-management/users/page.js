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
    <Link href="/user-management/users/create" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center">
      <i className="bi bi-plus-lg mr-1"></i> Add User
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <PageHeading title="Users" />

      <Card title="Users" variant="primary" actions={Actions}>
        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input
              type="text" name="search" value={filters.search} onChange={handleFilterChange}
              className="form-input focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
              placeholder="Name, email or phone"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Role</label>
            <select name="role" value={filters.role} onChange={handleFilterChange} className="form-select">
              <option value="">All roles</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select">
              <option value="">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
            Reset
          </button>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Roles</th>
                <th className="w-28">Status</th>
                <th className="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading users...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-people" title="No users found" message="Try clearing the filters, or add a new user." />
              ) : (
                rows.map((u) => {
                  const protectedAccount = isProtectedUser(u);
                  const isSelf = currentUser && Number(currentUser.id) === Number(u.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="font-semibold text-fg">{u.name}</span>
                        {protectedAccount && <i className="bi bi-shield-lock-fill text-amber-500 ml-1.5" title="Protected system account"></i>}
                      </td>
                      <td className="text-fg-muted">{u.email}</td>
                      <td className="text-fg-muted">{u.phone || '—'}</td>
                      <td>
                        {(u.roles || []).length === 0 ? (
                          <span className="text-xs text-fg-subtle">No role</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span key={r.id} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">{r.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={u.is_active ? 'active' : 'inactive'}
                          onClick={can('user.edit') && !protectedAccount && !isSelf ? () => toggleStatus(u) : undefined}
                        />
                      </td>
                      <td className="text-right">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          {can('user.view') && (
                            <Link href={`/user-management/users/${u.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-fg-muted hover:bg-surface-hover rounded-l-md border-r-0" title="View">
                              <i className="bi bi-eye"></i>
                            </Link>
                          )}
                          {can('user.edit') && (
                            <Link href={`/user-management/users/${u.id}/edit`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover border-r-0" title="Edit">
                              <i className="bi bi-pencil"></i>
                            </Link>
                          )}
                          {can('user.delete') && (
                            <button
                              type="button"
                              disabled={protectedAccount || isSelf}
                              onClick={() => deleteUser(u)}
                              className={`px-2 py-1 text-sm bg-surface border rounded-r-md ${protectedAccount || isSelf ? 'text-[var(--control-fg-disabled)] border-line cursor-not-allowed' : 'border-line-strong text-[var(--danger)] hover:bg-red-50'}`}
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
