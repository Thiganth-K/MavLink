import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AdminManagementCard from '../components/AdminManagementCard';
import BatchManagementCard from '../components/BatchManagementCard';
import ViewBatchesCard from '../components/ViewBatchesCard';
import BatchViewer from './BatchViewer';

export default function SuperAdminDashboard() {
  const [showBatchViewerPanel, setShowBatchViewerPanel] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    if (!user || role !== 'SUPER_ADMIN') {
      toast.error('Access denied. Super Admin privileges required.');
      window.location.href = '/';
    } else {
      // trigger fade animations once authenticated
      setTimeout(() => setMounted(true), 50);
    }
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    
    <div className="min-h-screen  flex flex-col bg-gradient-to-br from-supercream to-green-200 pt-8 px-6 pb-4 ">
      <Toaster position="top-right" />
      <header className={`mb-8 ${mounted ? 'animate-fadeSlide' : 'opacity-0'} text-center`}> 
        <h1 className="text-4xl font-extrabold text-supergreenDark tracking-tight underline-animate inline-block">
  Super Admin Control Center
</h1>

        <p className="mt-4 mx-auto max-w-2xl text-sm sm:text-base text-supergreenDark/70 leading-relaxed animate-fadeIn">
          Define batches, assign admins, and monitor academic segmentation.
        </p>
        {user?.username && (
          <p className="mt-3 text-supergreen font-medium animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            Welcome, {user.username}
          </p>
        )}
      </header>

      {!showBatchViewerPanel && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-0 ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
          <AdminManagementCard onClick={() => {}} />
          <BatchManagementCard onClick={() => {}} />
          <ViewBatchesCard onClick={() => setShowBatchViewerPanel(true)} />
          <button
            onClick={async () => {
              try {
                const blob = await (await import('../services/api')).superAdminAPI.exportData();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mavlink_export.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success('Export downloaded');
              } catch (err: any) {
                toast.error(err.message || 'Export failed');
              }
            }}
            className="group relative overflow-hidden text-left bg-white rounded-xl shadow-xl border border-supergreenDark/30 hover:shadow-2xl hover:border-supergreenAccent transition p-6 animate-fadeSlide flex flex-col justify-between"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="h-12 w-12 rounded-lg bg-supercream text-supergreen flex items-center justify-center font-bold group-hover:scale-105 transition">EX</div>
              <div>
                <h3 className="text-lg font-bold text-supergreenDark underline-animate">Export Data</h3>
                <p className="text-sm text-supergreen/80 mt-1">Download full platform snapshot</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-supergreenDark/60 leading-relaxed">
              Generates an Excel workbook containing Admins, Batches, Departments, Students & Attendance.
            </div>
          </button>
        </div>
      )}

      {showBatchViewerPanel && (
        <div className="animate-fadeSlide">
          <BatchViewer onClose={() => setShowBatchViewerPanel(false)} />
        </div>
      )}
    </div>
  );
}