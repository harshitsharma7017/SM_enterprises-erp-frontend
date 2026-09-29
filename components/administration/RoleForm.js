'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import PermissionMatrix from './PermissionMatrix';
import { isSystemRole } from './permissionRegistry';

/**
 * Shared Create/Edit form — mirrors the original ERP's roles/create.blade.php
 * and roles/edit.blade.php (same fields, same permission matrix). Saving is
 * two calls against the Node API: the role's own name via
 * POST/PUT /user-management/roles[/:id], then its permission set via
 * POST /user-management/permissions/sync — the original does both in one
 * RoleService::create()/update() transaction, but the Node backend only
 * exposes them as two endpoints (see Phase A/B). Super Admin's permissions
 * are never synced — its matrix is shown fully checked and disabled,
 * matching RoleService::update()'s "permissions come from a bypass" skip.
 */
export default function RoleForm({ mode, role }) {
  const router = useRouter();
  const [name, setName] = useState(role?.name || '');
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState((role?.permissions || []).map((p) => p.name));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/user-management/permissions');
        setPermissions(res.data || []);
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const isSystem = mode === 'edit' && isSystemRole(role?.name);
  const isSuperAdmin = role?.name === 'Super Admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      let roleId = role?.id;
      if (mode === 'create') {
        const res = await apiClient.post('/user-management/roles', { name });
        roleId = res.data.id;
      } else {
        await apiClient.put(`/user-management/roles/${roleId}`, { name });
      }

      if (!isSuperAdmin) {
        const permissionIds = permissions.filter((p) => selected.includes(p.name)).map((p) => p.id);
        await apiClient.post('/user-management/permissions/sync', { role_id: roleId, permission_ids: permissionIds });
      }

      router.push('/user-management/roles');
    } catch (err) {
      if (err.data?.errors) setFieldErrors(err.data.errors);
      setError(err.data?.error || err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-fg-subtle">Loading permissions...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium text-fg-muted mb-1">Role Name <span className="text-[var(--danger)]">*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSystem}
          className={`form-input ${fieldErrors.name ? 'border-red-400' : 'border-line-strong'} ${isSystem ? 'bg-surface-raised text-fg-subtle' : ''}`}
        />
        {fieldErrors.name && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.name}</p>}
        {isSystem && <p className="text-xs text-fg-subtle mt-1"><i className="bi bi-shield-lock mr-1"></i>System role — name is fixed.</p>}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-fg-muted">Permissions</label>
        {isSuperAdmin && <span className="text-xs text-fg-subtle">Super Admin always has every permission — this matrix is fixed.</span>}
      </div>
      {fieldErrors.permissions && <p className="text-xs text-[var(--danger)] mb-2">{fieldErrors.permissions}</p>}

      <PermissionMatrix
        permissions={permissions}
        selected={isSuperAdmin ? permissions.map((p) => p.name) : selected}
        onChange={setSelected}
        readonly={isSuperAdmin}
      />

      <div className="flex gap-2 mt-4 pt-3 border-t border-line">
        <button type="submit" disabled={saving} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
        </button>
        <button type="button" onClick={() => router.push('/user-management/roles')} className="border border-line-strong px-4 py-2 rounded text-sm text-fg-muted hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}
