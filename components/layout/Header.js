'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/**
 * Header — faithful reproduction of the original Guru Traders ERP header.
 * Hamburger toggle, Dashboard breadcrumb, user dropdown with avatar.
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

  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <nav
      className="flex items-center justify-between bg-white border-b px-4"
      style={{ borderColor: 'var(--header-border)', height: '3.5rem' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Toggle sidebar"
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
        >
          <i className="bi bi-list"></i>
        </button>
        <Link
          href="/dashboard"
          className="hidden md:inline-block text-sm text-gray-600 hover:text-gray-900 no-underline"
        >
          Dashboard
        </Link>
      </div>

      {/* Right side — user dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <img
            src={avatarUrl}
            alt="User"
            className="rounded-full shadow-sm"
            style={{ width: 32, height: 32 }}
          />
          <span className="hidden md:inline font-medium">{userName}</span>
          <i className="bi bi-chevron-down text-xs opacity-50"></i>
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{ width: '16rem', zIndex: 50 }}
          >
            {/* User header */}
            <div className="bg-blue-600 text-white p-4 text-center">
              <img
                src={avatarUrl}
                alt="User"
                className="rounded-full shadow mx-auto mb-2"
                style={{ width: 56, height: 56 }}
              />
              <p className="font-semibold text-sm mb-0">{userName}</p>
              {memberSince && (
                <p className="text-xs opacity-80 mt-0.5">Member since {memberSince}</p>
              )}
            </div>
            {/* Menu footer */}
            <div className="flex items-center justify-between p-3 border-t border-gray-100">
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-50 no-underline"
                onClick={() => setDropdownOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-50"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
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
