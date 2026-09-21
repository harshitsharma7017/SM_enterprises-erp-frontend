'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    
    const token = localStorage.getItem('auth_token');
    if (!token && requireAuth) {
      router.push('/login');
      return;
    }
    
    if (token) {
      apiClient.get('/auth/me')
        .then(res => {
          if (mounted && res.data && res.data.user) {
            setUser(res.data.user);
            // Extract permissions from user's roles
            const perms = [];
            if (res.data.user.roles) {
              res.data.user.roles.forEach(role => {
                if (role.permissions) {
                  role.permissions.forEach(p => {
                    if (!perms.includes(p.name)) perms.push(p.name);
                  });
                }
              });
            }
            setPermissions(perms);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Session restore failed:', err.message);
          localStorage.removeItem('auth_token');
          if (requireAuth) {
            router.push('/login');
          }
          setTimeout(() => { setTimeout(() => { if (mounted) setLoading(false); }, 0); }, 0);
        });
    } else {
      setTimeout(() => { if (mounted) setLoading(false); }, 0);
    }
    
    return () => { mounted = false; };
  }, [requireAuth, router]);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed, proceeding with local logout', e);
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    setPermissions([]);
    router.push('/login');
  };

  const can = useCallback((permission) => {
    if (!user) return false;
    // Super Admin can do everything
    if (user.roles && user.roles.some(r => r.name === 'Super Admin')) return true;
    return permissions.includes(permission);
  }, [user, permissions]);

  const canAny = useCallback((permissionList) => {
    return permissionList.some(p => can(p));
  }, [can]);

  return { user, loading, login, logout, can, canAny, permissions };
}
