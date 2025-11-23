import React from 'react';

interface Props {
  onLogout: () => void;
}

export default function SuperAdminNavbar({ onLogout }: Props) {
  return (
    <nav className="w-full bg-supergreen text-supercream shadow-xl mb-0 rounded-none py-4 border-b border-supergreenDark">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold tracking-tight">MavLink</span>
          <span className="hidden sm:inline-block h-6 w-px bg-supergreenAccent" />
          <span className="text-lg font-semibold">Super Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem('role');
              try { localStorage.setItem('showLogoutAnimation', 'true'); } catch (e) {}
              window.location.href = '/';
            }}
            className="bg-red-600 hover:bg-red-700 transition-colors rounded-lg font-medium px-4 py-2"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
