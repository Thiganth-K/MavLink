import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ViewAnalysisCard from '../components/ViewAnalysisCard';
import BatchViewer from './BatchViewer';
import { FiUserPlus, FiLayers, FiList, FiUsers, FiMap, FiDownload, FiBarChart2, FiMessageSquare } from 'react-icons/fi';
import { notificationAPI } from '../services/api';

export default function SuperAdminDashboard() {
  const [showBatchViewerPanel] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<number | null>(null);

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

  // Load unread notifications for overlay cards
  useEffect(() => {
    const load = async () => {
      try {
        const res = await notificationAPI.list();
        const arr = Array.isArray(res) ? res : [];
        const unread = arr.filter((n: any) => !n.read);
        setNotifications(unread.slice(0, 5));
        setUnreadCount(unread.length);
      } catch (e) {
        // silent fail
      }
    };
    load();
    pollRef.current = window.setInterval(load, 10000) as unknown as number;
    const onNotifs = () => { load().catch(() => {}); };
    window.addEventListener('notificationsChanged', onNotifs as EventListener);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('notificationsChanged', onNotifs as EventListener);
    };
  }, []);

  // user info is not required here; remove unused variable to avoid linter warnings

  return (
    
    <div className="min-h-screen  flex flex-col bg-white pt-8 px-6 pb-4 ">
      <Toaster position="top-right" />
      {/* Unread messages overlay cards */}
      {unreadCount > 0 && (
        <div className="fixed right-6 top-6 z-50 w-80 sm:w-96">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border-2 border-violet-600 overflow-hidden">
            <div className="px-4 py-3 border-b bg-violet-50 text-violet-900 flex items-center justify-between">
              <div className="font-semibold">You have {unreadCount} unread message{unreadCount === 1 ? '' : 's'}</div>
              <button
                onClick={() => { window.location.href = '/super-admin/messages'; }}
                className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1 rounded-full border border-violet-400"
              >
                Open Chat
              </button>
            </div>
            <div className="max-h-64 overflow-auto p-3 space-y-3">
              {notifications.map((n: any) => (
                <div
                  key={n._id || n.id}
                  onClick={async () => {
                    try {
                      await notificationAPI.markRead(n._id || n.id).catch(() => {});
                      const adminId = (n.sender && (n.sender.adminId || n.sender._id)) || (n.meta && (n.meta.fromAdminId || n.meta.toAdminId));
                      window.location.href = adminId
                        ? `/super-admin/messages?adminId=${encodeURIComponent(String(adminId))}`
                        : '/super-admin/messages';
                    } catch {}
                  }}
                  className="cursor-pointer bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 hover:shadow-lg transition-all"
                >
                  <div className="text-sm font-semibold text-purple-900">{n.sender?.username || n.sender?.adminId || 'Message'}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{n.message || (n.meta && n.meta.preview) || 'New message'}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      

      {!showBatchViewerPanel && (
        <div className={`flex-1 overflow-hidden bg-transparent ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
          
          <div className="flex flex-col md:flex-row gap-6 h-full items-stretch min-h-0">
            {/* Left: side panel (narrow) - hidden on small screens */}
            <main className="hidden md:block md:w-1/5 lg:w-1/5 h-full min-h-0 overflow-auto border-r-4 border-violet-600">
              <nav className="h-full overflow-auto">
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/adminManagement'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center">
                        <FiUserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Admin Management</div>
                        <div className="text-xs text-black-700">Create, update and assign administrators to batches</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-fuchsia-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/batch-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center">
                        <FiLayers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Batch Management</div>
                        <div className="text-xs text-black-700">Create, organize and link batches to departments</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/viewbatches'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-50 text-violet-700 border border-violet-600 flex items-center justify-center">
                        <FiList className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">View Batches</div>
                        <div className="text-xs text-black-700">Browse and inspect batch compositions</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-violet-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center">
                        <FiUsers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Student Management</div>
                        <div className="text-xs text-black-700">Add, update and organize students</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-fuchsia-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/admin-batch-mapping'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center">
                        <FiMap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Admin ↔ Batch Mapping</div>
                        <div className="text-xs text-black-700">Visualize admin ownership across batches</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-purple-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/export'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-violet-50 text-violet-700 border border-violet-600 flex items-center justify-center">
                        <FiDownload className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Export Data</div>
                        <div className="text-xs text-black-700">Download filtered or full Excel exports</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-violet-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/student-analysis'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center">
                        <FiBarChart2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Student Analysis</div>
                        <div className="text-xs text-black-700">Drill into student attendance performance</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-fuchsia-600 mt-3" />
                  </li>

                  <li>
                    <button onClick={() => { window.location.pathname = '/super-admin/messages'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-white/40">
                      <div className="h-10 w-10 rounded-md bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center">
                        <FiMessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-black-900">Messages</div>
                        <div className="text-xs text-black-700">View and reply to admin requests</div>
                      </div>
                    </button>
                    <div className="h-[1px] w-[280px] bg-purple-600 mt-3" />
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