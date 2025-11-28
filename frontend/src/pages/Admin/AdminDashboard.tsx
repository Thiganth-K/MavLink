import React, { useEffect, useMemo, useState, useRef } from 'react'

type Student = {
  regNumber: string
  name: string
  email?: string
  department?: string
  phone?: string
}

const toTitleCase = (s: string) => {
  return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

const AdminDashboard: React.FC = () => {
  const safeNavigate = (path: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    } catch (e) {
      // ignore
    }
  }

  const adminName = useMemo(() => {
    try {
      const maybe =
        localStorage.getItem('adminName') ||
        (() => {
          const raw = localStorage.getItem('admin')
          if (!raw) return ''
          try {
            const parsed = JSON.parse(raw)
            return parsed?.name || parsed?.fullName || ''
          } catch {
            return ''
          }
        })() ||
        (() => {
          const raw = localStorage.getItem('user')
          if (!raw) return ''
          try {
            const parsed = JSON.parse(raw)
            return parsed?.name || parsed?.fullName || ''
          } catch {
            return ''
          }
        })()
      return maybe || 'Admin'
    } catch {
      return 'Admin'
    }
  }, [])

  const title = toTitleCase('welcome to mavlink')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Student[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const activeFetchRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // live search: debounce and fetch
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
      // abort previous
      if (activeFetchRef.current) activeFetchRef.current.abort()
      const ac = new AbortController()
      activeFetchRef.current = ac

      // Try to fetch search results from API, fallback to empty
      fetch(`/api/students?search=${encodeURIComponent(query)}`, { signal: ac.signal })
        .then((res) => {
          if (!res.ok) throw new Error('Network error')
          return res.json()
        })
        .then((data) => {
          // Expecting an array of students; normalize if needed
          if (Array.isArray(data)) {
            setResults(
              data.map((s: any) => ({
                regNumber: s.regNumber || s.reg || s.registration || s.id || '',
                name: s.name || s.fullName || '',
                email: s.email || s.contactEmail || '',
                department: s.department || s.dept || '',
                phone: s.phone || s.mobile || s.contact || '',
              }))
            )
          } else {
            setResults([])
          }
        })
        .catch(() => {
          if (ac.signal.aborted) return
          setResults([])
        })
        .finally(() => {
          setIsLoading(false)
          activeFetchRef.current = null
        })
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (activeFetchRef.current) activeFetchRef.current.abort()
    }
  }, [query])

  const onSubmitSearch = (q: string) => {
    const trimmed = q.trim()
    localStorage.setItem('adminSearchQuery', trimmed)
    safeNavigate('/admin-dashboard/view-students')
  }

  const onRowClick = (s: Student) => {
    const key = s.regNumber || s.name
    if (key) localStorage.setItem('adminSearchQuery', key)
    safeNavigate('/admin-dashboard/view-students')
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto animate-superIn">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 sm:p-8 lg:flex lg:items-center lg:justify-between">
          <div className="lg:flex-1">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              <span className="animate-popIn">{title}</span>
              <span className="text-indigo-600 ml-2">{adminName}</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Quick actions and student search</p>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => safeNavigate('/admin-dashboard/mark-attendance')}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-sm transition"
              >
                Mark Attendance
              </button>

              <button
                onClick={() => safeNavigate('/admin-dashboard/view-attendance')}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-full shadow-sm transition"
              >
                View Attendance
              </button>
            </div>
          </div>

          <div className="mt-6 lg:mt-0 lg:ml-6 lg:w-1/2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitSearch(query)
                }}
                placeholder="Search students by reg number or name"
                className="w-full pl-11 pr-4 py-3 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Search students"
              />
            </div>

            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-3">
                {(!query || !query.trim()) && (
                  <div className="text-sm text-gray-500">Type a registration number or name to search students.</div>
                )}

                {query && (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="px-3 py-2">Reg Number</th>
                          <th className="px-3 py-2">Student Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Department</th>
                          <th className="px-3 py-2">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {isLoading && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500 animate-pulse">Loading results...</td>
                          </tr>
                        )}

                        {!isLoading && results && results.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No results</td>
                          </tr>
                        )}

                        {!isLoading && results && results.length > 0 && results.map((s) => (
                          <tr key={s.regNumber || s.email || s.name} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer animate-popIn" onClick={() => onRowClick(s)}>
                            <td className="px-3 py-2 align-middle">{s.regNumber}</td>
                            <td className="px-3 py-2 align-middle">{s.name}</td>
                            <td className="px-3 py-2 align-middle">{s.email}</td>
                            <td className="px-3 py-2 align-middle">{s.department}</td>
                            <td className="px-3 py-2 align-middle">{s.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard