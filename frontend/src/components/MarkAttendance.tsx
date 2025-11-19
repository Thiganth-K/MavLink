import type { Student, Attendance } from '../services/api';

interface MarkAttendanceProps {
  students: Student[];
  attendanceRecords: Attendance[];
  selectedDate: string;
  selectedSession: 'FN' | 'AN';
  attendanceMap: { [key: string]: 'Present' | 'Absent' | 'On-Duty' };
  isLoading: boolean;
  showSummary: boolean;
  submittedSummary: { present: number; absent: number; onDuty: number; total: number } | null;
  onDateChange: (date: string) => void;
  onSessionChange: (session: 'FN' | 'AN') => void;
  onAttendanceChange: (studentId: string, status: 'Present' | 'Absent' | 'On-Duty') => void;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onClearAll: () => void;
  onSubmit: () => void;
  onMarkNewAttendance: () => void;
  onViewAllRecords: () => void;
}

export default function MarkAttendance({
  students,
  attendanceRecords,
  selectedDate,
  selectedSession,
  attendanceMap,
  isLoading,
  showSummary,
  submittedSummary,
  onDateChange,
  onSessionChange,
  onAttendanceChange,
  onMarkAllPresent,
  onMarkAllAbsent,
  onClearAll,
  onSubmit,
  onMarkNewAttendance,
  onViewAllRecords
}: MarkAttendanceProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-950">Mark Attendance - {selectedSession === 'FN' ? 'Forenoon Session' : 'Afternoon Session'}</h2>
          {attendanceRecords.length > 0 && (
            <p className="text-sm text-orange-600 mt-1 font-medium">
              ⚠️ {selectedSession} attendance already marked for {new Date(selectedDate).toLocaleDateString()}. You can update it below.
            </p>
          )}
          {attendanceRecords.length === 0 && (
            <p className="text-sm text-green-600 mt-1 font-medium">
              ✓ No {selectedSession} attendance marked yet for {new Date(selectedDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <label className="text-blue-900 font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          
          {/* FN/AN Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                if (selectedSession !== 'FN') {
                  onSessionChange('FN');
                }
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedSession === 'FN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              FN
            </button>
            <button
              onClick={() => {
                if (selectedSession !== 'AN') {
                  onSessionChange('AN');
                }
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedSession === 'AN'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              AN
            </button>
          </div>
          
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
          >
            {attendanceRecords.length > 0 
              ? `Update ${selectedSession} Attendance` 
              : `Submit ${selectedSession} Attendance`}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={onMarkAllPresent}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Mark All Present
        </button>
        <button
          onClick={onMarkAllAbsent}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Mark All Absent
        </button>
        <button
          onClick={onClearAll}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Clear All
        </button>
        <div className="flex-1"></div>
        <span className="text-sm text-blue-600 font-medium self-center">
          Quick actions to mark all students at once
        </span>
      </div>

      <div className="overflow-x-auto">
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
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id} className="hover:bg-blue-50">
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.regno}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.studentname}</td>
                  <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.dept}</td>
                  <td className="border border-blue-200 px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => onAttendanceChange(student._id!, 'Present')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          attendanceMap[student._id!] === 'Present'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => onAttendanceChange(student._id!, 'Absent')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          attendanceMap[student._id!] === 'Absent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => onAttendanceChange(student._id!, 'On-Duty')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          attendanceMap[student._id!] === 'On-Duty'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                        }`}
                      >
                        On-Duty
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Submit Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold text-lg shadow-lg"
        >
          {isLoading ? 'Submitting...' : (attendanceRecords.length > 0 ? `Update ${selectedSession} Attendance` : `Submit ${selectedSession} Attendance`)}
        </button>
      </div>

      {/* Attendance Summary */}
      {showSummary && submittedSummary && (
        <div id="attendance-summary" className="mt-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-xl p-8 border-2 border-blue-300">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-blue-950 mb-2">✓ {selectedSession} Attendance Submitted Successfully</h3>
            <p className="text-blue-700">
              {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'} attendance for <span className="font-semibold">{new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-gray-600 font-medium mb-2">Total Students</div>
              <div className="text-4xl font-bold text-blue-950">{submittedSummary.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-green-600 font-medium mb-2">Present</div>
              <div className="text-4xl font-bold text-green-600">{submittedSummary.present}</div>
              <div className="text-sm text-gray-600 mt-1">
                {((submittedSummary.present / submittedSummary.total) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-red-600 font-medium mb-2">Absent</div>
              <div className="text-4xl font-bold text-red-600">{submittedSummary.absent}</div>
              <div className="text-sm text-gray-600 mt-1">
                {((submittedSummary.absent / submittedSummary.total) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-yellow-600 font-medium mb-2">On-Duty</div>
              <div className="text-4xl font-bold text-yellow-600">{submittedSummary.onDuty}</div>
              <div className="text-sm text-gray-600 mt-1">
                {((submittedSummary.onDuty / submittedSummary.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={onMarkNewAttendance}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Mark New Attendance
            </button>
            <button
              onClick={onViewAllRecords}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              View All Records
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
