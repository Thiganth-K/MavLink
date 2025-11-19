import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { studentAPI, authAPI, attendanceAPI, type Student, type Attendance, type AttendanceSummary, type CombinedAttendanceSummary } from '../services/api';
import Footer from '../components/Footer';
import ViewStudents from '../components/ViewStudents';
import ViewAttendance from '../components/ViewAttendance';
import MarkAttendance from '../components/MarkAttendance';

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'attendance' | 'mark'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [selectedDateForDetail, setSelectedDateForDetail] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: 'Present' | 'Absent' | 'On-Duty' }>({});
  const [showSummary, setShowSummary] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ present: number; absent: number; onDuty: number; total: number } | null>(null);

  // Check if user is authenticated as ADMIN (not SUPER_ADMIN)
  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    
    if (!user || role !== 'ADMIN') {
      toast.error('Access denied. Admin privileges required.');
      window.location.href = '/';
      return;
    }
    
    fetchStudents();
    
    // Handle hash-based navigation
    const hash = window.location.hash.replace('#', '');
    if (hash && ['home', 'students', 'attendance', 'mark'].includes(hash)) {
      setActiveTab(hash as 'home' | 'students' | 'attendance' | 'mark');
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['home', 'students', 'attendance', 'mark'].includes(hash)) {
        setActiveTab(hash as 'home' | 'students' | 'attendance' | 'mark');
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const studentList = await studentAPI.getStudents();
      // Sort students by registration number
      const sortedStudents = studentList.sort((a, b) => 
        (a.regno || '').localeCompare(b.regno || '')
      );
      setStudents(sortedStudents);
      setFilteredStudents(sortedStudents);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      
      // Fetch only the selected session's records for mark attendance
      const sessionRecords = await attendanceAPI.getAttendanceByDateAndSession(selectedDate, selectedSession);
      setAttendanceRecords(sessionRecords);
      
      // Populate the attendance map with existing session data
      const newAttendanceMap: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
      sessionRecords.forEach(record => {
        newAttendanceMap[record.studentId] = record.status;
      });
      
      setAttendanceMap(newAttendanceMap);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      setIsLoading(true);
      
      // Get last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Generate array of dates
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const response = await attendanceAPI.getAttendanceByDateSummary(dates);
      
      // Transform API response to match frontend interface
      const transformedSummary: AttendanceSummary[] = response.data.map(item => ({
        date: item.date,
        FN: {
          total: item.FN.total,
          present: item.FN.present,
          absent: item.FN.absent,
          onDuty: item.FN.onDuty
        },
        AN: {
          total: item.AN.total,
          present: item.AN.present,
          absent: item.AN.absent,
          onDuty: item.AN.onDuty
        }
      }));
      
      // Filter out dates with no attendance
      const filtered = transformedSummary.filter(s => s.FN.total > 0 || s.AN.total > 0);
      setAttendanceSummary(filtered);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch attendance summary');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to combine FN and AN sessions by date for display
  const getCombinedSummary = (): CombinedAttendanceSummary[] => {
    return attendanceSummary.map(summary => ({
      date: summary.date,
      fn: {
        total: summary.FN.total,
        present: summary.FN.present,
        absent: summary.FN.absent,
        onDuty: summary.FN.onDuty
      },
      an: {
        total: summary.AN.total,
        present: summary.AN.present,
        absent: summary.AN.absent,
        onDuty: summary.AN.onDuty
      }
    })).sort((a, b) => b.date.localeCompare(a.date));
  };

  const handleCardClick = async (date: string) => {
    setSelectedDateForDetail(date);
    try {
      setIsLoading(true);
      // Fetch all sessions (FN and AN) for the selected date
      const records = await attendanceAPI.getAttendanceByDate(date);
      setAttendanceRecords(records);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch attendance details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const attendanceData = students.map(student => ({
      studentId: student._id!,
      regno: student.regno!,
      studentname: student.studentname!,
      date: selectedDate,
      session: selectedSession,
      status: attendanceMap[student._id!] || 'Absent'
    }));

    try {
      setIsLoading(true);
      const response = await attendanceAPI.markAttendance(attendanceData, user.username);
      
      console.log('Mark Attendance Response:', response);
      
      // Calculate summary
      const summary = {
        total: students.length,
        present: attendanceData.filter(a => a.status === 'Present').length,
        absent: attendanceData.filter(a => a.status === 'Absent').length,
        onDuty: attendanceData.filter(a => a.status === 'On-Duty').length
      };
      
      setSubmittedSummary(summary);
      setShowSummary(true);
      toast.success(`${selectedSession} Attendance marked successfully for ${new Date(selectedDate).toLocaleDateString()}`);
      
      // Refresh only the current session's data (optimized)
      await fetchAttendance();
      
      // Refresh attendance summary for view attendance section
      await fetchAttendanceSummary();
      
      // Scroll to summary
      setTimeout(() => {
        document.getElementById('attendance-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'On-Duty') => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
    students.forEach(student => {
      allPresent[student._id!] = 'Present';
    });
    setAttendanceMap(allPresent);
    toast.success('Marked all students as Present');
  };

  const handleMarkAllAbsent = () => {
    const allAbsent: { [key: string]: 'Present' | 'Absent' | 'On-Duty' } = {};
    students.forEach(student => {
      allAbsent[student._id!] = 'Absent';
    });
    setAttendanceMap(allAbsent);
    toast.success('Marked all students as Absent');
  };

  const handleClearAll = () => {
    setAttendanceMap({});
    toast.success('Cleared all attendance selections');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStudents(students);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = students.filter(student => 
      student.studentname?.toLowerCase().includes(lowerQuery) ||
      student.regno?.toLowerCase().includes(lowerQuery) ||
      student.dept?.toLowerCase().includes(lowerQuery) ||
      student.email?.toLowerCase().includes(lowerQuery) ||
      student.phno?.toLowerCase().includes(lowerQuery)
    );
    // Sort filtered results by registration number
    filtered.sort((a, b) => (a.regno || '').localeCompare(b.regno || ''));
    setFilteredStudents(filtered);
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      // Fetch attendance summary when switching to attendance tab
      fetchAttendanceSummary();
      setSelectedDateForDetail(null); // Reset detail view
    } else if (activeTab === 'mark') {
      // Reset to today's date when switching to mark tab
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setShowSummary(false); // Reset summary view
      setSubmittedSummary(null);
      // Fetch session-specific data
      fetchAttendance();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch session-specific attendance when date or session changes
    if (activeTab === 'mark') {
      // Clear map and fetch only the selected session's data
      setAttendanceMap({});
      setShowSummary(false); // Hide previous summary
      fetchAttendance();
    }
  }, [selectedDate, selectedSession]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.setItem('showLogoutAnimation', 'true');
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error: any) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Navbar */}
      <nav className="bg-blue-950 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="text-2xl font-bold text-white">MavLink</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                View Students
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'attendance'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                View Attendance
              </button>
              <button
                onClick={() => setActiveTab('mark')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'mark'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                Mark Attendance
              </button>
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 flex-grow">
        {/* Home/Hero Section */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <style>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .animate-fadeIn {
                animation: fadeIn 0.6s ease-out;
              }
            `}</style>
            {/* Hero Section */}
            <div className="p-12 w-full">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-950 mb-4">
                  Welcome to MavLink Admin Dashboard
                </h1>
                <p className="text-xl text-blue-800 mb-8">
                  Manage students and track attendance efficiently
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setActiveTab('students')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    View Students
                  </button>
                  <button
                    onClick={() => setActiveTab('mark')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                  >
                    Mark Attendance
                  </button>
                </div>
              </div>

              {/* Search Section */}
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-blue-950 mb-4 text-center">
                  Search Students
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name, registration number, department, email, or phone..."
                    className="w-full px-6 py-4 pr-12 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg bg-white shadow-lg"
                  />
                  <svg
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="bg-white rounded-xl shadow-xl p-8 mt-8">
                  <h3 className="text-lg font-semibold text-blue-950 mb-4">
                    Search Results ({filteredStudents.length} found)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-blue-200">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg Number</th>
                          <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Student Name</th>
                          <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Department</th>
                          <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Email</th>
                          <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                              No students found matching your search
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => (
                            <tr key={student._id} className="hover:bg-blue-50">
                              <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.regno}</td>
                              <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.studentname}</td>
                              <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.dept}</td>
                              <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.email}</td>
                              <td className="border border-blue-200 px-4 py-3 text-blue-900">{student.phno}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Student List Section */}
        {activeTab === 'students' && (
          <ViewStudents students={students} isLoading={isLoading} />
        )}

        {/* View Attendance Section */}
        {activeTab === 'attendance' && (
          <ViewAttendance
            isLoading={isLoading}
            attendanceSummary={attendanceSummary}
            attendanceRecords={attendanceRecords}
            selectedDateForDetail={selectedDateForDetail}
            getCombinedSummary={getCombinedSummary}
            onCardClick={handleCardClick}
            onBackToSummary={() => {
              setSelectedDateForDetail(null);
              setAttendanceRecords([]);
            }}
          />
        )}

        {/* Mark Attendance Section */}
        {activeTab === 'mark' && (
          <MarkAttendance
            students={students}
            attendanceRecords={attendanceRecords}
            selectedDate={selectedDate}
            selectedSession={selectedSession}
            attendanceMap={attendanceMap}
            isLoading={isLoading}
            showSummary={showSummary}
            submittedSummary={submittedSummary}
            onDateChange={setSelectedDate}
            onSessionChange={setSelectedSession}
            onAttendanceChange={handleAttendanceChange}
            onMarkAllPresent={handleMarkAllPresent}
            onMarkAllAbsent={handleMarkAllAbsent}
            onClearAll={handleClearAll}
            onSubmit={handleMarkAttendance}
            onMarkNewAttendance={() => {
              setShowSummary(false);
              setSubmittedSummary(null);
              setAttendanceMap({});
            }}
            onViewAllRecords={() => setActiveTab('attendance')}
          />
        )}
      </div>
      
      <div className="mt-12">
        <Footer />
      </div>
    </div>
  );
}
