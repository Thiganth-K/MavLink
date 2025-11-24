import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import type { Student } from '../../services/api';
 

import MarkAttendance from './MarkAttendance';
import ViewAttendance from './ViewAttendance';
import ViewStudents from './ViewStudents';
import { FiSearch, FiX } from 'react-icons/fi';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'attendance' | 'mark'>('home');
  const [heroSearch, setHeroSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const [displayName, setDisplayName] = useState('Admin');

  // Debounced live-search: query assigned students and show results below the input
  useEffect(() => {
    if (!heroSearch || !heroSearch.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      return;
    }

    setIsSearching(true);
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await studentAPI.searchStudents(heroSearch);
        setSearchResults(results || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [heroSearch]);

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

    // read username for hero greeting
    try {
      const u = user ? JSON.parse(user) : null;
      const rawName = (u && (u.username || u.name || u.adminId)) || 'Admin';
      const titleCased = String(rawName).split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ');
      setDisplayName(titleCased || 'Admin');
    } catch (e) {
      setDisplayName('Admin');
    }
  }, []);

  // Listen for in-app navigation events and hash changes so child components can request tab changes
  useEffect(() => {
    const onNavigate = (e: any) => {
      const target = (e && e.detail) || (window.location.hash ? window.location.hash.replace('#', '') : null);
      if (!target) return;
      if (target === 'attendance' || target === 'students' || target === 'mark' || target === 'home') {
        setActiveTab(target as any);
      }
    };

    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'attendance' || h === 'students' || h === 'mark' || h === 'home') setActiveTab(h as any);
    };

    window.addEventListener('navigate', onNavigate as EventListener);
    window.addEventListener('hashchange', onHash);

    // apply current hash if present
    onHash();

    return () => {
      window.removeEventListener('navigate', onNavigate as EventListener);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // handleLogout is provided by the app-level layout now

  // Global loader helpers are provided by the App-level layout so they are available across admin pages.

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col">
      <Toaster position="top-center" />
      {/* App-level global overlay loader is mounted in `App.tsx` so we don't duplicate it here */}
      
      {/* Navbar removed: App-level AdminNavbar will provide header */}

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
              /* Super in animation for hero title */
              @keyframes superIn {
                0% { opacity: 0; transform: translateY(14px) scale(.98); filter: blur(6px); }
                60% { opacity: 1; transform: translateY(-6px) scale(1.02); filter: blur(0); }
                100% { opacity: 1; transform: translateY(0) scale(1); filter: none; }
              }
              .animate-superIn { animation: superIn 520ms cubic-bezier(.2,.9,.2,1) both; }

              .hero-title { font-weight: 800; letter-spacing: -0.02em; }
              .hero-username { display: inline-block; padding: 0.12rem 0.5rem; border-radius: 0.5rem; background: linear-gradient(90deg,#fff7ed,#fff3b0); color: #1a2b4a; box-shadow: 0 6px 22px rgba(26,43,74,0.08); transform-origin: center; }
              .hero-username.sparkle { animation: popGlow 900ms ease-out; }
              @keyframes popGlow { 0% { transform: scale(.96); box-shadow: 0 0 0 rgba(255,243,186,0); } 60% { transform: scale(1.03); box-shadow: 0 10px 30px rgba(255,193,7,0.12); } 100% { transform: scale(1); box-shadow: 0 6px 18px rgba(26,43,74,0.06); } }
              @keyframes heroPop {
                from { opacity: 0; transform: translateY(12px) scale(.995); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              .animate-heroPop { animation: heroPop 0.45s cubic-bezier(.2,.9,.2,1) both; }

              @keyframes popIn {
                from { opacity: 0; transform: translateY(6px) scale(.997); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              .animate-popIn { animation: popIn 0.32s ease-out both; }

              /* Search bar styling (scoped) */
              .search-wrapper { display: flex; align-items: center; border-radius: 9999px; overflow: hidden; transition: box-shadow .15s ease, border-color .15s ease; }
              .search-wrapper { border: 2px solid rgba(59,130,246,0.24); }
              .search-wrapper:focus-within { box-shadow: 0 6px 20px rgba(14, 42, 88, 0.12); border-color: rgba(59,130,246,0.6); }
              .search-input { flex: 1; padding: 0.75rem 1rem; background: transparent; color: #0f172a; border: none; }
              .search-input::placeholder { color: rgba(59,130,246,0.5); }
              .search-input:focus { outline: none; }
              .search-btn { height: 100%; padding: 0 0.9rem; background-color: #2563eb; color: white; display: flex; align-items: center; justify-content: center; border: none; }
              .search-btn:hover { background-color: #1e40af; }
              .search-btn:focus { outline: 2px solid rgba(255,255,255,0.12); outline-offset: -2px; }

              .search-input:focus { box-shadow: none; }
            `}</style>
            {/* Hero Section */}
            <div className="p-12 w-full">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-950 mb-4 hero-title animate-superIn">
                  {(() => {
                    const tc = (s: string) => s.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ');
                    return tc('welcome to mavlink,');
                  })()}
                  &nbsp;
                  <span className="hero-username sparkle">{displayName}!!</span>
                </h1>
                <p className="text-xl text-blue-800 mb-8">
                  Manage students and track attendance efficiently
                </p>
                <div className="flex justify-center gap-4 flex-col items-center animate-heroPop">
                  <div className="flex gap-4">
                    <button
                      onClick={() => { window.location.href = '/admin-dashboard/mark-attendance'; }}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                    >
                      Mark Attendance
                    </button>
                    <button
                      onClick={() => { window.location.href = '/admin-dashboard/view-attendance'; }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                    >
                      View Attendance
                    </button>
                      <button
                        onClick={() => { window.location.href = '/admin-dashboard/chat'; }}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors shadow-lg"
                      >
                        Contact Superadmin
                      </button>
                  </div>

                  {/* Modern interactive search bar */}
                  <div className="mt-6 w-full max-w-3xl">
                    <div className="flex justify-center">
                      <div className="w-full relative">
                        <div className="search-wrapper px-2 bg-white/80 dark:bg-white/10 rounded-full shadow-sm">
                          <div className="flex items-center w-full">
                            <div className="pl-3 pr-2 text-blue-500">
                              <FiSearch className="w-5 h-5" />
                            </div>
                            <input
                              type="search"
                              value={heroSearch}
                              onChange={(e) => setHeroSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  localStorage.setItem('adminSearchQuery', heroSearch);
                                  window.location.href = '/admin-dashboard/view-students';
                                }
                              }}
                              placeholder="Search students by regno or name"
                              aria-label="Search students"
                              className="search-input flex-grow text-sm lg:text-base"
                            />
                            {heroSearch && (
                              <button
                                onClick={() => setHeroSearch('')}
                                className="search-btn ml-2 mr-1 rounded-full"
                                aria-label="Clear search"
                                title="Clear"
                                type="button"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Results table (styled like ViewStudents) - only show when user has typed */}
                        {heroSearch.trim() && (
                          <div className="mt-4 bg-white rounded-xl shadow-xl p-4 overflow-x-auto animate-popIn">
                            <table className="w-full border-collapse border border-blue-200">
                              <thead>
                                <tr className="bg-blue-100">
                                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg Number</th>
                                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Student Name</th>
                                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Email</th>
                                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Department</th>
                                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Phone</th>
                                </tr>
                              </thead>
                              <tbody>
                                {isSearching ? (
                                  <tr>
                                    <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">Searching...</td>
                                  </tr>
                                ) : !heroSearch.trim() ? (
                                  <tr>
                                    <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">Type to search students</td>
                                  </tr>
                                ) : searchResults.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">No results</td>
                                  </tr>
                                ) : (
                                  searchResults.map((s) => (
                                    <tr key={s._id || s.regno} className="hover:bg-blue-50 cursor-pointer" onClick={() => { localStorage.setItem('adminSearchQuery', s.regno || s.studentname || ''); window.location.href = '/admin-dashboard/view-students'; }}>
                                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{s.regno}</td>
                                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{s.studentname}</td>
                                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{s.email}</td>
                                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{s.dept}</td>
                                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{s.phno}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
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
      
      {/* Footer removed: App-level AdminFooter will provide footer */}
      {/* Profile drawer moved to app-level layout */}
    </div>
  );
}
