import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { studentAPI, batchAPI, type Student } from '../../services/api';

export default function ViewStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedBatches, setAssignedBatches] = useState<{ batchId?: string; batchName?: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>('');

  useEffect(() => {
    fetchAssignedBatches();
  }, []);

  const fetchAssignedBatches = async () => {
    try {
      const adminInfo = JSON.parse(localStorage.getItem('user') || '{}');
      const all = await batchAPI.getBatches();
      const mine = all.filter(b => adminInfo.assignedBatchIds?.includes(b.batchId || ''));
      setAssignedBatches(mine);
      if (mine.length > 0) {
        setActiveBatchId(mine[0].batchId || '');
        fetchStudents(mine[0].batchId || '');
      } else {
        // fallback to assigned students endpoint
        fetchStudents();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load batches');
    }
  };

  const fetchStudents = async (batchId?: string) => {
    try {
      setIsLoading(true);
      let studentList;
      if (!batchId) {
        studentList = await studentAPI.getAssignedStudents();
      } else {
        studentList = await studentAPI.getStudents(batchId);
      }
      studentList.sort((a: Student, b: Student) => (a.regno || '').localeCompare(b.regno || ''));
      setStudents(studentList);
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-950">Students List</h2>
        <div>{/* Batch selector */}
          <label className="text-blue-900 font-medium mr-2">Batch:</label>
          <select
            value={activeBatchId}
            onChange={(e) => { const v = e.target.value; setActiveBatchId(v); fetchStudents(v); }}
            className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {assignedBatches.length === 0 && <option value="">No batches assigned</option>}
            {assignedBatches.map(b => <option key={b.batchId} value={b.batchId}>{b.batchId} - {b.batchName}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id} className="hover:bg-blue-50">
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.regno}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.studentname}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.email}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.dept}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.phno}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
