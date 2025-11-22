import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '../components/Footer';
import Loader from '../components/AdminDashboard/Loader';
import { studentAPI } from '../services/api';
import type { Student } from '../services/api';
 

import MarkAttendance from '../components/AdminDashboard/MarkAttendance';
import ViewAttendance from '../components/AdminDashboard/ViewAttendance';
import ViewStudents from '../components/AdminDashboard/ViewStudents';

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

  const handleLogout = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.setItem('showLogoutAnimation', 'true');
    window.location.href = '/';
  };

  // Expose global show/hide helpers that toggle an overlay element by id
  useEffect(() => {
    // reference-counted loader to handle overlapping requests with a minimum display time
    let refCount = 0;
    const minMs = 300; // minimum overlay display time to avoid flicker
    let firstShownAt: number | null = null;

    (window as any).showGlobalLoader = () => {
      refCount = Math.max(0, refCount) + 1;
      const el = document.getElementById('global-loader');
      if (el) {
        el.style.display = 'flex';
        if (!firstShownAt) firstShownAt = Date.now();
      }
    };

    (window as any).hideGlobalLoader = () => {
      refCount = Math.max(0, refCount - 1);
      const el = document.getElementById('global-loader');
      if (!el) return;
      if (refCount === 0) {
        const elapsed = firstShownAt ? Date.now() - firstShownAt : minMs;
        const remaining = Math.max(0, minMs - elapsed);
        // Hide after remaining time and after two animation frames so React has painted cards
        setTimeout(() => {
          try {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => { el.style.display = 'none'; firstShownAt = null; });
            });
          } catch (e) {
            el.style.display = 'none';
            firstShownAt = null;
          }
        }, remaining);
      }
    };

    // Immediate hide helper (force hide overlay, reset counters) - for pages that need immediate hide
    (window as any).hideGlobalLoaderImmediate = () => {
      try {
        refCount = 0;
        firstShownAt = null;
        const el = document.getElementById('global-loader');
        if (el) el.style.display = 'none';
      } catch (e) {
        // ignore
      }
    };

    // hide on unmount
    return () => {
      try { delete (window as any).showGlobalLoader; delete (window as any).hideGlobalLoader; } catch(e) {}
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col">
      <Toaster position="top-center" />
      {/* Global overlay loader (hidden by default) */}
      <div id="global-loader" style={{ display: 'none' }} className="fixed inset-0 z-50 bg-black/40 items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          <Loader />
        </div>
      </div>
      
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

              .search-input:focus { box-shadow: 0 6px 20px rgba(14, 42, 88, 0.12); }
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
                  </div>

                  {/* Search bar below the two buttons */}
                  <div className="mt-6 w-full max-w-3xl">
                    <div className="flex w-full">
                      <input
                        type="search"
                        value={heroSearch}
                        onChange={(e) => setHeroSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { localStorage.setItem('adminSearchQuery', heroSearch); setActiveTab('students'); } }}
                        placeholder="Search students by regno or name"
                        className="search-input px-4 py-3 border border-blue-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none flex-grow"
                      />
                      <button
                        onClick={() => { localStorage.setItem('adminSearchQuery', heroSearch); setActiveTab('students'); }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors ml-3 shadow-sm"
                      >
                        Search
                      </button>
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
                              <tr key={s._id || s.regno} className="hover:bg-blue-50 cursor-pointer" onClick={() => { localStorage.setItem('adminSearchQuery', s.regno || s.studentname || ''); setActiveTab('students'); }}>
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
