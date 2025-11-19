import type { Attendance, AttendanceSummary, CombinedAttendanceSummary } from '../../services/api';
import { formatDateForDisplay, formatTimestampIST } from '../../utils/dateUtils';

interface ViewAttendanceProps {
  isLoading: boolean;
  attendanceSummary: AttendanceSummary[];
  attendanceRecords: Attendance[];
  selectedDateForDetail: string | null;
  getCombinedSummary: () => CombinedAttendanceSummary[];
  onCardClick: (date: string) => void;
  onBackToSummary: () => void;
}

export default function ViewAttendance({
  isLoading,
  attendanceSummary,
  attendanceRecords,
  selectedDateForDetail,
  getCombinedSummary,
  onCardClick,
  onBackToSummary
}: ViewAttendanceProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-950">Attendance Records</h2>
        {selectedDateForDetail && (
          <button
            onClick={onBackToSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ← Back to Summary
          </button>
        )}
      </div>

      {!selectedDateForDetail ? (
        // Show cards summary
        <div>
          <p className="text-blue-800 mb-4">Click on any date card to view detailed attendance</p>
          {isLoading ? (
            <div className="text-center py-12 text-blue-600">
              Loading attendance summary...
            </div>
          ) : attendanceSummary.length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-blue-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-blue-600 text-lg">No attendance records found in the last 30 days</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCombinedSummary().map((summary) => (
                <div
                  key={summary.date}
                  onClick={() => onCardClick(summary.date)}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-blue-100 hover:border-blue-400"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-blue-950">
                      {formatDateForDisplay(summary.date, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </h3>
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  {/* FN Session */}
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
                  
                  {/* AN Session */}
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
            Attendance Details for {formatDateForDisplay(selectedDateForDetail, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          
          {/* Side by Side View - FN and AN Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FN Session */}
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
                        <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                          No FN attendance records found
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords
                        .filter(r => r.session === 'FN')
                        .sort((a, b) => (a.regno || '').localeCompare(b.regno || ''))
                        .map((record) => (
                          <tr key={record._id} className="hover:bg-blue-50">
                            <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.regno}</td>
                            <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.studentname}</td>
                            <td className="border border-blue-200 px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-white font-semibold ${
                                record.status === 'Present' ? 'bg-green-500' :
                                record.status === 'On-Duty' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
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

            {/* AN Session */}
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
                        <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                          No AN attendance records found
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords
                        .filter(r => r.session === 'AN')
                        .sort((a, b) => (a.regno || '').localeCompare(b.regno || ''))
                        .map((record) => (
                          <tr key={record._id} className="hover:bg-purple-50">
                            <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.regno}</td>
                            <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.studentname}</td>
                            <td className="border border-blue-200 px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-white font-semibold ${
                                record.status === 'Present' ? 'bg-green-500' :
                                record.status === 'On-Duty' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
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
