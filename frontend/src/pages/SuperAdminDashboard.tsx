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
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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

        {/* Management Cards (collapsed view) */}
        {!showAdminPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <button
              onClick={() => setShowAdminPanel(true)}
              className="text-left bg-white rounded-xl shadow-xl border border-blue-200 hover:shadow-2xl hover:border-blue-300 transition p-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  AM
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-950">Admin Management</h3>
                  <p className="text-sm text-blue-700">Create, edit, and delete admins</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Admin Management Section (expanded view) */}
        {showAdminPanel && (
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-blue-950">Admin Management</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdminPanel(false)}
                className="px-4 py-2 bg-gray-200 text-blue-900 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
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

          {/* Admins as Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-blue-200 shadow animate-pulse p-5">
                  <div className="h-6 w-32 bg-blue-100 rounded mb-3" />
                  <div className="h-4 w-24 bg-blue-100 rounded mb-5" />
                  <div className="flex gap-3">
                    <div className="h-9 w-20 bg-blue-100 rounded" />
                    <div className="h-9 w-20 bg-blue-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-800 text-center">
              No admins found. Click "Create New Admin" to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="bg-white rounded-xl border border-blue-200 shadow hover:shadow-lg transition p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                        {admin.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-blue-950 font-semibold leading-tight">{admin.username}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {admin.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2 pt-2">
                    <button
                      onClick={() => startEdit(admin)}
                      className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin._id!)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}