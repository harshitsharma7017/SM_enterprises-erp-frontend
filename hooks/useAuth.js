'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState(null);
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
    } catch(e) {
      console.warn('Backend logout failed, proceeding with local logout', e);
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, logout };
}
