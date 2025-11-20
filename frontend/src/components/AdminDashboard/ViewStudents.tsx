import type { Student } from '../../services/api';

interface ViewStudentsProps {
  students: Student[];
  isLoading: boolean;
}

export default function ViewStudents({ students, isLoading }: ViewStudentsProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-950">Students List</h2>
      </div>

      {/* Students Table */}
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
