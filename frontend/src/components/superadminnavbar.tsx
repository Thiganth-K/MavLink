import React from 'react';

interface Props {
  onLogout: () => void;
}

export default function SuperAdminNavbar({ onLogout }: Props) {
  return (
    <nav className="w-full bg-blue-950 text-blue-50 shadow-xl mb-0 rounded-none py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold tracking-tight">MavLink</span>
          <span className="hidden sm:inline-block h-6 w-px bg-blue-600" />
          <span className="text-lg font-semibold">Super Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem('role');
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
