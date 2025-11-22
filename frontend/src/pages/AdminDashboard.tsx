import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '../components/Footer';

import MarkAttendance from '../components/AdminDashboard/MarkAttendance';
import ViewAttendance from '../components/AdminDashboard/ViewAttendance';
import ViewStudents from '../components/AdminDashboard/ViewStudents';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'attendance' | 'mark'>('home');
  const [heroSearch, setHeroSearch] = useState('');

  // Check if user is authenticated as ADMIN (not SUPER_ADMIN)
  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    
    if (!user || role !== 'ADMIN') {
      toast.error('Access denied. Admin privileges required.');
      window.location.href = '/';
      return;
    }

    // Always show home on page load/refresh by clearing any hash
    try { window.location.hash = ''; } catch(e) {}
    setActiveTab('home');
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.setItem('showLogoutAnimation', 'true');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Navbar */}
      <nav className="bg-blue-950 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="text-2xl font-bold text-white">MavLink</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                View Students
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'attendance'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                View Attendance
              </button>
              <button
                onClick={() => setActiveTab('mark')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'mark'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                Mark Attendance
              </button>
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 flex-grow">
        {/* Home/Hero Section */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .animate-fadeIn {
                animation: fadeIn 0.6s ease-out;
              }
            `}</style>
            {/* Hero Section */}
            <div className="p-12 w-full">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-950 mb-4">
                  Welcome to MavLink Admin Dashboard
                </h1>
                <p className="text-xl text-blue-800 mb-8">
                  Manage students and track attendance efficiently
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setActiveTab('mark')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                  >
                    Mark Attendance
                  </button>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    View Attendance
                  </button>
                  <div className="flex items-center ml-4">
                    <input
                      type="search"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { localStorage.setItem('adminSearchQuery', heroSearch); setActiveTab('students'); } }}
                      placeholder="Search students by regno or name"
                      className="px-4 py-2 border border-blue-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
                    />
                    <button
                      onClick={() => { localStorage.setItem('adminSearchQuery', heroSearch); setActiveTab('students'); }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* Removed inline search/results — students handled in ViewStudents component */}
            </div>
          </div>
        )}

        {/* Student List Section */}
        {activeTab === 'students' && (
          <ViewStudents />
        )}

        {/* View Attendance Section (moved to component) */}
        {activeTab === 'attendance' && (
          <ViewAttendance />
        )}

        {/* Mark Attendance Section */}
        {activeTab === 'mark' && (
          <MarkAttendance />
        )}
      </div>
      
      <div className="mt-12">
        <Footer />
      </div>
    </div>
  );
}
