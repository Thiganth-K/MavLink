import { useState, useEffect, useRef } from 'react';
import { FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '../components/Footer';
import Loader from '../components/AdminDashboard/Loader';
import { studentAPI, batchAPI } from '../services/api';
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

  const handleLogout = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.setItem('showLogoutAnimation', 'true');
    window.location.href = '/';
  };

  // Profile modal state + data
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<{ username: string; password?: string | null; batches: Array<{ batchId?: string; batchName?: string; dept?: string; studentCount?: number }>; } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const openProfile = async () => {
    setShowProfile(true);
    if (profileData) return; // already loaded
    setProfileLoading(true);
    try {
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      const assignedIds: string[] = user.assignedBatchIds || [];

      // fetch all batches once and filter
      const all = await batchAPI.getBatches();
      const myBatches = all.filter(b => assignedIds.includes(b.batchId || ''));

      // For each batch, try to get student count from batch.students if present, otherwise fetch students
      const batchesWithCounts: Array<{ batchId?: string; batchName?: string; dept?: string; studentCount?: number }> = [];
      for (const b of myBatches) {
        let count = 0;
        if (Array.isArray((b as any).students) && (b as any).students.length >= 0) {
          count = (b as any).students.length;
        } else {
          try {
            const students = await studentAPI.getStudents(b.batchId);
            count = Array.isArray(students) ? students.length : 0;
          } catch (err) {
            count = 0;
          }
        }
        batchesWithCounts.push({ batchId: b.batchId, batchName: b.batchName, dept: (b as any).deptId || undefined, studentCount: count });
      }

      setProfileData({ username: user.username || user.adminId || 'Admin', password: user.password || null, batches: batchesWithCounts });
    } catch (e) {
      setProfileData({ username: 'Admin', password: null, batches: [] });
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => setShowProfile(false);

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
              {/* Profile icon replaces Logout in navbar; opens profile modal */}
              <button
                onClick={() => openProfile()}
                className="ml-4 p-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                title="Profile"
                aria-label="Open profile"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">{(displayName || 'A')[0].toUpperCase()}</div>
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
      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeProfile} />
          <div className="relative w-full max-w-md p-6 bg-white rounded-xl shadow-xl z-70">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-blue-950">Profile</h3>
              <button onClick={closeProfile} className="text-gray-600 hover:text-gray-800" aria-label="Close profile"><FiX className="w-5 h-5" /></button>
            </div>

            {profileLoading ? (
              <div className="py-8 text-center">Loading…</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Username</div>
                  <div className="text-blue-900 font-medium">{profileData?.username || 'Admin'}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Password</div>
                  <div className="flex items-center gap-2">
                    <input type={showPassword ? 'text' : 'password'} value={profileData?.password || ''} readOnly className="px-3 py-2 border border-blue-200 rounded-lg w-full bg-gray-50" />
                    <button
                      onClick={() => setShowPassword(s => !s)}
                      className="px-2 py-2 rounded-md bg-blue-50 text-blue-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(!profileData?.password) && <div className="text-xs text-gray-500 mt-1">Password not available to view</div>}
                </div>

                <div>
                  <div className="text-sm text-gray-600">Assigned Batches (Dept) — Students</div>
                  <div className="mt-2 space-y-2">
                    {profileData && profileData.batches.length === 0 && <div className="text-sm text-gray-600">No batches assigned</div>}
                    {profileData?.batches.map(b => (
                      <div key={b.batchId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-blue-900">{b.batchId} {b.batchName ? `- ${b.batchName}` : ''}</div>
                          <div className="text-xs text-gray-600">Dept: {b.dept || '-'}</div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">{b.studentCount ?? 0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button onClick={handleLogout} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"><FaSignOutAlt /> Logout</button>
                  <button onClick={closeProfile} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
