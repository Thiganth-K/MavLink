import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { studentAPI, batchAPI, type Student } from '../../services/api';
import ResponsiveTable from '../../components/Admin/ResponsiveTable';

export default function ViewStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedBatches, setAssignedBatches] = useState<{ batchId?: string; batchName?: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');
  // date filters removed from UI; stats always fetched for last 30 days
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { present: number; absent: number; onDuty: number; attendancePercentage: number }>>({});

  useEffect(() => {
    fetchAssignedBatches();
  }, []);

  const fetchAssignedBatches = async () => {
    try {
      (window as any).showGlobalLoader?.('students-data');
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const mine = all.filter(b => adminInfo.assignedBatchIds?.includes(b.batchId || ''));
      setAssignedBatches(mine);
      if (mine.length > 0) {
        setActiveBatchId(mine[0].batchId || '');
        await fetchStudents(mine[0].batchId || '');
      } else {
        // fallback to assigned students endpoint
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
      (window as any).showGlobalLoader?.('students-data');
      setIsLoading(true);
      let studentList;
      if (!batchId) {
        studentList = await studentAPI.getAssignedStudents();
      } else {
        studentList = await studentAPI.getStudents(batchId);
      }
      studentList.sort((a: Student, b: Student) => (a.regno || '').localeCompare(b.regno || ''));
      setStudents(studentList);
      // also fetch attendance stats for the same batch and current date range
      try {
        // always fetch stats for the last 30 days (date filters removed from UI)
        let stats: any[] = [];
        const today = new Date();
        const sDate = new Date();
        sDate.setDate(today.getDate() - 29);
        const sStr = sDate.toISOString().slice(0, 10);
        const eStr = today.toISOString().slice(0, 10);
        stats = await (await import('../../services/api')).attendanceAPI.getAttendanceStats(sStr, eStr, batchId || activeBatchId || undefined);
        const map: Record<string, { present: number; absent: number; onDuty: number; attendancePercentage: number }> = {};
        stats.forEach((st: any) => {
          // prefer regno key if available, fallback to _id
          const key = st.regno || st._id || '';
          map[key] = { present: st.present || 0, absent: st.absent || 0, onDuty: st.onDuty || 0, attendancePercentage: Math.round((st.attendancePercentage || 0) * 100) / 100 };
        });
        setAttendanceStats(map);
      } catch (err) {
        setAttendanceStats({});
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setIsLoading(false);
      (window as any).hideGlobalLoader?.();
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 bg-white rounded-xl shadow-xl w-full">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-2xl font-bold text-purple-950">Students List</h2>
          <div className="w-full md:w-auto mt-2 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-full md:w-auto">
                <label className="text-purple-900 font-medium mr-2">Batch:</label>
                <select
                  value={activeBatchId}
                  onChange={(e) => { const v = e.target.value; setActiveBatchId(v); fetchStudents(v); }}
                  className="w-full md:w-auto px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {assignedBatches.length === 0 && <option value="">No batches assigned</option>}
                  {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full table-auto border-collapse border border-purple-200">
                <tbody>
                  <tr>
                    <td colSpan={5} className="border border-purple-200 px-4 py-8 text-center text-purple-600">Loading students...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : students.length === 0 ? (
            <div className="overflow-x-auto">
              <ResponsiveTable>
                <table className="min-w-[720px] w-full table-auto border-collapse border border-purple-200">
                <tbody>
                  <tr>
                    <td colSpan={5} className="border border-purple-200 px-4 py-8 text-center text-purple-600">No students found</td>
                  </tr>
                </tbody>
                </table>
              </ResponsiveTable>
            </div>
          ) : (
            <div id="students-data" className="overflow-x-auto">
              <table className="w-full table-auto border-collapse border border-purple-200">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Reg Number</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top min-w-[180px]">Student Name</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Email</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Department</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Phone</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Sessions Present</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Sessions Absent</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Sessions OD</th>
                    <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold align-top">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-purple-50">
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{student.regno}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top whitespace-nowrap truncate max-w-[220px]">{student.studentname}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{student.email}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{student.dept}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{student.phno}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{attendanceStats[student.regno || student._id || ''] ? attendanceStats[student.regno || student._id || ''].present : '-'}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{attendanceStats[student.regno || student._id || ''] ? attendanceStats[student.regno || student._id || ''].absent : '-'}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{attendanceStats[student.regno || student._id || ''] ? attendanceStats[student.regno || student._id || ''].onDuty : '-'}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900 align-top break-words">{attendanceStats[student.regno || student._id || ''] ? `${attendanceStats[student.regno || student._id || ''].attendancePercentage}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
  );
}
