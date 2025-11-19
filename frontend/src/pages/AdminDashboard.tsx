import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { studentAPI, authAPI, attendanceAPI, type Student, type Attendance } from '../services/api';
import Footer from '../components/Footer';

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'attendance' | 'mark'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({});

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
      const records = await attendanceAPI.getAttendanceByDate(selectedDate);
      setAttendanceRecords(records);
      
      // If in mark attendance tab, populate the attendance map with existing data
      if (activeTab === 'mark') {
        const existingAttendance: { [key: string]: 'Present' | 'Absent' | 'Late' } = {};
        records.forEach(record => {
          existingAttendance[record.studentId] = record.status;
        });
        setAttendanceMap(existingAttendance);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch attendance');
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
      status: attendanceMap[student._id!] || 'Absent',
      markedBy: user.username
    }));

    try {
      setIsLoading(true);
      await attendanceAPI.markAttendance(attendanceData, user.username);
      toast.success('Attendance marked successfully');
      setAttendanceMap({});
      setActiveTab('attendance');
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: { [key: string]: 'Present' | 'Absent' | 'Late' } = {};
    students.forEach(student => {
      allPresent[student._id!] = 'Present';
    });
    setAttendanceMap(allPresent);
    toast.success('Marked all students as Present');
  };

  const handleMarkAllAbsent = () => {
    const allAbsent: { [key: string]: 'Present' | 'Absent' | 'Late' } = {};
    students.forEach(student => {
      allAbsent[student._id!] = 'Absent';
    });
    setAttendanceMap(allAbsent);
    toast.success('Marked all students as Absent');
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
    if (activeTab === 'attendance' || activeTab === 'mark') {
      // Reset to today's date when switching to attendance or mark tabs
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      fetchAttendance();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch attendance when date changes (but only if on attendance/mark tabs)
    if (activeTab === 'attendance' || activeTab === 'mark') {
      fetchAttendance();
    }
  }, [selectedDate]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      localStorage.removeItem('role');
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
        )}

        {/* View Attendance Section */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-950">Attendance Records</h2>
              <div className="flex gap-4 items-center">
                <label className="text-blue-900 font-medium">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-blue-200">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Reg Number</th>
                    <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Student Name</th>
                    <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Status</th>
                    <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Marked By</th>
                    <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                        Loading attendance...
                      </td>
                    </tr>
                  ) : attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                        No attendance records found for this date
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.sort((a, b) => (a.regno || '').localeCompare(b.regno || '')).map((record) => (
                      <tr key={record._id} className="hover:bg-blue-50">
                        <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.regno}</td>
                        <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.studentname}</td>
                        <td className="border border-blue-200 px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-white font-semibold ${
                            record.status === 'Present' ? 'bg-green-500' :
                            record.status === 'Late' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="border border-blue-200 px-4 py-3 text-blue-900">{record.markedBy}</td>
                        <td className="border border-blue-200 px-4 py-3 text-blue-900">
                          {new Date(record.markedAt!).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mark Attendance Section */}
        {activeTab === 'mark' && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-blue-950">Mark Attendance</h2>
                {attendanceRecords.length > 0 && (
                  <p className="text-sm text-orange-600 mt-1 font-medium">
                    ⚠️ Attendance already taken for this date. You can update it below.
                  </p>
                )}
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-blue-900 font-medium">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleMarkAttendance}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {attendanceRecords.length > 0 ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 flex gap-3">
              <button
                onClick={handleMarkAllPresent}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Mark All Present
              </button>
              <button
                onClick={handleMarkAllAbsent}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Mark All Absent
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
                              onClick={() => handleAttendanceChange(student._id!, 'Present')}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                attendanceMap[student._id!] === 'Present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(student._id!, 'Absent')}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                attendanceMap[student._id!] === 'Absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(student._id!, 'Late')}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                attendanceMap[student._id!] === 'Late'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                              }`}
                            >
                              Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-12">
        <Footer />
      </div>
    </div>
  );
}
