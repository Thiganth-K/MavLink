import { useEffect, useState } from 'react';
// toast not needed here
import type { Attendance, AttendanceSummary, CombinedAttendanceSummary } from '../../services/api';
import { formatDateForDisplay, formatTimestampIST } from '../../utils/dateUtils';
import { attendanceAPI, batchAPI } from '../../services/api';

function ViewAttendanceRow({ record }: { record: Attendance }) {
  const [showReason, setShowReason] = useState(false);

  return (
    <>
      <tr className="hover:bg-blue-50">
        <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.regno}</td>
        <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.studentname}</td>
        <td className="border border-blue-200 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {record.status === 'On-Duty' ? (
              <button
                onClick={() => setShowReason(s => !s)}
                className="px-3 py-1 rounded-full text-white font-semibold bg-yellow-500 hover:bg-yellow-600"
                aria-expanded={showReason}
                aria-label={showReason ? 'Hide On-Duty reason' : 'Show On-Duty reason'}
                title={showReason ? 'Hide On-Duty reason' : 'Show On-Duty reason'}
              >
                {showReason ? 'On-Duty • Hide' : 'On-Duty'}
              </button>
            ) : (
              <span className={`px-3 py-1 rounded-full text-white font-semibold ${
                record.status === 'Present' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {record.status}
              </span>
            )}
          </div>
        </td>
      </tr>

      {record.status === 'On-Duty' && showReason && (
        <tr>
          <td colSpan={3} className="border border-blue-200 px-4 py-2 text-sm text-yellow-800 bg-yellow-50">
            <strong>On-Duty Reason:</strong>&nbsp;{record.reason || '-'}
          </td>
        </tr>
      )}
    </>
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

  useEffect(() => {
    fetchAssignedBatches();
    fetchAttendanceSummary(30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAssignedBatches = async () => {
    try {
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const mine = all.filter(b => adminInfo.assignedBatchIds?.includes(b.batchId || ''));
      setAssignedBatches(mine);
      if (mine.length > 0) setActiveBatchId(mine[0].batchId || '');
    } catch (e: any) {
      // silently continue
    }
  };

  const fetchAttendanceSummary = async (days = 30) => {
    try {
      setIsLoading(true);
      const dates: string[] = [];
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      const resp = await attendanceAPI.getAttendanceByDateSummary(dates);
      setAttendanceSummary(resp.data || []);
    } catch (e: any) {
      console.error('Failed to load attendance summary', e);
      setAttendanceSummary([]);
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      const data: any = await attendanceAPI.getAttendanceByDate(date, activeBatchId || undefined);
      const fn = Array.isArray(data.FN) ? data.FN.map((e: any) => ({ ...e, session: 'FN' as const })) : [];
      const an = Array.isArray(data.AN) ? data.AN.map((e: any) => ({ ...e, session: 'AN' as const })) : [];
      const combined = [...fn, ...an];
      setAttendanceRecords(combined as Attendance[]);
    } catch (e) {
      console.error('Failed to load attendance details', e);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSummary = () => {
    setSelectedDateForDetail(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-950">Attendance Records</h2>
        {selectedDateForDetail && (
          <button
            onClick={handleBackToSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ← Back to Summary
          </button>
        )}
      </div>

      {!selectedDateForDetail ? (
        // Show cards summary
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-blue-800">Click on any date card to view detailed attendance</p>
            <div>
              <label className="text-blue-900 font-medium mr-2">Batch:</label>
              <select
                value={activeBatchId}
                onChange={(e) => { setActiveBatchId(e.target.value); fetchAttendanceSummary(30); }}
                className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All assigned batches</option>
                {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-blue-600">Loading attendance summary...</div>
          ) : attendanceSummary.length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl p-12 text-center">
              <p className="text-blue-600 text-lg">No attendance records found in the last 30 days</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCombinedSummary().map((summary) => (
                <div
                  key={summary.date}
                  onClick={() => handleCardClick(summary.date)}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-blue-100 hover:border-blue-400"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-blue-950">
                      {formatDateForDisplay(summary.date, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </h3>
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold">FN</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium text-xs">Total</span>
                        <span className="text-lg font-bold text-blue-950">{summary.fn.total}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-green-50 rounded-lg">
                        <span className="text-green-700 font-medium text-xs">P</span>
                        <span className="text-lg font-bold text-green-600">{summary.fn.present}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-red-50 rounded-lg">
                        <span className="text-red-700 font-medium text-xs">A</span>
                        <span className="text-lg font-bold text-red-600">{summary.fn.absent}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-700 font-medium text-xs">OD</span>
                        <span className="text-lg font-bold text-yellow-600">{summary.fn.onDuty}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">AN</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium text-xs">Total</span>
                        <span className="text-lg font-bold text-blue-950">{summary.an.total}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-green-50 rounded-lg">
                        <span className="text-green-700 font-medium text-xs">P</span>
                        <span className="text-lg font-bold text-green-600">{summary.an.present}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-red-50 rounded-lg">
                        <span className="text-red-700 font-medium text-xs">A</span>
                        <span className="text-lg font-bold text-red-600">{summary.an.absent}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-700 font-medium text-xs">OD</span>
                        <span className="text-lg font-bold text-yellow-600">{summary.an.onDuty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Show detailed attendance for selected date
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-blue-950 mb-4">
            Attendance Details for {formatDateForDisplay(selectedDateForDetail, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-lg">Forenoon (FN)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-blue-200">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg No</th>
                      <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Name</th>
                      <th className="border border-blue-200 px-4 py-3 text-center text-blue-950 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.filter(r => r.session === 'FN').length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">No FN attendance records found</td>
                      </tr>
                    ) : (
                      attendanceRecords
                        .filter(r => r.session === 'FN')
                        .sort((a, b) => (a.regno || '').localeCompare(b.regno || ''))
                        .map((record) => (
                          <ViewAttendanceRow key={record._id} record={record} />
                        ))
                    )}
                  </tbody>
                </table>
                {attendanceRecords.filter(r => r.session === 'FN').length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>Marked by: {attendanceRecords.find(r => r.session === 'FN')?.markedBy}</p>
                    <p>Marked at: {formatTimestampIST(attendanceRecords.find(r => r.session === 'FN')?.markedAt!)}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold text-lg">Afternoon (AN)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-blue-200">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg No</th>
                      <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Name</th>
                      <th className="border border-blue-200 px-4 py-3 text-center text-blue-950 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.filter(r => r.session === 'AN').length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">No AN attendance records found</td>
                      </tr>
                    ) : (
                      attendanceRecords
                        .filter(r => r.session === 'AN')
                        .sort((a, b) => (a.regno || '').localeCompare(b.regno || ''))
                        .map((record) => (
                          <ViewAttendanceRow key={record._id} record={record} />
                        ))
                    )}
                  </tbody>
                </table>
                {attendanceRecords.filter(r => r.session === 'AN').length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>Marked by: {attendanceRecords.find(r => r.session === 'AN')?.markedBy}</p>
                    <p>Marked at: {formatTimestampIST(attendanceRecords.find(r => r.session === 'AN')?.markedAt!)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
