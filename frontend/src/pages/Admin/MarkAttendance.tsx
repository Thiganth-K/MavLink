import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle } from 'react-icons/fi';
import { studentAPI, attendanceAPI, batchAPI, type Student, type Attendance } from '../../services/api';
import { getTodayIST, formatDateForDisplay } from '../../utils/dateUtils';
import ResponsiveTable from '../../components/Admin/ResponsiveTable';

import { adminAPI } from '../../services/api';

export default function MarkAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsBatchId, setStudentsBatchId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave' }>({});
  const [attendanceReasons, setAttendanceReasons] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ present: number; absent: number; onDuty: number; late: number; sickLeave: number; total: number } | null>(null);
  const [assignedBatches, setAssignedBatches] = useState<{ batchId?: string; batchName?: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');
  const [attendanceStats, setAttendanceStats] = useState<{ [regno: string]: { percentage: number; combinedPercentage: number; present: number; absent: number; onDuty: number; late: number; sickLeave: number; total: number; effectiveTotal: number } }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Always refresh admin profile and update localStorage before loading batches
    const refreshProfileAndBatches = async () => {
      try {
        const res = await adminAPI.getProfile();
        if (res && res.profile) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...user, assignedBatchIds: res.profile.assignedBatchIds, adminId: res.profile.adminId, username: res.profile.username }));
        }
      } catch {}
      await fetchAssignedBatches();
    };
    refreshProfileAndBatches();
  }, []);

  useEffect(() => {
    // Fetch session-specific attendance only when the students list matches the active batch.
    // This prevents accidental "cross-batch" percentages/records (especially when regnos overlap)
    // during the brief interval while switching batches.
    if (!activeBatchId) {
      setAttendanceRecords([]);
      setAttendanceMap({});
      setAttendanceReasons({});
      setAttendanceStats({});
      return;
    }
    if (studentsBatchId !== activeBatchId) return;
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSession, activeBatchId, studentsBatchId]);

  const fetchAssignedBatches = async () => {
    try {
      (window as any).showGlobalLoader?.('markattendance-data');
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const aid = adminInfo.adminId || '';
      // Only show batches where batchId is in assignedBatchIds and the batch lists this admin
      const mine = all.filter(b => {
        const inAssigned = adminInfo.assignedBatchIds?.includes(b.batchId || '');
        const batchHasAdmin = Array.isArray(b.adminIds) ? b.adminIds.includes(aid) : b.adminId === aid;
        return inAssigned && batchHasAdmin;
      });
      setAssignedBatches(mine);
      if (mine.length > 0) {
        const first = mine[0].batchId || '';
        setActiveBatchId(first);
        await fetchStudents(first);
      } else {
        setActiveBatchId('');
        setStudentsBatchId('');
        setStudents([]);
        setAttendanceRecords([]);
        setAttendanceMap({});
        setAttendanceReasons({});
        setAttendanceStats({});
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load batches');
    } finally {
      (window as any).hideGlobalLoader?.();
    }
  };

  const fetchStudents = async (batchId?: string) => {
    try {
      (window as any).showGlobalLoader?.('markattendance-data');
      setIsLoading(true);
      let studentList;
      if (!batchId) studentList = await studentAPI.getAssignedStudents();
      else studentList = await studentAPI.getStudents(batchId);
      studentList.sort((a: Student, b: Student) => (a.regno || '').localeCompare(b.regno || ''));
      setStudentsBatchId(batchId || '');
      setStudents(studentList);
      // Fetch cumulative stats after loading students
      await fetchAttendanceStats(batchId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch students');
      setStudentsBatchId(batchId || '');
      setStudents([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const fetchAttendance = async () => {
    try {
      (window as any).showGlobalLoader?.('markattendance-data');
      setIsLoading(true);
      const allowedRegnos = new Set(students.map(s => (s.regno || '').toUpperCase()));

      // Hard guard: never fetch without a concrete batchId, and never "show all" when students haven't loaded.
      if (!activeBatchId || studentsBatchId !== activeBatchId || allowedRegnos.size === 0) {
        setAttendanceRecords([]);
        setAttendanceMap({});
        setAttendanceReasons({});
        return;
      }

      const sessionRecords = await attendanceAPI.getAttendanceByDateAndSession(selectedDate, selectedSession, activeBatchId);
      const filtered = sessionRecords.filter((r: any) => allowedRegnos.has((r.regno || '').toUpperCase()));
      setAttendanceRecords(filtered);

      const newAttendanceMap: { [key: string]: 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave' } = {};
      const newAttendanceReasons: { [key: string]: string } = {};
      filtered.forEach((record: any) => {
        newAttendanceMap[record.studentId] = record.status as 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave';
        if ((record as any).reason) newAttendanceReasons[record.studentId] = (record as any).reason;
      });
      setAttendanceMap(newAttendanceMap);
      setAttendanceReasons(newAttendanceReasons);
      // Refresh stats as attendance may have changed earlier
      await fetchAttendanceStats(activeBatchId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch attendance');
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const fetchAttendanceStats = async (batchId?: string) => {
    try {
      if (!batchId) {
        setAttendanceStats({});
        return;
      }

      const stats = await attendanceAPI.getAttendanceStats(undefined, undefined, batchId);
      const map: { [regno: string]: { percentage: number; combinedPercentage: number; present: number; absent: number; onDuty: number; late: number; sickLeave: number; total: number; effectiveTotal: number } } = {};
      stats.forEach(s => {
        const reg = (s.regno || '').toUpperCase();
        const total = s.totalClasses || 0;
        const present = s.present || 0;
        const absent = s.absent || 0;
        const onDuty = s.onDuty || 0;
        const late = (s as any).late || 0;
        const sickLeave = (s as any).sickLeave || 0;
        const effectiveTotal = Math.max(0, total - sickLeave);

        // Keep both fields for UI; combinedPercentage matches backend attendancePercentage rule
        const percentage = effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 1000) / 10 : 0;
        const combinedPercentage = typeof (s as any).attendancePercentage === 'number'
          ? Math.round(((s as any).attendancePercentage) * 10) / 10
          : (effectiveTotal > 0 ? Math.round(((present + onDuty) / effectiveTotal) * 1000) / 10 : 0);

        map[reg] = { percentage, combinedPercentage, present, absent, onDuty, late, sickLeave, total, effectiveTotal };
      });
      setAttendanceStats(map);
    } catch (err: any) {
      // Non-fatal; show toast once
      toast.error(err.message || 'Failed to load attendance percentages');
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave') => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    if (status !== 'On-Duty') {
      setAttendanceReasons(prev => {
        if (!(studentId in prev)) return prev;
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceReasons(prev => ({ ...prev, [studentId]: reason }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave' } = {};
    students.forEach(student => { allPresent[student._id!] = 'Present'; });
    setAttendanceMap(allPresent);
    toast.success('Marked all students as Present');
  };

  const handleMarkAllAbsent = () => {
    const allAbsent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' | 'Late' | 'Sick-Leave' } = {};
    students.forEach(student => { allAbsent[student._id!] = 'Absent'; });
    setAttendanceMap(allAbsent);
    toast.success('Marked all students as Absent');
  };

  const handleClearAll = () => {
    setAttendanceMap({});
    setAttendanceReasons({});
    toast.success('Cleared all attendance selections');
  };

  const handleSubmit = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const attendanceData = students.map(student => ({
      studentId: student._id!,
      regno: student.regno!,
      studentname: student.studentname!,
      status: attendanceMap[student._id!] || 'Absent',
      reason: attendanceMap[student._id!] === 'On-Duty' ? (attendanceReasons[student._id!] || '') : undefined
    }));

    const missingReason = attendanceData.find(a => a.status === 'On-Duty' && (!a.reason || !a.reason.trim()));
    if (missingReason) {
      toast.error('Please provide a reason for all On-Duty entries before submitting.');
      return;
    }

    try {
      (window as any).showGlobalLoader?.('markattendance-data');
      setIsLoading(true);
      await attendanceAPI.markAttendance(attendanceData, user.username, activeBatchId, selectedSession, selectedDate);
      const summary = {
        total: students.length,
        present: attendanceData.filter(a => a.status === 'Present').length,
        absent: attendanceData.filter(a => a.status === 'Absent').length,
        onDuty: attendanceData.filter(a => a.status === 'On-Duty').length,
        late: attendanceData.filter(a => a.status === 'Late').length,
        sickLeave: attendanceData.filter(a => a.status === 'Sick-Leave').length,
      };
      // clear local selections
      setAttendanceMap({});
      setAttendanceReasons({});
      // refresh attendance list
      await fetchAttendance();
      // scroll the section into view, then pop-up the summary modal
      try {
        const el = containerRef?.current || document.querySelector('.bg-white.rounded-xl');
        if (el && (el as HTMLElement).scrollIntoView) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {}
      // show modal after a short delay so scroll has started
      setTimeout(() => {
        setSubmittedSummary(summary);
        setShowSummary(true);
        toast.success(`${selectedSession} Attendance marked successfully for ${formatDateForDisplay(selectedDate)}`);
      }, 300);
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark attendance');
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
    setSubmittedSummary(null);
    setAttendanceMap({});
  };

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-xl p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-purple-950">Mark Attendance - {selectedSession === 'FN' ? 'Forenoon Session' : 'Afternoon Session'}</h2>
          {attendanceRecords.length > 0 ? (
            <div>
              <p className="text-sm text-orange-600 mt-1 font-medium flex items-center gap-2"><FiAlertTriangle className="text-orange-600" aria-hidden />{selectedSession} attendance already marked for {formatDateForDisplay(selectedDate)}.</p>
              <p className="text-sm text-orange-600 mt-1 font-medium">You can update it in below!!</p>
            </div>
          ) : (
            <p className="text-sm text-purple-600 mt-1 font-medium">✓ No {selectedSession} attendance marked yet for {formatDateForDisplay(selectedDate)}</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center mt-4 md:mt-0">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <label className="text-purple-900 font-medium">Date:</label>
            <div className="relative w-full md:w-auto">
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto pr-2 px-2 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Open date picker"
                onClick={() => { const el = dateInputRef.current as any; if (!el) return; if (typeof el.showPicker === 'function') el.showPicker(); else el.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 p-1"
              >
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-full md:w-auto">
            <button onClick={() => setSelectedSession('FN')} className={`flex-1 md:flex-none text-center px-4 py-2 rounded-lg font-semibold transition-colors border ${selectedSession === 'FN' ? 'bg-purple-50 text-purple-700 border-purple-600 shadow-md' : 'bg-white text-gray-700 border-transparent hover:bg-gray-200'}`}>FN</button>
            <button onClick={() => setSelectedSession('AN')} className={`flex-1 md:flex-none text-center px-4 py-2 rounded-lg font-semibold transition-colors border ${selectedSession === 'AN' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600 shadow-md' : 'bg-white text-gray-700 border-transparent hover:bg-gray-200'}`}>AN</button>
          </div>

          <div className="w-full md:w-auto">
            <select value={activeBatchId} onChange={(e) => { setActiveBatchId(e.target.value); fetchStudents(e.target.value); }} className="w-full md:w-auto px-4 py-2 border border-purple-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
              {assignedBatches.length === 0 && <option value="">No batches assigned</option>}
              {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <button onClick={handleSubmit} disabled={isLoading} className="w-full md:w-auto px-6 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 font-semibold">{isLoading ? 'Submitting...' : (attendanceRecords.length > 0 ? `Update ${selectedSession} Attendance` : `Submit ${selectedSession} Attendance`)}</button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1" />
        <button onClick={handleMarkAllPresent} className="w-full sm:w-auto px-4 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors font-medium text-sm">Mark All Present</button>
        <button onClick={handleMarkAllAbsent} className="w-full sm:w-auto px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">Mark All Absent</button>
        <button onClick={handleClearAll} className="w-full sm:w-auto px-4 py-2 bg-white text-gray-600 border border-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">Clear All</button>
      </div>

        {students.length === 0 ? (
        <ResponsiveTable
          mobileView={<div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-purple-100 text-center text-purple-800">No students found</div>
          </div>}
        >
          <table className="min-w-[720px] w-full border-collapse border border-purple-200">
            <tbody>
              <tr>
                <td colSpan={5} className="border border-purple-200 px-4 py-8 text-center text-purple-800">No students found</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      ) : (
        <ResponsiveTable
          mobileView={(
            <div className="space-y-3">
              {students.map((student) => {
                const reg = (student.regno || '').toUpperCase();
                const stat = attendanceStats[reg];
                const pct = stat ? stat.combinedPercentage : null;
                let pctCls = 'bg-gray-100 text-gray-700 border border-gray-400';
                if (pct !== null) {
                  if (pct >= 75) pctCls = 'bg-purple-50 text-purple-700 border border-purple-600';
                  else if (pct >= 60) pctCls = 'bg-yellow-50 text-yellow-700 border border-yellow-600';
                  else if (pct >= 40) pctCls = 'bg-orange-50 text-orange-700 border border-orange-600';
                  else pctCls = 'bg-red-50 text-red-700 border border-red-600';
                }

                return (
                  <div key={student._id} className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-purple-900">{student.regno} — {student.studentname}</div>
                        <div className="text-sm text-gray-600">{student.dept}</div>
                        <div className="mt-2">
                          {pct === null ? <span className="text-gray-400 text-sm">--</span> : (
                            <span className={`inline-block min-w-[60px] px-2 py-1 rounded-full text-xs font-semibold ${pctCls}`}>{pct.toFixed(1)}%</span>
                          )}
                        </div>
                      </div>

                      <div className="w-full overflow-x-auto show-scrollbar">
                        <div className="min-w-max inline-grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                          <button onClick={() => handleAttendanceChange(student._id!, 'Present')} className={`w-full sm:w-auto px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Present' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Present</button>
                          <button onClick={() => handleAttendanceChange(student._id!, 'Absent')} className={`w-full sm:w-auto px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Absent' ? 'bg-red-50 text-red-700 border-red-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Absent</button>
                          <button onClick={() => handleAttendanceChange(student._id!, 'On-Duty')} className={`w-full sm:w-auto px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'On-Duty' ? 'bg-yellow-50 text-yellow-700 border-yellow-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>OD</button>
                          <button onClick={() => handleAttendanceChange(student._id!, 'Late')} className={`w-full sm:w-auto px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Late Comer</button>
                          <button onClick={() => handleAttendanceChange(student._id!, 'Sick-Leave')} className={`w-full sm:w-auto px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Sick-Leave' ? 'bg-blue-50 text-blue-700 border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Sick Leave</button>
                        </div>
                      </div>

                    </div>

                    {attendanceMap[student._id!] === 'On-Duty' && (
                      <div className="mt-3">
                        <input type="text" value={attendanceReasons?.[student._id!] || ''} onChange={(e) => handleReasonChange(student._id!, e.target.value)} placeholder="Reason for On-Duty (required)" className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:outline-none" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        >
          <table id="markattendance-data" className="min-w-[720px] w-full border-collapse border border-purple-200">
            <thead>
              <tr className="bg-purple-100">
                <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Reg Number</th>
                <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Student Name</th>
                <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Department</th>
                <th className="border border-purple-200 px-4 py-3 text-center text-purple-950 font-semibold">Attd %</th>
                <th className="border border-purple-200 px-4 py-3 text-center text-purple-950 font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-purple-50">
                  <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.regno}</td>
                  <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.studentname}</td>
                  <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.dept}</td>
                  <td className="border border-purple-200 px-4 py-3 text-center">
                    {(() => {
                      const reg = (student.regno || '').toUpperCase();
                      const stat = attendanceStats[reg];
                      if (!stat) return <span className="text-gray-400 text-sm">--</span>;
                      const pct = stat.combinedPercentage; // Present + On-Duty, calculated over (Total - Sick Leave)
                      let cls = 'bg-gray-100 text-gray-700 border border-gray-400';
                      if (pct >= 75) cls = 'bg-purple-50 text-purple-700 border border-purple-600';
                      else if (pct >= 60) cls = 'bg-yellow-50 text-yellow-700 border border-yellow-600';
                      else if (pct >= 40) cls = 'bg-orange-50 text-orange-700 border border-orange-600';
                      else cls = 'bg-red-50 text-red-700 border border-red-600';
                      return (
                        <span
                          title={`Present: ${stat.present} | On-Duty: ${stat.onDuty} | Late: ${stat.late} | Sick Leave: ${stat.sickLeave} | Absent: ${stat.absent} | Total: ${stat.total} | Effective Total: ${stat.effectiveTotal} | Attendance: ${pct.toFixed(1)}%`}
                          className={`inline-block min-w-[60px] px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${cls}`}
                        >{pct.toFixed(1)}%</span>
                      );
                    })()}
                  </td>
                  <td className="border border-purple-200 px-4 py-3">
                    <div className="w-full overflow-x-auto show-scrollbar">
                      <div className="min-w-max inline-grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:justify-center">
                        <button onClick={() => handleAttendanceChange(student._id!, 'Present')} className={`w-full sm:w-auto px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Present' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Present</button>
                        <button onClick={() => handleAttendanceChange(student._id!, 'Absent')} className={`w-full sm:w-auto px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Absent' ? 'bg-red-50 text-red-700 border-red-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Absent</button>
                        <button onClick={() => handleAttendanceChange(student._id!, 'On-Duty')} className={`w-full sm:w-auto px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'On-Duty' ? 'bg-yellow-50 text-yellow-700 border-yellow-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>On-Duty</button>
                        <button onClick={() => handleAttendanceChange(student._id!, 'Late')} className={`w-full sm:w-auto px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Late Comer</button>
                        <button onClick={() => handleAttendanceChange(student._id!, 'Sick-Leave')} className={`w-full sm:w-auto px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm rounded-lg font-semibold border ${attendanceMap[student._id!] === 'Sick-Leave' ? 'bg-blue-50 text-blue-700 border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>Sick Leave</button>
                      </div>
                    </div>
                    {attendanceMap[student._id!] === 'On-Duty' && (
                      <div className="mt-2">
                        <input type="text" value={attendanceReasons?.[student._id!] || ''} onChange={(e) => handleReasonChange(student._id!, e.target.value)} placeholder="Reason for On-Duty (required)" className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:outline-none" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 font-semibold text-lg shadow-lg">{isLoading ? 'Submitting...' : (attendanceRecords.length > 0 ? `Update ${selectedSession} Attendance` : `Submit ${selectedSession} Attendance`)}</button>
      </div>

      {showSummary && submittedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeSummary} />

          <div className="relative w-full max-w-3xl p-6">
            <div className="bg-white rounded-xl shadow-xl p-6 border-2 border-purple-200 transform origin-center animate-modalIn">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-purple-950 mb-1">✓ {selectedSession} Attendance Submitted Successfully</h3>
                  <p className="text-purple-700 text-sm">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'} attendance for <span className="font-semibold">{formatDateForDisplay(selectedDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <button onClick={closeSummary} className="text-gray-600 hover:text-gray-800 bg-transparent rounded-md px-2 py-1">✕</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-gray-600 font-medium mb-1">Total</div>
                  <div className="text-3xl font-bold text-purple-950">{submittedSummary.total}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-green-700 font-medium mb-1">Present</div>
                  <div className="text-3xl font-bold text-green-600">{submittedSummary.present}</div>
                  <div className="text-sm text-gray-600 mt-1">{((submittedSummary.present / submittedSummary.total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-red-700 font-medium mb-1">Absent</div>
                  <div className="text-3xl font-bold text-red-600">{submittedSummary.absent}</div>
                  <div className="text-sm text-gray-600 mt-1">{((submittedSummary.absent / submittedSummary.total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-yellow-700 font-medium mb-1">On-Duty</div>
                  <div className="text-3xl font-bold text-yellow-600">{submittedSummary.onDuty}</div>
                  <div className="text-sm text-gray-600 mt-1">{((submittedSummary.onDuty / submittedSummary.total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-orange-700 font-medium mb-1">Late Comer</div>
                  <div className="text-3xl font-bold text-orange-600">{submittedSummary.late}</div>
                  <div className="text-sm text-gray-600 mt-1">{((submittedSummary.late / submittedSummary.total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-blue-700 font-medium mb-1">Sick Leave</div>
                  <div className="text-3xl font-bold text-blue-600">{submittedSummary.sickLeave}</div>
                  <div className="text-sm text-gray-600 mt-1">{((submittedSummary.sickLeave / submittedSummary.total) * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={closeSummary} className="px-6 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium">Mark New Attendance</button>
                <button
                  onClick={() => { window.location.href = '/admin-dashboard/view-attendance'; }}
                  className="px-6 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors font-semibold"
                  aria-label="View all attendance records"
                >
                  View All Records
                </button>
              </div>
            </div>

            <style>{`
              @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
              .animate-modalIn { animation: modalIn 260ms cubic-bezier(.2,.9,.2,1) both; }
            `}</style>
          </div>
        </div>
      )}
      </div>
  );
}
