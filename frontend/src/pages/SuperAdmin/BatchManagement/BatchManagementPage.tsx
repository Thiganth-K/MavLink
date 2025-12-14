import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import BatchManagement from './BatchManagement';

export default function BatchManagementPage() {
  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    if (!user || role !== 'SUPER_ADMIN') {
      toast.error('Access denied. Super Admin privileges required.');
      window.location.href = '/';
      return;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-supercream to-violet-200 p-6">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold text-purple-950">Batch Management</h1>
              <div className="w-full sm:w-auto flex justify-end">
              <button
                onClick={() => { window.location.href = '/super-admin'; }}
                className="px-4 py-2 bg-white border border-supergreenDark/30 text-supergreenDark rounded-lg shadow hover:border-supergreenAccent hover:shadow-md transition-colors"
            >Back to Dashboard</button>
              </div>
        </div>
        <BatchManagement />
      </div>
    </div>
  );
}