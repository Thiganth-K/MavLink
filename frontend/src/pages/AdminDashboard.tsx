import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { studentAPI, authAPI, type Student } from '../services/api';

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    studentname: '',
    email: '',
    regno: '',
    dept: '',
    phno: ''
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

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
      setStudents(studentList);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentname.trim() || !formData.email.trim() || !formData.regno.trim() || !formData.dept.trim() || !formData.phno.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await studentAPI.createStudent(formData);
      toast.success('Student created successfully');
      setFormData({ studentname: '', email: '', regno: '', dept: '', phno: '' });
      setShowCreateForm(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStudent || !formData.studentname.trim() || !formData.email.trim() || !formData.regno.trim() || !formData.dept.trim() || !formData.phno.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await studentAPI.updateStudent(editingStudent._id!, formData);
      toast.success('Student updated successfully');
      setFormData({ studentname: '', email: '', regno: '', dept: '', phno: '' });
      setEditingStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      setIsLoading(true);
      await studentAPI.deleteStudent(id);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!window.confirm('Are you sure you want to delete ALL students? This action cannot be undone!')) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await studentAPI.deleteAllStudents();
      toast.success(`${result.deletedCount} students deleted successfully`);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete all students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setIsLoading(true);
      const result = await studentAPI.uploadCSV(csvFile);
      toast.success(`CSV uploaded successfully! ${result.inserted} students imported.`);
      setCsvFile(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload CSV');
    } finally {
      setIsLoading(false);
    }
  };

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

  const startEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      studentname: student.studentname || '',
      email: student.email || '',
      regno: student.regno || '',
      dept: student.dept || '',
      phno: student.phno || ''
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setFormData({ studentname: '', email: '', regno: '', dept: '', phno: '' });
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-300 p-6">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-purple-950 rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-purple-50">Admin Dashboard</h1>
              <p className="text-purple-200 mt-2">Welcome, {user.username} (Admin)</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-purple-950 mb-4">CSV Upload</h3>
          <form onSubmit={handleCSVUpload} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-purple-900 mb-1 font-medium">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !csvFile}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Upload CSV
            </button>
          </form>
        </div>

        {/* Student Management Section */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-950">Students</h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setEditingStudent(null);
                  setFormData({ studentname: '', email: '', regno: '', dept: '', phno: '' });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {showCreateForm ? 'Cancel' : 'Add Student'}
              </button>
              <button
                onClick={handleDeleteAllStudents}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingStudent) && (
            <div className="bg-purple-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-purple-950 mb-4">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-900 mb-1 font-medium">Student Name *</label>
                  <input
                    type="text"
                    value={formData.studentname}
                    onChange={(e) => setFormData({ ...formData, studentname: e.target.value })}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-900 mb-1 font-medium">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-900 mb-1 font-medium">Registration Number *</label>
                  <input
                    type="text"
                    value={formData.regno}
                    onChange={(e) => setFormData({ ...formData, regno: e.target.value })}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-900 mb-1 font-medium">Department *</label>
                  <input
                    type="text"
                    value={formData.dept}
                    onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-900 mb-1 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phno}
                    onChange={(e) => setFormData({ ...formData, phno: e.target.value })}
                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-4 md:col-span-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                  </button>
                  {editingStudent && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-purple-200">
              <thead>
                <tr className="bg-purple-100">
                  <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Student Name</th>
                  <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Email</th>
                  <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Reg Number</th>
                  <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Department</th>
                  <th className="border border-purple-200 px-4 py-3 text-left text-purple-950 font-semibold">Phone</th>
                  <th className="border border-purple-200 px-4 py-3 text-center text-purple-950 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="border border-purple-200 px-4 py-8 text-center text-purple-600">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-purple-200 px-4 py-8 text-center text-purple-600">
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id} className="hover:bg-purple-50">
                      <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.studentname}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.email}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.regno}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.dept}</td>
                      <td className="border border-purple-200 px-4 py-3 text-purple-900">{student.phno}</td>
                      <td className="border border-purple-200 px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => startEdit(student)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student._id!)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
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
      </div>
    </div>
  );
}
