import { useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import type { Attendance, AttendanceSummary, CombinedAttendanceSummary } from '../../services/api';
import { attendanceAPI, batchAPI, guestAPI, notificationAPI, type AttendanceStats, type Batch } from '../../services/api';
import { formatDateForDisplay, formatTimestampIST } from '../../utils/dateUtils';
import ResponsiveTable from '../../components/Admin/ResponsiveTable';
import GuestChatModal from '../../components/Guest/GuestChat';
import { FaComments, FaDownload, FaBars, FaSignOutAlt } from 'react-icons/fa';

function ViewAttendanceRow({ record }: { record: Attendance }) {
  const [showReason, setShowReason] = useState(false);

  return (
    <>
      <tr className="hover:bg-purple-50">
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base">{record.regno}</td>
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base">{record.studentname}</td>
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-center">
          <div className="flex flex-col items-center md:flex-row md:justify-center gap-2">
            {record.status === 'On-Duty' ? (
              <button
                onClick={() => setShowReason(s => !s)}
                className="px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-base rounded-full font-semibold bg-yellow-50 text-yellow-700 border border-yellow-600 hover:bg-yellow-100 whitespace-nowrap"
                aria-expanded={showReason}
                aria-label={showReason ? 'Hide On-Duty reason' : 'Show On-Duty reason'}
                title={showReason ? 'Hide On-Duty reason' : 'Show On-Duty reason'}
              >
                <span className="hidden md:inline">On-Duty</span>
                <span className="md:hidden">OD</span>
              </button>
            ) : record.status === 'Late' ? (
              <span className="px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-base rounded-full font-semibold bg-orange-50 text-orange-700 border border-orange-600 whitespace-nowrap">Late Comer</span>
            ) : record.status === 'Sick-Leave' ? (
              <span className="px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-base rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-600 whitespace-nowrap">Sick Leave</span>
            ) : (
              <span
                className={`px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-base rounded-full font-semibold border whitespace-nowrap ${
                  record.status === 'Present'
                    ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600'
                    : 'bg-red-50 text-red-700 border-red-600'
                }`}
              >
                <span className="hidden md:inline">{record.status}</span>
                <span className="md:hidden">{record.status === 'Present' ? 'P' : 'A'}</span>
              </span>
            )}
          </div>
        </td>
      </tr>

      {record.status === 'On-Duty' && showReason && (
        <tr>
          <td colSpan={3} className="border border-purple-200 px-2 py-1 md:px-4 md:py-2 text-sm text-yellow-800 bg-yellow-50">
            <strong>On-Duty Reason:</strong>&nbsp;{record.reason || '-'}
          </td>
        </tr>
      )}
    </>
  );
}

function MobileSessionToggleAndTables({ attendanceRecords }: { attendanceRecords: Attendance[] }) {
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');

  const renderSession = (session: 'FN' | 'AN') => {
    const records = attendanceRecords.filter(r => r.session === session);
    const headerBg = 'bg-purple-100';
    const badgeBg = session === 'FN'
      ? 'bg-purple-50 text-purple-700 border border-purple-600'
      : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600';

    const first = records[0];

    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-4 py-2 rounded-lg font-bold text-lg ${badgeBg}`}>{session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}</span>
        </div>

        <ResponsiveTable>
          <table className="min-w-[320px] w-full border-collapse border border-purple-200">
            <thead>
              <tr className={headerBg}>
                <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base">Reg No</th>
                <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base">Name</th>
                <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-center text-purple-950 font-semibold text-sm md:text-base">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-purple-200 px-2 py-6 md:px-4 md:py-8 text-center text-purple-600">No {session} attendance records found</td>
                </tr>
              ) : (
                records
                  .slice()
                  .sort((a, b) => (a.regno || '').localeCompare(b.regno || ''))
                  .map((record, idx) => (
                    <ViewAttendanceRow key={record._id ?? `${record.regno}-${session}-${idx}`} record={record} />
                  ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        {records.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <p>Marked by: {first?.markedBy || '-'}</p>
            <p>Marked at: {first?.markedAt ? formatTimestampIST(first.markedAt) : '-'}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4 md:hidden">
        <button
          className={`px-3 py-1 rounded-full font-semibold border ${selectedSession === 'FN' ? 'bg-purple-50 text-purple-700 border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedSession('FN')}
        >
          FN
        </button>
        <button
          className={`px-3 py-1 rounded-full font-semibold border ${selectedSession === 'AN' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setSelectedSession('AN')}
        >
          AN
        </button>
      </div>

      <div className="block md:hidden">{renderSession(selectedSession)}</div>

      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <div>{renderSession('FN')}</div>
        <div>{renderSession('AN')}</div>
      </div>
    </div>
  );
}

export default function GuestAttendance() {
  const NOTIF_POLL_MS = 15000;
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [summaryView, setSummaryView] = useState<'cards' | 'table'>('cards');
  const [selectedDateForDetail, setSelectedDateForDetail] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [openChat, setOpenChat] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const logout = () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('password');
      localStorage.setItem('showLogoutAnimation', 'true');
    } catch {}
    window.location.href = '/';
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    if (!user || role !== 'GUEST') {
      toast.error('Access denied. Guest login required.');
      window.location.href = '/';
      return;
    }

    try {
      const parsed = JSON.parse(user);
      if (parsed?.username) setGuestUsername(String(parsed.username));
    } catch {}

    const load = async () => {
      setIsLoadingMeta(true);
      try {
        const profileRes = await guestAPI.getProfile();
        if (profileRes?.profile?.username) setGuestUsername(String(profileRes.profile.username));
        const assignedIds = Array.isArray(profileRes?.profile?.assignedBatchIds) ? profileRes.profile.assignedBatchIds : [];

        const all = await batchAPI.getBatches();
        const filtered = assignedIds.length
          ? all.filter(b => assignedIds.includes(String(b.batchId || '').toUpperCase()))
          : all;

        setBatches(filtered);
        if (filtered.length > 0) {
          const first = String(filtered[0].batchId || '').toUpperCase();
          setActiveBatchId(first);
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load guest data');
        setBatches([]);
        setActiveBatchId('');
      } finally {
        setIsLoadingMeta(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    let cancelled = false;

    const loadNotifs = async () => {
      try {
        const all = await notificationAPI.list();
        const arr = Array.isArray(all) ? all : [];
        if (!cancelled) setUnreadNotifs(arr.filter((n: any) => !n.read).length);
      } catch (e) {
        if (!cancelled) setUnreadNotifs(0);
      }
    };

    loadNotifs();
    timer = window.setInterval(loadNotifs, NOTIF_POLL_MS) as unknown as number;
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const activeBatch = useMemo(() => batches.find(b => String(b.batchId || '').toUpperCase() === String(activeBatchId).toUpperCase()) || null, [batches, activeBatchId]);

  useEffect(() => {
    const loadStats = async () => {
      if (!activeBatchId) {
        setStats([]);
        return;
      }
      setIsLoadingStats(true);
      try {
        const res = await attendanceAPI.getAttendanceStats(undefined, undefined, activeBatchId);
        const sorted = Array.isArray(res)
          ? res.slice().sort((a, b) => String(a.regno || '').localeCompare(String(b.regno || '')))
          : [];
        setStats(sorted);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to fetch attendance statistics');
        setStats([]);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [activeBatchId]);

  const buildLastNDates = (days: number) => {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  const getCombinedSummary = useMemo((): CombinedAttendanceSummary[] => {
    return attendanceSummary.map(s => ({
      date: s.date,
      fn: {
        total: s.FN.total,
        present: s.FN.present,
        absent: s.FN.absent,
        onDuty: s.FN.onDuty,
        late: (s.FN as any).late ?? 0,
        sickLeave: (s.FN as any).sickLeave ?? 0
      },
      an: {
        total: s.AN.total,
        present: s.AN.present,
        absent: s.AN.absent,
        onDuty: s.AN.onDuty,
        late: (s.AN as any).late ?? 0,
        sickLeave: (s.AN as any).sickLeave ?? 0
      }
    }));
  }, [attendanceSummary]);

  useEffect(() => {
    const loadSummary = async () => {
      if (!activeBatchId) {
        setAttendanceSummary([]);
        setSelectedDateForDetail(null);
        setAttendanceRecords([]);
        return;
      }
      setIsLoadingSummary(true);
      try {
        const dates = buildLastNDates(30);
        const resp = await attendanceAPI.getAttendanceByDateSummary(dates, activeBatchId);
        setAttendanceSummary(resp?.data || []);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load attendance records');
        setAttendanceSummary([]);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    loadSummary();
    // reset detail when batch changes
    setSelectedDateForDetail(null);
    setAttendanceRecords([]);
  }, [activeBatchId]);

  const handleCardClick = async (date: string) => {
    if (!activeBatchId) return;
    setSelectedDateForDetail(date);
    setIsLoadingDetail(true);
    try {
      const data: any = await attendanceAPI.getAttendanceByDate(date, activeBatchId);
      const fn = Array.isArray(data?.FN) ? data.FN.map((e: any) => ({ ...e, session: 'FN' as const })) : [];
      const an = Array.isArray(data?.AN) ? data.AN.map((e: any) => ({ ...e, session: 'AN' as const })) : [];
      setAttendanceRecords([...(fn as Attendance[]), ...(an as Attendance[])]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load attendance details');
      setAttendanceRecords([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToSummary = () => {
    setSelectedDateForDetail(null);
  };

  // Export is now available via the Export page (navigate to /guest/export)

  return (
    <div className="min-h-screen bg-white p-6">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-white rounded-xl shadow border border-purple-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-purple-950">Welcome{guestUsername ? `, ${guestUsername}` : ''}</h1>
              <div className="mt-2">
                <div className="text-lg font-semibold text-purple-950">Explore your department Attendance here, </div>
                <p className="text-sm text-gray-600 mt-1">Select an allotted batch to view each student&apos;s attendance percentage.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop actions */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setOpenChat(true)}
                  className="relative px-3 py-2 bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50 rounded flex items-center gap-2"
                >
                  <FaComments className="w-4 h-4" />
                  <span>Chat</span>
                  {unreadNotifs > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {unreadNotifs}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { window.location.href = '/guest/export'; }}
                  className="relative px-3 py-2 bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50 rounded flex items-center gap-2"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile menu toggle (absolute top-right) */}
              <div className="md:hidden">
                <button onClick={() => setShowMobileMenu(s => !s)} className="absolute right-4 top-4 inline-flex items-center px-3 py-2 bg-white text-fuchsia-700 rounded-full shadow-sm transition border border-fuchsia-700 z-50">
                  <FaBars className="w-5 h-5" />
                </button>
                {showMobileMenu && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowMobileMenu(false)} />
                    <aside className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl p-6 transform transition-transform z-50">
                      <div className="flex flex-col h-full">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-lg font-bold text-purple-950">Menu</h3>
                          <button onClick={() => setShowMobileMenu(false)} className="px-2 py-1 text-gray-600 rounded hover:bg-gray-100">Close</button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <button onClick={() => { setShowMobileMenu(false); window.location.href = '/guest/export'; }} className="w-full text-left px-4 py-3 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 flex items-center gap-3"><FaDownload className="w-4 h-4" /> <span>Export</span></button>
                          <button onClick={() => { setShowMobileMenu(false); setOpenChat(true); }} className="w-full text-left px-4 py-3 rounded-lg bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 flex items-center gap-3"><FaComments className="w-4 h-4" /> <span>Chat</span> {unreadNotifs > 0 && <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{unreadNotifs}</span>}</button>
                        </div>
                        <div className="mt-4">
                          <button onClick={() => { setShowMobileMenu(false); logout(); }} className="w-full text-left px-4 py-3 text-red-600 rounded-lg border border-red-100 hover:bg-red-50 flex items-center gap-3"><FaSignOutAlt className="w-4 h-4"/> <span>Logout</span></button>
                        </div>
                      </div>
                    </aside>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {openChat && <GuestChatModal onClose={() => setOpenChat(false)} />}

        <div className="bg-white rounded-xl shadow p-5 border border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-purple-950 mb-1 font-medium">Batch</label>
              <div className="flex items-center gap-4">
                <select
                  value={activeBatchId}
                  onChange={(e) => setActiveBatchId(String(e.target.value).toUpperCase())}
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:outline-none"
                  disabled={isLoadingMeta || batches.length === 0}
                >
                  {batches.length === 0 ? (
                    <option value="">No allotted batches</option>
                  ) : (
                    batches.map(b => (
                      <option key={String(b._id || b.batchId)} value={String(b.batchId || '').toUpperCase()}>
                        {b.batchName ? String(b.batchName) : String(b.batchId || '').toUpperCase()}
                      </option>
                    ))
                  )}
                </select>

                <div className="text-sm text-gray-700">
                  <div className="font-semibold text-purple-950">Selected</div>
                  <div className="max-w-[280px] truncate">{activeBatch ? (activeBatch.batchName ? String(activeBatch.batchName) : String(activeBatch.batchId || '').toUpperCase()) : '-'}</div>
                </div>
              </div>
            </div>

          
          </div>
          
        </div>

        {/* Attendance Records (cards/table like Admin ViewAttendance) */}
        <div className="mt-6 bg-white rounded-xl shadow border border-purple-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-purple-950">Attendance Records</h2>
              {!selectedDateForDetail && <div className="text-sm text-gray-600">Click a date to view FN/AN details.</div>}
            </div>

            <div className="flex items-center gap-2">
              {selectedDateForDetail ? (
                <button
                  onClick={handleBackToSummary}
                  className="px-3 py-2 bg-white text-purple-700 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                >
                  ← Back
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSummaryView('cards')}
                    className={`px-3 py-2 rounded-lg border font-medium ${summaryView === 'cards' ? 'bg-purple-50 text-purple-700 border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryView('table')}
                    className={`px-3 py-2 rounded-lg border font-medium ${summaryView === 'table' ? 'bg-purple-50 text-purple-700 border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Table
                  </button>
                  
                </>
              )}
            </div>
          </div>

          <div className="p-5">
            {!activeBatchId ? (
              <div className="py-10 text-center text-gray-600">Select a batch to view records</div>
            ) : isLoadingSummary ? (
              <div className="py-10 text-center text-gray-600">Loading…</div>
            ) : !selectedDateForDetail ? (
              getCombinedSummary.length === 0 ? (
                <div className="py-10 text-center text-gray-600">No attendance records found (last 30 days)</div>
              ) : summaryView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getCombinedSummary.map((summary) => (
                    <button
                      key={summary.date}
                      type="button"
                      onClick={() => handleCardClick(summary.date)}
                      aria-label={`View attendance details for ${formatDateForDisplay(summary.date)}`}
                      className="w-full min-w-0 text-left bg-white rounded-xl shadow-lg p-3 md:p-5 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-purple-100 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 break-words"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base md:text-lg font-bold text-purple-950 truncate">
                          {formatDateForDisplay(summary.date, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </h3>
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1 py-0.5 sm:px-2 sm:py-1 bg-purple-50 text-purple-700 border border-purple-600 rounded text-xs font-bold">FN</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 sm:gap-2 min-w-0 overflow-x-auto">
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-gray-100 border border-gray-300 rounded-md w-full min-w-0">
                            <span className="text-gray-700 font-medium text-xxs sm:text-xs">Total</span>
                            <span className="text-sm md:text-base font-bold text-purple-950 truncate">{summary.fn.total}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-purple-50 border border-purple-600 rounded-md w-full min-w-0">
                            <span className="text-purple-700 font-medium text-xxs sm:text-xs">P</span>
                            <span className="text-sm md:text-base font-bold text-purple-700 truncate">{summary.fn.present}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-red-50 border border-red-600 rounded-md w-full min-w-0">
                            <span className="text-red-700 font-medium text-xxs sm:text-xs">A</span>
                            <span className="text-sm md:text-base font-bold text-red-700 truncate">{summary.fn.absent}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-yellow-50 border border-yellow-600 rounded-md w-full min-w-0">
                            <span className="text-yellow-700 font-medium text-xxs sm:text-xs">OD</span>
                            <span className="text-sm md:text-base font-bold text-yellow-700 truncate">{summary.fn.onDuty}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-orange-50 border border-orange-600 rounded-md w-full min-w-0">
                            <span className="text-orange-700 font-medium text-xxs sm:text-xs">Late</span>
                            <span className="text-sm md:text-base font-bold text-orange-700 truncate">{(summary as any).fn.late ?? 0}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-blue-50 border border-blue-600 rounded-md w-full min-w-0">
                            <span className="text-blue-700 font-medium text-xxs sm:text-xs">Sick</span>
                            <span className="text-sm md:text-base font-bold text-blue-700 truncate">{(summary as any).fn.sickLeave ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1 py-0.5 sm:px-2 sm:py-1 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 rounded text-xs font-bold">AN</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 sm:gap-2 min-w-0 overflow-x-auto">
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-gray-100 border border-gray-300 rounded-md w-full min-w-0">
                            <span className="text-gray-700 font-medium text-xxs sm:text-xs">Total</span>
                            <span className="text-sm md:text-base font-bold text-purple-950 truncate">{summary.an.total}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-purple-50 border border-purple-600 rounded-md w-full min-w-0">
                            <span className="text-purple-700 font-medium text-xxs sm:text-xs">P</span>
                            <span className="text-sm md:text-base font-bold text-purple-700 truncate">{summary.an.present}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-red-50 border border-red-600 rounded-md w-full min-w-0">
                            <span className="text-red-700 font-medium text-xxs sm:text-xs">A</span>
                            <span className="text-sm md:text-base font-bold text-red-700 truncate">{summary.an.absent}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-yellow-50 border border-yellow-600 rounded-md w-full min-w-0">
                            <span className="text-yellow-700 font-medium text-xxs sm:text-xs">OD</span>
                            <span className="text-sm md:text-base font-bold text-yellow-700 truncate">{summary.an.onDuty}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-orange-50 border border-orange-600 rounded-md w-full min-w-0">
                            <span className="text-orange-700 font-medium text-xxs sm:text-xs">Late</span>
                            <span className="text-sm md:text-base font-bold text-orange-700 truncate">{(summary as any).an.late ?? 0}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 bg-blue-50 border border-blue-600 rounded-md w-full min-w-0">
                            <span className="text-blue-700 font-medium text-xxs sm:text-xs">Sick</span>
                            <span className="text-sm md:text-base font-bold text-blue-700 truncate">{(summary as any).an.sickLeave ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[960px] w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Date</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN Total</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN P</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN A</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN OD</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN Late</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">FN Sick</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN Total</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN P</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN A</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN OD</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN Late</th>
                        <th className="text-right px-3 py-3 text-purple-950 font-semibold border-b border-purple-100">AN Sick</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCombinedSummary
                        .slice()
                        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                        .map(s => (
                          <tr
                            key={s.date}
                            className="hover:bg-purple-50 cursor-pointer"
                            onClick={() => handleCardClick(s.date)}
                            role="button"
                            tabIndex={0}
                          >
                            <td className="px-4 py-3 border-b border-purple-50 text-purple-950">{formatDateForDisplay(s.date)}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.fn.total}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.fn.present}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.fn.absent}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.fn.onDuty}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{(s as any).fn.late ?? 0}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{(s as any).fn.sickLeave ?? 0}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.an.total}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.an.present}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.an.absent}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{s.an.onDuty}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{(s as any).an.late ?? 0}</td>
                            <td className="px-3 py-3 border-b border-purple-50 text-right">{(s as any).an.sickLeave ?? 0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-purple-950">
                    Attendance Details for {formatDateForDisplay(selectedDateForDetail, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                </div>

                {isLoadingDetail ? (
                  <div className="py-10 text-center text-gray-600">Loading…</div>
                ) : (
                  <MobileSessionToggleAndTables attendanceRecords={attendanceRecords} />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow border border-purple-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-950">Attendance Percentage</h2>
            <div className="text-sm text-gray-600">{isLoadingStats ? 'Loading…' : `${stats.length} students`}</div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[720px] w-full border-collapse">
              <thead>
                <tr className="bg-purple-50">
                  <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Reg No</th>
                  <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Name</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">% Attendance</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Present</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Absent</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">On-Duty</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Late</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Sick Leave</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {!activeBatchId ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-600">Select a batch to view stats</td>
                  </tr>
                ) : stats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-600">No attendance stats found</td>
                  </tr>
                ) : (
                  stats.map((s) => (
                    <tr key={String(s.regno || s._id)} className="hover:bg-purple-50">
                      <td className="px-4 py-3 border-b border-purple-50 text-purple-950">{s.regno}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-purple-950">{s.studentname}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right font-semibold text-purple-950">{Number(s.attendancePercentage || 0).toFixed(2)}%</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.present}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.absent}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.onDuty}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.late || 0}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.sickLeave || 0}</td>
                      <td className="px-4 py-3 border-b border-purple-50 text-right">{s.totalClasses}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
