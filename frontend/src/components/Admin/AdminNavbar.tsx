//import React from 'react';

export default function AdminNavbar() {
  const firstLetter = (() => {
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      const name = (u && (u.username || u.name || u.adminId)) || 'A';
      return String(name)[0].toUpperCase();
    } catch (e) { return 'A'; }
  })();

  return (
    <nav className="bg-blue-950 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-2xl font-bold text-white">MavLink</span>
          </div>

          <div className="flex items-center gap-2">
            <a href="/admin-dashboard" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">Home</a>
            <a href="/admin-dashboard/view-students" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">View Students</a>
            <a href="/admin-dashboard/view-attendance" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">View Attendance</a>
            <a href="/admin-dashboard/mark-attendance" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">Mark Attendance</a>

            <button
              title="Profile"
              aria-label="Toggle profile"
              onClick={() => { try { window.dispatchEvent(new CustomEvent('toggleProfile')); } catch (e) {} }}
              className="ml-4 relative w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow-md"
            >
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">{firstLetter}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
