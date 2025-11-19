import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { superAdminAPI, authAPI, type Admin } from '../services/api';
import Footer from '../components/Footer';

export default function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '' });

  // Check if user is authenticated and has super admin role
  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    
    if (!user || role !== 'SUPER_ADMIN') {
      toast.error('Access denied. Super Admin privileges required.');
      window.location.href = '/';
      return;
    }
    
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const adminList = await superAdminAPI.getAdmins();
      setAdmins(adminList);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await superAdminAPI.createAdmin(formData.username, formData.password);
      toast.success('Admin created successfully');
      setFormData({ username: '', password: '' });
      setShowCreateForm(false);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAdmin || !formData.username.trim() || !formData.password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await superAdminAPI.updateAdmin(editingAdmin._id!, formData.username, formData.password);
      toast.success('Admin updated successfully');
      setFormData({ username: '', password: '' });
      setEditingAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      setIsLoading(true);
      await superAdminAPI.deleteAdmin(id);
      toast.success('Admin deleted successfully');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin');
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

  const startEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({ username: admin.username, password: admin.password });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingAdmin(null);
    setFormData({ username: '', password: '' });
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 p-6">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-blue-950 rounded-xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-50">Super Admin Dashboard</h1>
              <p className="text-blue-200 mt-2">Welcome back, {user.username} (Super Admin)</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Admin Management Section */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-blue-950">Admin Management</h2>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setEditingAdmin(null);
                setFormData({ username: '', password: '' });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showCreateForm ? 'Cancel' : 'Create New Admin'}
            </button>
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingAdmin) && (
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-blue-950 mb-4">
                {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
              </h3>
              <form onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-blue-900 mb-1 font-medium">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-blue-900 mb-1 font-medium">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (editingAdmin ? 'Update Admin' : 'Create Admin')}
                  </button>
                  {editingAdmin && (
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

          {/* Admins Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-blue-200">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Username</th>
                  <th className="border border-blue-200 px-4 py-3 text-left text-blue-950 font-semibold">Role</th>
                  <th className="border border-blue-200 px-4 py-3 text-center text-blue-950 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                      Loading admins...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-blue-200 px-4 py-8 text-center text-blue-600">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-blue-50">
                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{admin.username}</td>
                      <td className="border border-blue-200 px-4 py-3 text-blue-900">{admin.role}</td>
                      <td className="border border-blue-200 px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => startEdit(admin)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin._id!)}
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
      
      <Footer />
    </div>
  );
}