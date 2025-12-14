import { useEffect, useState } from 'react';
import type { Batch } from '../../../services/api';
import ResponsiveTable from '../../../components/Admin/ResponsiveTable';

interface Student {
  name: string;
  regno: string;
  dept: string;
  email: string;
  mobile: string;
}

interface BatchStudentDetailsProps {
  batch: Batch;
  onBack?: () => void;
}

export default function BatchStudentDetails({ batch, onBack }: BatchStudentDetailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(batch.students);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(batch.students);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = batch.students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.regno.toLowerCase().includes(term) ||
        s.dept.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.mobile.includes(term)
    );
    setFilteredStudents(filtered);
  }, [searchTerm, batch.students]);

  const sortedStudents = [...filteredStudents].sort((a, b) => 
    (a.regno || '').localeCompare(b.regno || '')
  );

  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-purple-950">{batch.batchName}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
              Year: {batch.batchYear}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
              Batch ID: {batch.batchId}
            </span>
            {batch.deptId && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                Dept: {batch.deptId}
              </span>
            )}
            {batch.adminId && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                Admin: {batch.adminId}
              </span>
            )}
            <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 rounded-lg text-sm font-bold">
              {batch.students.length} Students
            </span>
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={() => {
              if (onBack) onBack();
              else window.location.pathname = '/view-batches';
            }}
            className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-950 transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, regno, dept, email, or mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        {searchTerm && (
          <p className="mt-2 text-sm text-purple-700">
            Showing {filteredStudents.length} of {batch.students.length} students
          </p>
        )}
      </div>

      <ResponsiveTable>
        <table className="min-w-[320px] w-auto table-auto border-collapse border border-purple-200">
          <thead>
            <tr className="bg-purple-100">
              <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base w-20 md:w-32">
                Reg No
              </th>
              <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base min-w-0">
                Name
              </th>
              <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base w-16 md:w-20">
                Dept
              </th>
              <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base min-w-0">
                Email
              </th>
              <th className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-left text-purple-950 font-semibold text-sm md:text-base w-24 md:w-32">
                Mobile
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-purple-200 px-2 py-6 md:px-4 md:py-8 text-center text-purple-600"
                >
                  {searchTerm ? 'No students match your search' : 'No students in this batch'}
                </td>
              </tr>
            ) : (
              sortedStudents.map((student, idx) => (
                <tr key={`${student.regno}-${idx}`} className="hover:bg-purple-50">
                  <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base">
                    {student.regno}
                  </td>
                  <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base min-w-0">
                    {student.name}
                  </td>
                  <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base">
                    {student.dept}
                  </td>
                  <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-xs md:text-sm min-w-0 truncate">
                    {student.email}
                  </td>
                  <td className="border border-purple-200 px-2 py-2 md:px-4 md:py-3 text-purple-900 text-sm md:text-base">
                    {student.mobile}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>

      {sortedStudents.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Total students displayed: {sortedStudents.length}</p>
        </div>
      )}
    </div>
  );
}
