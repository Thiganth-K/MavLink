import { useEffect, useState } from 'react';
// toast not needed here
import type { Attendance, AttendanceSummary, CombinedAttendanceSummary } from '../../services/api';
import { formatDateForDisplay, formatTimestampIST } from '../../utils/dateUtils';
import { attendanceAPI, batchAPI } from '../../services/api';
import ResponsiveTable from '../../components/Admin/ResponsiveTable';

function ViewAttendanceRow({ record }: { record: Attendance }) {
  const [showReason, setShowReason] = useState(false);

  return (
    <>
      <tr className="hover:bg-purple-50">
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base w-20 md:w-32">{record.regno}</td>
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base min-w-0 truncate">{record.studentname}</td>
        <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-center w-20 md:w-24">
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
            ) : (
              <span className={`px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-base rounded-full font-semibold border whitespace-nowrap ${
                record.status === 'Present' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600' : 'bg-red-50 text-red-700 border-red-600'
              }`}>
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

// Mobile toggle + responsive tables component
function MobileSessionToggleAndTables({ attendanceRecords }: { attendanceRecords: Attendance[] }) {
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');

    const renderSession = (session: 'FN' | 'AN') => {
    const records = attendanceRecords.filter(r => r.session === session);
    const headerBg = session === 'FN' ? 'bg-purple-100' : 'bg-purple-100';
    const badgeBg = session === 'FN' ? 'bg-purple-50 text-purple-700 border border-purple-600' : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600';

    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-4 py-2 rounded-lg font-bold text-lg ${badgeBg}`}>{session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}</span>
        </div>
        <div>
          <ResponsiveTable>
            <table className="min-w-[320px] w-full table-fixed border-collapse border border-purple-200">
              <thead>
                <tr className={headerBg}>
                  <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base w-20 md:w-32">Reg No</th>
                  <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base min-w-0">Name</th>
                  <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-center text-purple-950 font-semibold text-sm md:text-base w-20 md:w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-purple-200 px-2 py-6 md:px-4 md:py-8 text-center text-purple-600">No {session} attendance records found</td>
                  </tr>
                ) : (
                  records
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
              <p>Marked by: {records.find(r => r.session === session)?.markedBy}</p>
              <p>Marked at: {formatTimestampIST(records.find(r => r.session === session)?.markedAt!)}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* mobile toggle */}
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

      {/* mobile: single session view */}
      <div className="block md:hidden">
        {renderSession(selectedSession)}
      </div>

      {/* desktop/tablet: two-column view */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <div>{renderSession('FN')}</div>
        <div>{renderSession('AN')}</div>
      </div>
    </div>
  );
}

// component is self-contained; props interface removed
// Make ViewAttendance self-contained: fetch summary and details
export default function ViewAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedDateForDetail, setSelectedDateForDetail] = useState<string | null>(null);
  const [assignedBatches, setAssignedBatches] = useState<{ batchId?: string; batchName?: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchAssignedBatches();
    // initial fetch will happen after assigned batches are loaded (fetchAssignedBatches triggers it)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAssignedBatches = async () => {
    try {
      (window as any).showGlobalLoader?.('attendance-summary');
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const mine = all.filter(b => adminInfo.assignedBatchIds?.includes(b.batchId || ''));
      setAssignedBatches(mine);
      if (mine.length > 0) {
        const bid = mine[0].batchId || '';
        setActiveBatchId(bid);
        // fetch summary scoped to this batch immediately
        await fetchAttendanceSummary(30, bid);
      } else {
        await fetchAttendanceSummary(30, undefined);
      }
    } catch (e: any) {
      // silently continue
    } finally {
      (window as any).hideGlobalLoader?.();
    }
  };

  const buildDatesBetween = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const dates: string[] = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  const fetchAttendanceSummary = async (days = 30, batchId?: string, start?: string | null, end?: string | null) => {
    try {
      (window as any).showGlobalLoader?.('attendance-summary');
      setIsLoading(true);
      let dates: string[] = [];
      if (start && end) {
        // validate
        const sDate = new Date(start + 'T00:00:00');
        const eDate = new Date(end + 'T00:00:00');
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) {
          throw new Error('Invalid date range');
        }
        // limit to 180 days to avoid huge requests
        const diffDays = Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 180) throw new Error('Date range too large (max 180 days)');
        dates = buildDatesBetween(start, end);
      } else {
        const today = new Date();
        for (let i = 0; i < days; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dates.push(`${yyyy}-${mm}-${dd}`);
        }
        // Include tomorrow as well so attendance marked for the next day (e.g., future date selections) appears in the summary
        try {
          const tom = new Date();
          tom.setDate(tom.getDate() + 1);
          const tyyyy = tom.getFullYear();
          const tmm = String(tom.getMonth() + 1).padStart(2, '0');
          const tdd = String(tom.getDate()).padStart(2, '0');
          const tomStr = `${tyyyy}-${tmm}-${tdd}`;
          if (!dates.includes(tomStr)) dates.unshift(tomStr);
        } catch (err) {
          // ignore if date computation fails
        }
      }

      const resp = await attendanceAPI.getAttendanceByDateSummary(dates, batchId || activeBatchId || undefined);
      setAttendanceSummary(resp.data || []);
      // If the overlay is visible, force-hide it now that summary is set (avoid long overlay specifically for this page)
      (window as any).hideGlobalLoaderImmediate?.();
    } catch (e: any) {
      console.error('Failed to load attendance summary', e);
      setAttendanceSummary([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const getCombinedSummary = (): CombinedAttendanceSummary[] => {
    return attendanceSummary.map(s => ({
      date: s.date,
      fn: { total: s.FN.total, present: s.FN.present, absent: s.FN.absent, onDuty: s.FN.onDuty },
      an: { total: s.AN.total, present: s.AN.present, absent: s.AN.absent, onDuty: s.AN.onDuty }
    }));
  };

  const handleCardClick = async (date: string) => {
    try {
      setSelectedDateForDetail(date);
      (window as any).showGlobalLoader?.('attendance-detail');
      setIsLoading(true);
      const data: any = await attendanceAPI.getAttendanceByDate(date, activeBatchId || undefined);
      const fn = Array.isArray(data.FN) ? data.FN.map((e: any) => ({ ...e, session: 'FN' as const })) : [];
      const an = Array.isArray(data.AN) ? data.AN.map((e: any) => ({ ...e, session: 'AN' as const })) : [];
      const combined = [...fn, ...an];
      setAttendanceRecords(combined as Attendance[]);
      // hide overlay immediately after records set so cards can show without extra wait
      (window as any).hideGlobalLoaderImmediate?.();
    } catch (e) {
      console.error('Failed to load attendance details', e);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const handleBackToSummary = () => {
    setSelectedDateForDetail(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-purple-950">Attendance Records</h2>
        {selectedDateForDetail && (
          <button
            onClick={handleBackToSummary}
            className="px-4 py-2 bg-white text-purple-700 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
          >
            ← Back to Summary
          </button>
        )}
      </div>

      {!selectedDateForDetail ? (
        // Show cards summary
        <div>
          <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-purple-800">Click on any date card to view detailed attendance</p>
            <div className="w-full md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-purple-900 font-medium">Batch:</label>
                  <select
                    value={activeBatchId}
                    onChange={(e) => { const v = e.target.value; setActiveBatchId(v); fetchAttendanceSummary(30, v); }}
                    className="px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="">All assigned batches</option>
                    {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-purple-900 font-medium">From:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded" />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-purple-900 font-medium">To:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded" />
                    <button
                      onClick={() => fetchAttendanceSummary(0, activeBatchId || undefined, startDate || null, endDate || null)}
                      className="px-3 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded hover:bg-fuchsia-50 transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:ml-3">
                  <button onClick={() => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 6); setStartDate(s.toISOString().slice(0,10)); setEndDate(e.toISOString().slice(0,10)); fetchAttendanceSummary(0, activeBatchId || undefined, s.toISOString().slice(0,10), e.toISOString().slice(0,10)); }} className="px-2 py-1 bg-gray-100 rounded text-sm">Last 7</button>
                  <button onClick={() => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 29); setStartDate(s.toISOString().slice(0,10)); setEndDate(e.toISOString().slice(0,10)); fetchAttendanceSummary(0, activeBatchId || undefined, s.toISOString().slice(0,10), e.toISOString().slice(0,10)); }} className="px-2 py-1 bg-gray-100 rounded text-sm">Last 30</button>
                  <button onClick={() => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 89); setStartDate(s.toISOString().slice(0,10)); setEndDate(e.toISOString().slice(0,10)); fetchAttendanceSummary(0, activeBatchId || undefined, s.toISOString().slice(0,10), e.toISOString().slice(0,10)); }} className="px-2 py-1 bg-gray-100 rounded text-sm">Last 90</button>
                  <button onClick={() => { setStartDate(''); setEndDate(''); fetchAttendanceSummary(30, activeBatchId || undefined); }} className="px-2 py-1 bg-gray-50 rounded text-sm">Clear</button>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            // overlay loader handles the loading animation now — do not show textual loading
            <div className="text-center py-8" />
          ) : attendanceSummary.length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl p-12 text-center">
              <p className="text-purple-600 text-lg">No attendance records found in the last 30 days</p>
            </div>
          ) : (
            <div id="attendance-summary" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCombinedSummary().map((summary) => (
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
                    <div className="grid grid-cols-4 gap-1 sm:gap-2 min-w-0 overflow-x-auto">
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
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1 py-0.5 sm:px-2 sm:py-1 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 rounded text-xs font-bold">AN</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2 min-w-0 overflow-x-auto">
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
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Show detailed attendance for selected date
          <div id="attendance-detail" className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-purple-950 mb-4">
            Attendance Details for {formatDateForDisplay(selectedDateForDetail, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          {/* Mobile: toggle between FN/AN. Desktop/md+: show both side-by-side */}
          <MobileSessionToggleAndTables
            attendanceRecords={attendanceRecords}
          />
        </div>
      )}
      </div>
  );
}
