'use client';

/**
 * The shell (sidebar, header, session check) now lives in AppShell, mounted
 * once from the root layout so it persists across navigation. Pages still wrap
 * themselves in this component; it renders their content unchanged.
 */
export default function DashboardLayout({ children }) {
  return children;
}
