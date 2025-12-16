import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { batchAPI, superAdminAPI, type Batch, type Guest } from '../../services/api';

function parseAssigned(input: string): string[] {
  return String(input || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toUpperCase());
}

export default function GuestManagementPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({ guestId: '', username: '', password: '', assignedBatchIdsCsv: '' });
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    if (!user || role !== 'SUPER_ADMIN') {
      toast.error('Access denied. Super Admin privileges required.');
      window.location.href = '/';
      return;
    }
    fetchGuests();
    fetchBatches();
  }, []);

  const fetchGuests = async () => {
    try {
      setIsLoading(true);
      const list = await superAdminAPI.getGuests();
      setGuests(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch guests');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const list = await batchAPI.getBatches();
      const clean = (Array.isArray(list) ? list : [])
        .filter(b => !!b && !!b.batchId)
        .map(b => ({ ...b, batchId: String(b.batchId).toUpperCase() }));
      clean.sort((a, b) => String(a.batchId).localeCompare(String(b.batchId)));
      setBatches(clean);
    } catch (err: any) {
      // keep page usable even if batches can't load
      toast.error(err?.message || 'Failed to fetch batches');
    }
  };

  const addSelectedBatch = () => {
    const id = String(selectedBatchId || '').trim().toUpperCase();
    if (!id) return;
    const existing = parseAssigned(formData.assignedBatchIdsCsv);
    if (existing.includes(id)) {
      toast('Batch already added');
      setSelectedBatchId('');
      return;
    }
    const next = [...existing, id];
    next.sort((a, b) => a.localeCompare(b));
    setFormData({ ...formData, assignedBatchIdsCsv: next.join(', ') });
    setSelectedBatchId('');
  };

  const removeAssignedBatch = (batchId: string) => {
    const id = String(batchId || '').trim().toUpperCase();
    const next = parseAssigned(formData.assignedBatchIdsCsv).filter(b => b !== id);
    setFormData({ ...formData, assignedBatchIdsCsv: next.join(', ') });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestId || !formData.username.trim() || !formData.password.trim()) {
      toast.error('Please fill in guestId, username and password');
      return;
    }
    try {
      setIsLoading(true);
      await superAdminAPI.createGuest(
        formData.guestId.toUpperCase(),
        formData.username,
        formData.password,
        parseAssigned(formData.assignedBatchIdsCsv)
      );
      toast.success('Guest created successfully');
      setFormData({ guestId: '', username: '', password: '', assignedBatchIdsCsv: '' });
      setShowCreateForm(false);
      fetchGuests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !formData.username.trim() || !formData.password.trim()) {
      toast.error('Please fill in username and password');
      return;
    }
    try {
      setIsLoading(true);
      await superAdminAPI.updateGuest(
        editingGuest._id!,
        formData.guestId.toUpperCase(),
        formData.username,
        formData.password,
        parseAssigned(formData.assignedBatchIdsCsv)
      );
      toast.success('Guest updated successfully');
      setEditingGuest(null);
      setFormData({ guestId: '', username: '', password: '', assignedBatchIdsCsv: '' });
      setShowCreateForm(false);
      fetchGuests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this guest?')) return;
    try {
      setIsLoading(true);
      await superAdminAPI.deleteGuest(id);
      toast.success('Guest deleted');
      fetchGuests();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (g: Guest) => {
    setEditingGuest(g);
    setFormData({
      guestId: String(g.guestId || ''),
      username: g.username,
      password: g.password,
      assignedBatchIdsCsv: Array.isArray(g.assignedBatchIds) ? g.assignedBatchIds.join(', ') : ''
    });
    setShowCreateForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 10);
  };

  const cancelEdit = () => {
    setEditingGuest(null);
    setFormData({ guestId: '', username: '', password: '', assignedBatchIdsCsv: '' });
    setShowCreateForm(false);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
          <h1 className="text-3xl font-bold text-purple-950">Guest Management</h1>

          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (editingGuest) cancelEdit();
                else setShowCreateForm(!showCreateForm);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors"
            >
              {editingGuest ? 'Cancel Edit' : showCreateForm ? 'Cancel' : 'Create New Guest'}
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
          <div ref={formRef} className="bg-white rounded-xl shadow p-6 mb-8 border border-purple-700">
            <h2 className="text-xl font-semibold text-supergreenDark mb-4">{editingGuest ? 'Edit Guest' : 'Create Guest'}</h2>
            <form onSubmit={editingGuest ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-supergreenDark mb-1 font-medium">Guest ID (unique)</label>
                <input
                  type="text"
                  value={formData.guestId}
                  onChange={(e) => setFormData({ ...formData, guestId: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                  required
                  disabled={!!editingGuest}
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-supergreenDark mb-1 font-medium">Allotted Batch IDs</label>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="sm:col-span-2 w-full px-4 py-2 border border-supergreenDark/30 rounded-lg focus:ring-2 focus:ring-supergreenAccent focus:outline-none bg-white"
                  >
                    <option value="">Select a batch to add</option>
                    {batches.map(b => (
                      <option key={String(b._id || b.batchId)} value={String(b.batchId || '').toUpperCase()}>
                        {String(b.batchId || '').toUpperCase()}{b.batchName ? ` — ${b.batchName}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addSelectedBatch}
                    disabled={!selectedBatchId}
                    className="w-full px-4 py-2 bg-white text-purple-700 border border-purple-700 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {parseAssigned(formData.assignedBatchIdsCsv).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseAssigned(formData.assignedBatchIdsCsv).map(id => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => removeAssignedBatch(id)}
                        className="px-3 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-950 text-sm hover:bg-purple-100"
                        title="Remove"
                      >
                        {id} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingGuest ? 'Update Guest' : 'Create Guest'}
                </button>
                {editingGuest && (
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

        <div className="bg-white rounded-xl shadow border border-purple-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-950">Guests</h2>
            <div className="text-sm text-gray-600">{isLoading ? 'Loading…' : `${guests.length} guests`}</div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr className="bg-purple-50">
                  <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Guest ID</th>
                  <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Username</th>
                  <th className="text-left px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Allotted Batches</th>
                  <th className="text-right px-4 py-3 text-purple-950 font-semibold border-b border-purple-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-600">No guests found</td>
                  </tr>
                ) : (
                  guests
                    .slice()
                    .sort((a, b) => String(a.guestId || '').localeCompare(String(b.guestId || '')))
                    .map(g => (
                      <tr key={String(g._id)} className="hover:bg-purple-50">
                        <td className="px-4 py-3 border-b border-purple-50 text-purple-950">{String(g.guestId || '').toUpperCase()}</td>
                        <td className="px-4 py-3 border-b border-purple-50 text-purple-950">{g.username}</td>
                        <td className="px-4 py-3 border-b border-purple-50 text-gray-700">
                          {Array.isArray(g.assignedBatchIds) && g.assignedBatchIds.length ? g.assignedBatchIds.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-3 border-b border-purple-50">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(g)}
                              className="px-3 py-1 bg-white text-purple-700 border border-purple-700 rounded hover:bg-purple-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(g._id!)}
                              className="px-3 py-1 bg-white text-red-700 border border-red-600 rounded hover:bg-red-50"
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
