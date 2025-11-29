import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ViewAnalysisCard from '../components/ViewAnalysisCard';
import BatchViewer from './BatchViewer';
import { FiUserPlus, FiLayers, FiList, FiUsers, FiMap, FiDownload, FiBarChart2, FiMessageSquare } from 'react-icons/fi';

export default function SuperAdminDashboard() {
  const [showBatchViewerPanel] = useState(false);
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

  // user info is not required here; remove unused variable to avoid linter warnings

  return (
    
    <div className="min-h-screen  flex flex-col bg-white pt-8 px-6 pb-4 ">
      <Toaster position="top-right" />
      

      {!showBatchViewerPanel && (
        <div className={`flex-1 overflow-hidden bg-transparent ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
          
          <div className="flex flex-col md:flex-row gap-6 h-full items-stretch min-h-0">
            {/* Left: side panel (narrow) - hidden on small screens */}
            <main className="hidden md:block md:w-1/5 lg:w-1/5 h-full min-h-0 overflow-auto border-r-4 border-violet-600">
              <nav className="h-full overflow-auto">
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/adminManagement'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiUserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Admin Management</div>
                        <div className="text-xs text-black-700">Create, update and assign administrators to batches</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/batch-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiLayers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Batch Management</div>
                        <div className="text-xs text-black-700">Create, organize and link batches to departments</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/viewbatches'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiList className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">View Batches</div>
                        <div className="text-xs text-black-700">Browse and inspect batch compositions</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiUsers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Student Management</div>
                        <div className="text-xs text-black-700">Add, update and organize students</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/admin-batch-mapping'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiMap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Admin ↔ Batch Mapping</div>
                        <div className="text-xs text-black-700">Visualize admin ownership across batches</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/export'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiDownload className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Export Data</div>
                        <div className="text-xs text-black-700">Download filtered or full Excel exports</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-analysis'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiBarChart2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Student Analysis</div>
                        <div className="text-xs text-black-700">Drill into student attendance performance</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/messages'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center">
                        <FiMessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Messages</div>
                        <div className="text-xs text-black-700">View and reply to admin requests</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-gradient-to-r from-fuchsia-700 to-purple-600 mt-3" />
                  </li>
                </ul>
              </nav>
            </main>

            {/* Right: View Analysis (take remaining width) */}
            <aside className="md:flex-1 h-full min-h-0">
              <div className="bg-white rounded-xl shadow-xl border-2 p-4 h-full min-h-0">
                <ViewAnalysisCard />
              </div>
            </aside>
          </div>
        </div>
      )}

      {showBatchViewerPanel && (
        <div className="animate-fadeSlide">
          <BatchViewer />
        </div>
      )}
    </div>
  );
}