'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import InitialsAvatar from '../ui/InitialsAvatar';
import AppearanceControls from './AppearanceControls';

/**
 * Header — hamburger toggle, Dashboard breadcrumb, and the account dropdown
 * which also holds the theme and density pickers.
 */
export default function Header({ user, onLogout, onToggleSidebar }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape, so the dropdown is dismissable without a pointer.
  useEffect(() => {
    if (!dropdownOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const userName = user?.name || 'User';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <nav
      className="flex items-center justify-between bg-surface border-b border-line px-4"
      style={{ height: '3.5rem' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded hover:bg-surface-hover text-fg-subtle hover:text-fg transition-colors cursor-pointer border-0 bg-transparent text-xl"
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list" aria-hidden="true" />
        </button>
        <Link
          href="/dashboard"
          className="hidden md:inline-block text-sm text-fg-muted hover:text-fg no-underline"
        >
          Dashboard
        </Link>
      </div>

      {/* Right side — account dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <InitialsAvatar name={userName} size={32} />
          <span className="hidden md:inline font-medium">{userName}</span>
          <i className="bi bi-chevron-down text-xs opacity-50" aria-hidden="true" />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 mt-2 bg-surface rounded-lg shadow-lg border border-line overflow-hidden"
            style={{ width: '17rem', zIndex: 50 }}
          >
            {/* Account summary */}
            <div className="bg-accent text-accent-fg p-4 text-center">
              <InitialsAvatar name={userName} size={56} className="mx-auto mb-2 shadow" />
              <p className="font-semibold text-sm mb-0">{userName}</p>
              {memberSince && (
                <p className="text-xs opacity-80 mt-0.5">Member since {memberSince}</p>
              )}
            </div>

            {/* Appearance */}
            <div className="p-3 border-t border-line">
              <AppearanceControls />
            </div>

            {/* Account actions */}
            <div className="flex items-center justify-between p-3 border-t border-line">
              <Link
                href="/profile"
                className="text-sm text-fg-muted hover:text-fg px-3 py-1.5 rounded hover:bg-surface-hover no-underline"
                onClick={() => setDropdownOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="text-sm text-fg-muted hover:text-fg px-3 py-1.5 rounded hover:bg-surface-hover cursor-pointer border-0 bg-transparent"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
