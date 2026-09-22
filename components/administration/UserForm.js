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
    return <div className="p-4 text-gray-500">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className={`w-full px-3 py-2 border rounded text-sm ${fieldErrors.name ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className={`w-full px-3 py-2 border rounded text-sm ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
            className={`w-full px-3 py-2 border rounded text-sm ${fieldErrors.phone ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={isActive} disabled={isProtected || isSelf}
              onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Active — the user can sign in</span>
          </label>
          {fieldErrors.is_active && <p className="text-xs text-red-600 mt-1">{fieldErrors.is_active}</p>}
          {isProtected && <p className="text-xs text-gray-400 mt-1"><i className="bi bi-shield-lock mr-1"></i>Protected system account.</p>}
          {isSelf && !isProtected && <p className="text-xs text-gray-400 mt-1">You cannot deactivate your own account.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password {!isEdit && <span className="text-red-500">*</span>}
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit}
            autoComplete="new-password"
            className={`w-full px-3 py-2 border rounded text-sm ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'}`} />
          <p className="text-xs text-gray-400 mt-1">{isEdit ? 'Leave blank to keep the current password.' : 'Minimum 8 characters, with letters and numbers.'}</p>
          {fieldErrors.password && <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password {!isEdit && <span className="text-red-500">*</span>}
          </label>
          <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required={!isEdit}
            autoComplete="new-password"
            className={`w-full px-3 py-2 border rounded text-sm ${fieldErrors.password_confirmation ? 'border-red-400' : 'border-gray-300'}`} />
          {fieldErrors.password_confirmation && <p className="text-xs text-red-600 mt-1">{fieldErrors.password_confirmation}</p>}
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">
          Roles <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-gray-400">A user&apos;s permissions are the sum of all their roles.</span>
      </div>
      {fieldErrors.role_ids && <p className="text-xs text-red-600 mb-2">{fieldErrors.role_ids}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {roles.map((role) => {
          const disabled = isProtected && role.name === 'Super Admin';
          return (
            <label key={role.id} className={`border rounded p-2 flex items-start gap-2 ${disabled ? 'bg-gray-50' : ''}`}>
              <input type="checkbox" checked={roleIds.includes(role.id)} disabled={disabled}
                onChange={(e) => toggleRole(role.id, e.target.checked)} className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{role.name}</span>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
        <button type="button" onClick={() => router.push('/user-management/users')} className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
