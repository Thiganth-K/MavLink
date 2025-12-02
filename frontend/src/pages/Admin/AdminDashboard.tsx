import React, { useEffect, useMemo, useState, useRef } from 'react'
import { FiSearch } from 'react-icons/fi'

type Student = {
  regNumber: string
  name: string
  email?: string
  department?: string
  phone?: string
}

// Escape user input for use in RegExp
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
}

// Return a React node where substrings matching `query` are wrapped in a styled span
function highlightMatch(text: string | undefined, query?: string) {
  if (!text) return text || ''
  if (!query) return text
  const q = query.trim()
  if (!q) return text
  try {
    const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'i'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <span key={i} className="bg-yellow-100 text-yellow-900 px-1 rounded-sm font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  } catch {
    return text
  }
}


import { adminAPI } from '../../services/api';

const AdminDashboard: React.FC = () => {
    // Strictly filter batches for dashboard (if used)
    useEffect(() => {
      const fetchAssignedBatches = async () => {
        const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
        const all = await (await import('../../services/api')).batchAPI.getBatches();
        // Filter batches for validation purposes (respect many-to-many adminIds)
        const aid = adminInfo.adminId || '';
        all.filter(b => {
          const inAssigned = adminInfo.assignedBatchIds?.includes(b.batchId || '');
          const batchHasAdmin = Array.isArray(b.adminIds) ? b.adminIds.includes(aid) : b.adminId === aid;
          return inAssigned && batchHasAdmin;
        });
      };
      fetchAssignedBatches();
    }, []);
  const safeNavigate = (path: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    } catch (e) {
      // ignore
    }
  }

  // Always refresh admin profile and update localStorage before rendering dashboard
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const res = await adminAPI.getProfile();
        if (res && res.profile) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...user, assignedBatchIds: res.profile.assignedBatchIds, adminId: res.profile.adminId, username: res.profile.username }));
        }
      } catch {}
    };
    refreshProfile();
  }, []);

  const adminName = useMemo(() => {
    try {
      const maybe =
        localStorage.getItem('adminName') ||
        (() => {
          const raw = localStorage.getItem('admin')
          if (!raw) return ''
          try {
            const parsed = JSON.parse(raw)
            return parsed?.username || parsed?.name || parsed?.fullName || ''
          } catch {
            return ''
          }
        })() ||
        (() => {
          const raw = localStorage.getItem('user')
          if (!raw) return ''
          try {
            const parsed = JSON.parse(raw)
            return parsed?.username || parsed?.name || parsed?.fullName || ''
          } catch {
            return ''
          }
        })()
      return maybe || 'Admin'
    } catch {
      return 'Admin'
    }
  }, [])

  // Capitalize first letter for display
  const adminDisplayName = adminName ? `${adminName.charAt(0).toUpperCase()}${adminName.slice(1)}` : 'Admin'

  const [query, setQuery] = useState('')
  const [allStudents, setAllStudents] = useState<Student[] | null>(null)
  const [results, setResults] = useState<Student[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const [showTitle, setShowTitle] = useState(false)
  const [showStarsOverlay, setShowStarsOverlay] = useState(true)

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowTitle(true), 2200)
    const t2 = window.setTimeout(() => setShowStarsOverlay(false), 2600)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [])

  // Fetch all students once on mount and normalize fields
  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    // Use backend on localhost:3000 during development, otherwise use relative /api
    const hostIsLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const apiBase = hostIsLocal ? 'http://localhost:3000/api' : '/api'
    fetch(`${apiBase}/students`)
      .then((res) => res.ok ? res.json() : Promise.resolve([]))
      .then((data: any[]) => {
        if (!mounted) return
        const normalized = Array.isArray(data)
          ? data.map((s: any) => ({
              regNumber: s.regNumber || s.regno || s.registration || s.id || '',
              name: s.name || s.studentname || s.fullName || '',
              email: s.email || s.contactEmail || s.emailAddress || '',
              department: s.department || s.dept || s.batchId || '',
              phone: s.phone || s.phno || s.mobile || s.contact || '',
            }))
          : []

        setAllStudents(normalized)
      })
      .catch(() => {
        if (!mounted) return
        setAllStudents([])
      })
      .finally(() => {
        if (!mounted) return
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Live client-side filtering of the already-fetched student list
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (!query.trim()) {
      setResults(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = window.setTimeout(() => {
      const q = query.trim().toLowerCase()
      const source = allStudents || []
      const filtered = source.filter((s) => {
        const hay = `${s.regNumber || ''} ${s.name || ''} ${s.email || ''} ${s.department || ''} ${s.phone || ''}`.toLowerCase()
        return hay.includes(q)
      })
      setResults(filtered)
      setIsLoading(false)
    }, 250)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query, allStudents])

  

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="mx-auto max-w-3xl w-full animate-superIn text-black">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-6 text-center flex flex-col items-center justify-center gap-2">
          <span className="block uppercase text-center">
            WELCOME TO{' '}
              <div className="relative inline-block align-middle w-full max-w-[92vw] overflow-hidden">
                <span className={`inline-block text-lg sm:text-4xl sm:whitespace-nowrap leading-tight transition-opacity duration-300 ${showTitle ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">S</span>
                  <span className={`reveal-right ${showTitle ? 'reveal-start reveal-delay-1' : ''}`}>ONA </span>
                  <span className="text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">T</span>
                  <span className={`reveal-right ${showTitle ? 'reveal-start reveal-delay-2' : ''}`}>RAINING </span>
                  <span className="text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">A</span>
                  <span className={`reveal-right ${showTitle ? 'reveal-start reveal-delay-3' : ''}`}>TTENDANCE</span>
                  <span className="mobile-break-group">
                    <span className="text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">R</span>
                    <span className={`reveal-right ${showTitle ? 'reveal-start reveal-delay-4' : ''}`}>ECORDING </span>
                    <span className="text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">S</span>
                  <span className={`reveal-right ${showTitle ? 'reveal-start reveal-delay-5' : ''}`}>YSTEM,</span>
                  </span>
                  
                </span>
                {showStarsOverlay && (
                  <div className="admin-stars-overlay">
                    <div className="admin-stars-stage">
                      <span className="admin-stars-letter text-xl sm:text-4xl text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">S</span>
                      <span className="admin-stars-letter text-xl sm:text-4xl text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">T</span>
                      <span className="admin-stars-letter text-xl sm:text-4xl text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">A</span>
                      <span className="admin-stars-letter text-xl sm:text-4xl text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">R</span>
                      <span className="admin-stars-letter text-xl sm:text-4xl text-purple-700 bg-purple-100 px-0 py-0.5 rounded-sm font-bold">S</span>
                    </div>
                  </div>
                )}
              </div>
          </span>


          <style>{`
            .admin-stars-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
            .admin-stars-stage { position:relative; width: 100%; max-width: 100%; height: 2.2rem; }
            .admin-stars-letter { position:absolute; top:50%; left:50%; transform: translate(-50%, -50%); animation: admin-star-move 2.2s cubic-bezier(.2,.8,.2,1) forwards; line-height:1; }
            .admin-stars-letter:nth-child(1) { --x: 4%; }
            .admin-stars-letter:nth-child(2) { --x: 28%; }
            .admin-stars-letter:nth-child(3) { --x: 51%; }
            .admin-stars-letter:nth-child(4) { --x: 73%; }
            .admin-stars-letter:nth-child(5) { --x: 94%; }
            @media (min-width: 640px) {
              .admin-stars-stage { height: 3.2rem; }
              .admin-stars-letter:nth-child(1) { --x: 8%; }
              .admin-stars-letter:nth-child(2) { --x: 31%; }
              .admin-stars-letter:nth-child(3) { --x: 55%; }
              .admin-stars-letter:nth-child(4) { --x: 77%; }
              .admin-stars-letter:nth-child(5) { --x: 96%; }
            }
            @keyframes admin-star-move { to { left: var(--x); top: 50%; transform: translate(-50%, -50%); } }
            .reveal-right { display:inline-block; white-space:pre-wrap; clip-path: inset(0 100% 0 0); }
            .reveal-start { animation: admin-reveal 0.7s ease forwards; }
            .reveal-delay-1 { animation-delay: .05s; }
            .reveal-delay-2 { animation-delay: .15s; }
            .reveal-delay-3 { animation-delay: .25s; }
            .reveal-delay-4 { animation-delay: .35s; }
            .reveal-delay-5 { animation-delay: .45s; }
            @keyframes admin-reveal { to { clip-path: inset(0 0 0 0); } }
              /* Make grouped words break to a new line on small screens */
              .mobile-break-group { display:inline; }
              @media (max-width: 639px) {
                .mobile-break-group { display:block; width:100%; text-align:center; }
              }
          `}</style>
          <span className="inline-block border-b-2 border-fuchsia-700 text-fuchsia-700 px-1 font-semibold">
            {adminDisplayName}!!
          </span>
        </h2>

        <div className="flex gap-3 flex-wrap mb-6 justify-center items-center">
          <button
            onClick={() => safeNavigate('/admin-dashboard/mark-attendance')}
            className="inline-flex items-center px-4 py-2 bg-white text-fuchsia-700 rounded-full shadow-sm transition border border-fuchsia-700 hover:bg-fuchsia-50"
          >
            Mark Attendance
          </button>

          <button
            onClick={() => safeNavigate('/admin-dashboard/view-attendance')}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-800 rounded-full shadow-sm transition border border-black"
          >
            View Attendance
          </button>
        </div>

        <div className="mt-0 w-full flex justify-center">
          <div className="flex justify-center w-full">
            <div className="relative mx-auto w-full max-w-xl">
              <div className="search-wrapper px-2 py-1 bg-white/80 dark:bg-white/10 rounded-full shadow-sm w-full border border-black">
                <div className="flex items-center w-full">
                  <div className="pl-3 pr-2 text-violet-500">
                    <FiSearch className="w-5 h-5" />
                  </div>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        localStorage.setItem('adminSearchQuery', query);
                        window.location.href = '/admin-dashboard/view-students';
                      }
                    }}
                    placeholder="Search students by regno or name"
                    aria-label="Search students"
                    className="search-input flex-grow text-sm lg:text-base bg-transparent outline-none py-2"
                  />
                </div>
              </div>

              {/* Results table (styled like ViewStudents) - only show when user has typed */}
                {query.trim() && (
                <div className="mt-2 bg-white rounded-xl shadow-xl p-3 overflow-x-auto animate-popIn">
                  <table className="w-full border-collapse border border-violet-200">
                    <thead>
                      <tr className="bg-violet-100">
                        <th className="border border-violet-200 px-4 py-3 text-left text-violet-950 font-semibold">Reg Number</th>
                        <th className="border border-violet-200 px-4 py-3 text-left text-violet-950 font-semibold">Student Name</th>
                        <th className="border border-violet-200 px-4 py-3 text-left text-violet-950 font-semibold">Email</th>
                        <th className="border border-violet-200 px-4 py-3 text-left text-violet-950 font-semibold">Department</th>
                        <th className="border border-violet-200 px-4 py-3 text-left text-violet-950 font-semibold">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="border border-violet-200 px-4 py-8 text-center text-violet-600">Searching...</td>
                        </tr>
                      ) : results && results.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-violet-200 px-4 py-8 text-center text-violet-600">No results</td>
                        </tr>
                      ) : (
                        results && results.length > 0 && results.map((s) => (
                          <tr key={s.regNumber || s.name} className="hover:bg-violet-50 cursor-pointer" onClick={() => { localStorage.setItem('adminSearchQuery', s.regNumber || s.name || ''); window.location.href = '/admin-dashboard/view-students'; }}>
                            <td className="border border-violet-200 px-4 py-3 text-violet-900">{highlightMatch(s.regNumber, query)}</td>
                            <td className="border border-violet-200 px-4 py-3 text-violet-900">{highlightMatch(s.name, query)}</td>
                            <td className="border border-violet-200 px-4 py-3 text-violet-900">{highlightMatch(s.email || '', query)}</td>
                            <td className="border border-violet-200 px-4 py-3 text-violet-900">{highlightMatch(s.department || '', query)}</td>
                            <td className="border border-violet-200 px-4 py-3 text-violet-900">{highlightMatch(s.phone || '', query)}</td>
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
  )
}

export default AdminDashboard