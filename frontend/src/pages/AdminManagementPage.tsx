import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { superAdminAPI, batchAPI, type Admin } from '../services/api';

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({ adminId: '', username: '', password: '' });
  const [assignBatchId, setAssignBatchId] = useState('');
  const [assignAdminId, setAssignAdminId] = useState('');

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adminId || !formData.username.trim() || !formData.password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      setIsLoading(true);
      await superAdminAPI.createAdmin(formData.adminId, formData.username, formData.password);
      toast.success('Admin created successfully');
      setFormData({ adminId: '', username: '', password: '' });
      setShowCreateForm(false);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
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
      await superAdminAPI.updateAdmin(editingAdmin._id!, formData.adminId, formData.username, formData.password);
      toast.success('Admin updated successfully');
      setFormData({ adminId: '', username: '', password: '' });
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Delete this admin?')) return;
    try {
      setIsLoading(true);
      await superAdminAPI.deleteAdmin(id);
      toast.success('Admin deleted');
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({ adminId: admin.adminId || '', username: admin.username, password: admin.password });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingAdmin(null);
    setFormData({ adminId: '', username: '', password: '' });
    setShowCreateForm(false);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
          <h1 className="text-3xl font-bold text-purple-950">Admin Management</h1>

          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (editingAdmin) cancelEdit(); else setShowCreateForm(!showCreateForm);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors"
            >
              {editingAdmin ? 'Cancel Edit' : showCreateForm ? 'Cancel' : 'Create New Admin'}
            </button>

            <button
              onClick={() => { window.location.href = '/super-admin'; }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-white border border-purple-950 text-purple-950 rounded-lg shadow hover:border-purple-700 hover:shadow-md transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
          
        

        {showCreateForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-8 border border-purple-700">
            <h2 className="text-xl font-semibold text-supergreenDark mb-4">{editingAdmin ? 'Edit Admin' : 'Create Admin'}</h2>
            <form onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-supergreenDark mb-1 font-medium">Admin ID (unique)</label>
                <input
                  type="text"
                  value={formData.adminId}
                  onChange={(e) => setFormData({ ...formData, adminId: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                  required
                  disabled={!!editingAdmin}
                />
              </div>
              <div>
                <label className="block text-supergreenDark mb-1 font-medium">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-supergreenDark mb-1 font-medium">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin'}
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
            <div className="bg-purple-100 p-6 rounded-lg mt-8 border border-supergreenDark/20">
              <h3 className="text-lg font-semibold text-supergreenDark mb-4">Assign Admin To Batch</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!assignBatchId || !assignAdminId) {
                    toast.error('Select batch and admin');
                    return;
                  }
                  try {
                    await batchAPI.assignAdmin(assignBatchId, assignAdminId);
                    toast.success('Admin assigned');
                    setAssignBatchId('');
                    setAssignAdminId('');
                    fetchAdmins();
                  } catch (err: any) {
                    toast.error(err.message || 'Assignment failed');
                  }
                }}
                className="grid md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label className="block text-supergreenDark mb-1 font-medium">Batch ID</label>
                  <input
                    type="text"
                    value={assignBatchId}
                    onChange={(e) => setAssignBatchId(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                    placeholder="e.g. BATCH2025A"
                  />
                </div>
                <div>
                  <label className="block text-supergreenDark mb-1 font-medium">Admin ID</label>
                  <select
                    value={assignAdminId}
                    onChange={(e) => setAssignAdminId(e.target.value)}
                    className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                  >
                    <option value="">Select Admin</option>
                    {admins.map(a => (
                      <option key={a._id} value={a.adminId}>{a.adminId} - {a.username}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                  >Assign</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-supergreenDark/20 shadow animate-pulse p-5">
                  <div className="h-6 w-32 bg-purple-100 rounded mb-3" />
                  <div className="h-4 w-24 bg-purple-100 rounded mb-5" />
                  <div className="flex gap-3">
                    <div className="h-9 w-20 bg-purple-100 rounded" />
                    <div className="h-9 w-20 bg-purple-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="bg-supercream border border-supergreenDark/20 rounded-xl p-6 text-supergreen text-center">
              No admins found. Use the button above to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="bg-white rounded-xl border border-supergreenDark/20 shadow hover:shadow-lg transition p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-fuchsia-50 text-fuchsia-700 border-2 border-fuchsia-600 flex items-center justify-center font-bold">
                        {admin.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-purple-950 font-semibold leading-tight">{admin.username}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-purple-200 text-purple-800'
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
                      className="flex-1 px-3 py-2 bg-white text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors"
                    >Edit</button>
                    <button
                      onClick={() => handleDeleteAdmin(admin._id!)}
                      className="flex-1 px-3 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}