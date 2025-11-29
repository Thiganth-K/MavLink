import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ViewAnalysisCard from '../components/ViewAnalysisCard';
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
    
    <div className="min-h-screen  flex flex-col bg-gradient-to-br from-supercream to-violet-200 pt-8 px-6 pb-4 ">
      <Toaster position="top-right" />
      

      {!showBatchViewerPanel && (
        <div className={`flex-1 overflow-hidden bg-transparent ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
          <div className="flex flex-col md:flex-row gap-6 h-full items-stretch min-h-0">
            {/* Left: side panel (narrow) */}
            <main className="md:w-1/5 lg:w-1/5 h-full min-h-0 overflow-auto border-r-4 border-violet-600">
              <nav className="h-full overflow-auto">
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/adminManagement'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">AM</div>
                      <div>
                        <div className="font-semibold text-violet-900">Admin Management</div>
                        <div className="text-xs text-violet-700">Create, update and assign administrators to batches</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/batchManagement'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">BM</div>
                      <div>
                        <div className="font-semibold text-violet-900">Batch Management</div>
                        <div className="text-xs text-violet-700">Create, organize and link batches to departments</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/viewbatches'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">VB</div>
                      <div>
                        <div className="font-semibold text-violet-900">View Batches</div>
                        <div className="text-xs text-violet-700">Browse and inspect batch compositions</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">SM</div>
                      <div>
                        <div className="font-semibold text-violet-900">Student Management</div>
                        <div className="text-xs text-violet-700">Add, update and organize students</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/admin-batch-mapping'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">MP</div>
                      <div>
                        <div className="font-semibold text-violet-900">Admin ↔ Batch Mapping</div>
                        <div className="text-xs text-violet-700">Visualize admin ownership across batches</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/export'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">EX</div>
                      <div>
                        <div className="font-semibold text-violet-900">Export Data</div>
                        <div className="text-xs text-violet-700">Download filtered or full Excel exports</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-analysis'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">SA</div>
                      <div>
                        <div className="font-semibold text-violet-900">Student Analysis</div>
                        <div className="text-xs text-violet-700">Drill into student attendance performance</div>
                      </div>
                    </button>
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/messages'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-100 text-violet-800 flex items-center justify-center font-bold">MSG</div>
                      <div>
                        <div className="font-semibold text-violet-900">Messages</div>
                        <div className="text-xs text-violet-700">View and reply to admin requests</div>
                      </div>
                    </button>
                  </li>
                </ul>
              </nav>
            </main>

            {/* Right: View Analysis (take remaining width) */}
            <aside className="md:flex-1 h-full min-h-0">
              <div className="bg-white rounded-xl shadow-xl border-2 border-violet-300 p-4 h-full min-h-0">
                <ViewAnalysisCard />
              </div>
            </aside>
          </div>
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