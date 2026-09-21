'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }) {
  const { user, loading, logout, can, canAny } = useAuth(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore sidebar state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
    } catch (e) { /* no persistence */ }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch (e) {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar
        can={can}
        canAny={canAny}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={logout}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6" style={{ background: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
