'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { isProtectedUser } from './permissionRegistry';

/**
 * Shared Create/Edit form — mirrors the original ERP's
 * user-management/users/_form.blade.php: Name, Email, Phone, a Status
 * switch, Password (+confirmation), and a Roles checkbox grid. The
 * protected account's Status switch and Super Admin role checkbox are
 * disabled here as a UI hint, but the real guard is server-side — a
 * mismatch here (if the backend's protected email ever changes) only
 * costs a disabled control the user didn't need, never a bypass.
 */
export default function UserForm({ mode, user }) {
  const router = useRouter();
  const { user: currentUser } = useAuth(true);
  const isEdit = mode === 'edit';
  const isSelf = isEdit && currentUser && Number(currentUser.id) === Number(user.id);
  const isProtected = isEdit && isProtectedUser(user);

  const [roles, setRoles] = useState([]);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isActive, setIsActive] = useState(user ? !!user.is_active : true);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [roleIds, setRoleIds] = useState((user?.roles || []).map((r) => r.id));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/user-management/roles');
        setRoles(res.data || []);
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const toggleRole = (roleId, checked) => {
    if (isProtected && roles.find((r) => r.id === roleId)?.name === 'Super Admin') return;
    setRoleIds((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const payload = { name, email, phone, is_active: isActive, role_ids: roleIds };
      if (!isEdit || password) {
        payload.password = password;
        payload.password_confirmation = passwordConfirmation;
      }

      if (isEdit) {
        await apiClient.put(`/user-management/users/${user.id}`, payload);
      } else {
        await apiClient.post('/user-management/users', payload);
      }

      router.push('/user-management/users');
    } catch (err) {
      if (err.data?.errors) setFieldErrors(err.data.errors);
      setError(err.data?.error || err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-fg-subtle">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">Full Name <span className="text-[var(--danger)]">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className={`form-input ${fieldErrors.name ? 'border-red-400' : 'border-line-strong'}`} />
          {fieldErrors.name && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">Email Address <span className="text-[var(--danger)]">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className={`form-input ${fieldErrors.email ? 'border-red-400' : 'border-line-strong'}`} />
          {fieldErrors.email && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
            className={`form-input ${fieldErrors.phone ? 'border-red-400' : 'border-line-strong'}`} />
          {fieldErrors.phone && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">Status</label>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={isActive} disabled={isProtected || isSelf}
              onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-fg-muted">Active — the user can sign in</span>
          </label>
          {fieldErrors.is_active && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.is_active}</p>}
          {isProtected && <p className="text-xs text-fg-subtle mt-1"><i className="bi bi-shield-lock mr-1"></i>Protected system account.</p>}
          {isSelf && !isProtected && <p className="text-xs text-fg-subtle mt-1">You cannot deactivate your own account.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">
            Password {!isEdit && <span className="text-[var(--danger)]">*</span>}
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit}
            autoComplete="new-password"
            className={`form-input ${fieldErrors.password ? 'border-red-400' : 'border-line-strong'}`} />
          <p className="text-xs text-fg-subtle mt-1">{isEdit ? 'Leave blank to keep the current password.' : 'Minimum 8 characters, with letters and numbers.'}</p>
          {fieldErrors.password && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1">
            Confirm Password {!isEdit && <span className="text-[var(--danger)]">*</span>}
          </label>
          <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required={!isEdit}
            autoComplete="new-password"
            className={`form-input ${fieldErrors.password_confirmation ? 'border-red-400' : 'border-line-strong'}`} />
          {fieldErrors.password_confirmation && <p className="text-xs text-[var(--danger)] mt-1">{fieldErrors.password_confirmation}</p>}
        </div>
      </div>

      <hr className="my-4 border-line" />

      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-fg-muted">
          Roles <span className="text-[var(--danger)]">*</span>
        </label>
        <span className="text-xs text-fg-subtle">A user&apos;s permissions are the sum of all their roles.</span>
      </div>
      {fieldErrors.role_ids && <p className="text-xs text-[var(--danger)] mb-2">{fieldErrors.role_ids}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {roles.map((role) => {
          const disabled = isProtected && role.name === 'Super Admin';
          return (
            <label key={role.id} className={`border rounded p-2 flex items-start gap-2 ${disabled ? 'bg-surface-raised' : ''}`}>
              <input type="checkbox" checked={roleIds.includes(role.id)} disabled={disabled}
                onChange={(e) => toggleRole(role.id, e.target.checked)} className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-fg-muted">{role.name}</span>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-line">
        <button type="submit" disabled={saving} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
        <button type="button" onClick={() => router.push('/user-management/users')} className="border border-line-strong px-4 py-2 rounded text-sm text-fg-muted hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}
