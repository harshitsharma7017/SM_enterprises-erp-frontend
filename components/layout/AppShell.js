'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Routes rendered without the sidebar and header. Everything else gets the
 * shell, including routes that do not exist yet.
 */
function isBareRoute(pathname) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/dev/') ||
    /^\/barcode\/codes\/[^/]+\/label\/?$/.test(pathname)
  );
}

/**
 * The sidebar, header and session check, mounted once from the root layout.
 *
 * Pages used to wrap themselves in DashboardLayout, so every navigation
 * unmounted the shell: the session was refetched behind a full-screen
 * spinner, and the sidebar lost its scroll position and collapsed state.
 * Mounted here it survives navigation and only `children` change.
 */
export default function AppShell({ children }) {
  const pathname = usePathname() || '/';
  if (isBareRoute(pathname)) return children;

  return (
    <AuthProvider>
      <Shell pathname={pathname}>{children}</Shell>
    </AuthProvider>
  );
}

function Shell({ pathname, children }) {
  const { user, loading, logout, can, canAny } = useAuth(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainRef = useRef(null);

  // Restore sidebar state from localStorage
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved === 'true') setSidebarCollapsed(true);
      } catch (e) { /* no persistence */ }
    });
  }, []);

  // The content pane is the scroll container and now outlives the page in it,
  // so a new page has to start at the top explicitly.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch (e) {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas" role="status" aria-live="polite">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)] mb-4" />
          <p className="text-fg-subtle font-medium text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
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
        <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
