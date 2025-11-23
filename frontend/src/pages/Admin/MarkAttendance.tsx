import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { studentAPI, attendanceAPI, batchAPI, type Student, type Attendance } from '../../services/api';
import { getTodayIST, formatDateForDisplay } from '../../utils/dateUtils';

export default function MarkAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: 'Present' | 'Absent' | 'On-Duty' }>({});
  const [attendanceReasons, setAttendanceReasons] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ present: number; absent: number; onDuty: number; total: number } | null>(null);
  const [assignedBatches, setAssignedBatches] = useState<{ batchId?: string; batchName?: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchAssignedBatches();
  }, []);

  useEffect(() => {
    // whenever date/session/batch changes fetch session-specific attendance
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSession, activeBatchId]);

  const fetchAssignedBatches = async () => {
    try {
      (window as any).showGlobalLoader?.('markattendance-data');
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const mine = all.filter(b => adminInfo.assignedBatchIds?.includes(b.batchId || ''));
      setAssignedBatches(mine);
      if (mine.length > 0) {
        setActiveBatchId(mine[0].batchId || '');
        await fetchStudents(mine[0].batchId || '');
      } else {
        await fetchStudents();
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
      setStudents(studentList);
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch students');
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
      const sessionRecords = await attendanceAPI.getAttendanceByDateAndSession(selectedDate, selectedSession, activeBatchId || undefined);
      const allowedRegnos = new Set(students.map(s => (s.regno || '').toUpperCase()));
      const filtered = sessionRecords.filter((r: any) => allowedRegnos.size ? allowedRegnos.has((r.regno || '').toUpperCase()) : true);
      setAttendanceRecords(filtered);

      const newAttendanceMap: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
      const newAttendanceReasons: { [key: string]: string } = {};
      filtered.forEach((record: any) => {
        newAttendanceMap[record.studentId] = record.status as 'Present' | 'Absent' | 'On-Duty';
        if ((record as any).reason) newAttendanceReasons[record.studentId] = (record as any).reason;
      });
      setAttendanceMap(newAttendanceMap);
      setAttendanceReasons(newAttendanceReasons);
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch attendance');
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'On-Duty') => {
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
    const allPresent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
    students.forEach(student => { allPresent[student._id!] = 'Present'; });
    setAttendanceMap(allPresent);
    toast.success('Marked all students as Present');
  };

  const handleMarkAllAbsent = () => {
    const allAbsent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
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
        onDuty: attendanceData.filter(a => a.status === 'On-Duty').length
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
    <div ref={containerRef} className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">Mark Attendance - {selectedSession === 'FN' ? 'Forenoon Session' : 'Afternoon Session'}</h2>
          {attendanceRecords.length > 0 ? (
            <p className="text-sm text-orange-600 mt-1 font-medium">⚠️ {selectedSession} attendance already marked for {formatDateForDisplay(selectedDate)}. You can update it below.</p>
          ) : (
            <p className="text-sm text-green-600 mt-1 font-medium">✓ No {selectedSession} attendance marked yet for {formatDateForDisplay(selectedDate)}</p>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <label className="text-blue-900 font-medium">Date:</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setSelectedSession('FN')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedSession === 'FN' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-700 hover:bg-gray-200'}`}>FN</button>
            <button onClick={() => setSelectedSession('AN')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedSession === 'AN' ? 'bg-purple-600 text-white shadow-md' : 'bg-transparent text-gray-700 hover:bg-gray-200'}`}>AN</button>
          </div>

          <select value={activeBatchId} onChange={(e) => { setActiveBatchId(e.target.value); fetchStudents(e.target.value); }} className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {assignedBatches.length === 0 && <option value="">No batches assigned</option>}
            {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
          </select>

          <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold">{attendanceRecords.length > 0 ? `Update ${selectedSession} Attendance` : `Submit ${selectedSession} Attendance`}</button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleMarkAllPresent} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Mark All Present</button>
        <button onClick={handleMarkAllAbsent} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">Mark All Absent</button>
        <button onClick={handleClearAll} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">Clear All</button>
        <div className="flex-1" />
        <span className="text-sm text-blue-600 font-medium self-center">Quick actions to mark all students at once</span>
      </div>

      {students.length === 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-blue-200">
            <tbody>
              <tr>
                <td colSpan={4} className="border border-blue-200 px-4 py-8 text-center text-blue-600">No students found</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div id="markattendance-data" className="overflow-x-auto">
          <table className="w-full border-collapse border border-blue-200">
            <thead>
              <tr className="bg-blue-100">
                <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg Number</th>
                <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Student Name</th>
                <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Department</th>
                <th className="border border-blue-200 px-4 py-3 text-center text-blue-950 font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-blue-50">
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.regno}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.studentname}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.dept}</td>
                  <td className="border border-blue-200 px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleAttendanceChange(student._id!, 'Present')} className={`px-4 py-2 rounded-lg font-semibold ${attendanceMap[student._id!] === 'Present' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Present</button>
                      <button onClick={() => handleAttendanceChange(student._id!, 'Absent')} className={`px-4 py-2 rounded-lg font-semibold ${attendanceMap[student._id!] === 'Absent' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Absent</button>
                      <button onClick={() => handleAttendanceChange(student._id!, 'On-Duty')} className={`px-4 py-2 rounded-lg font-semibold ${attendanceMap[student._id!] === 'On-Duty' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}>On-Duty</button>
                    </div>
                    {attendanceMap[student._id!] === 'On-Duty' && (
                      <div className="mt-2">
                        <input type="text" value={attendanceReasons?.[student._id!] || ''} onChange={(e) => handleReasonChange(student._id!, e.target.value)} placeholder="Reason for On-Duty (required)" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:outline-none" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold text-lg shadow-lg">{isLoading ? 'Submitting...' : (attendanceRecords.length > 0 ? `Update ${selectedSession} Attendance` : `Submit ${selectedSession} Attendance`)}</button>
      </div>

      {showSummary && submittedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeSummary} />

          <div className="relative w-full max-w-3xl p-6">
            <div className="bg-white rounded-xl shadow-xl p-6 border-2 border-blue-200 transform origin-center animate-modalIn">
              <div className="absolute top-3 right-3">
                <button onClick={closeSummary} className="text-gray-600 hover:text-gray-800 bg-transparent rounded-md px-2 py-1">✕</button>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-blue-950 mb-2">✓ {selectedSession} Attendance Submitted Successfully</h3>
                <p className="text-blue-700">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'} attendance for <span className="font-semibold">{formatDateForDisplay(selectedDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-gray-600 font-medium mb-1">Total</div>
                  <div className="text-3xl font-bold text-blue-950">{submittedSummary.total}</div>
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
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={closeSummary} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Mark New Attendance</button>
                <button
                  onClick={() => { window.location.href = '/admin-dashboard/view-attendance'; }}
                  className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-semibold"
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
