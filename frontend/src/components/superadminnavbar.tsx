import { useEffect, useState, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { FiBell, FiMenu, FiX, FiUserPlus, FiLayers, FiList, FiUsers, FiMap, FiDownload, FiBarChart2, FiMessageSquare } from 'react-icons/fi';
import { FaSignOutAlt } from 'react-icons/fa';

export default function SuperAdminNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const poll = useRef<number | null>(null);

  const load = async () => {
    try {
      const res = await notificationAPI.list();
      const arr = Array.isArray(res) ? res : [];
      // show only superadmin notifications (server filters by role header)
      setNotifications(arr.slice(0, 20));
      setUnread(arr.filter((n: any) => !n.read).length);
    } catch (e) {
      console.error('load notifications', e);
    }
  };

  useEffect(() => {
    load();
    // Refresh notifications every 5 minutes (300000 ms)
    poll.current = window.setInterval(load, 300000) as unknown as number;
    const onNotifs = () => { load().catch(() => {}); };
    window.addEventListener('notificationsChanged', onNotifs as EventListener);
    return () => { if (poll.current) window.clearInterval(poll.current); window.removeEventListener('notificationsChanged', onNotifs as EventListener); };
  }, []);

    // markRead removed to satisfy TS unused

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    try { localStorage.setItem('showLogoutAnimation', 'true'); } catch (e) {}
    window.location.href = '/';
  };

  return (
    <nav className="w-full bg-purple-950 text-supercream shadow-xl mb-0 rounded-none py-3 border-b border-supergreenDark">
      <div className="flex items-center justify-between gap-3 w-full px-6">
        <div className="flex items-center gap-4">
            {/* Hamburger for mobile */}
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 mr-2 rounded-md hover:bg-supergreenAccent/10">
              <FiMenu className="w-6 h-6" />
            </button>
            <svg
              className="w-8 h-8 text-purple-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight">STARS</span>
        </div>
          {mobileOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
              <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 sm:w-80 bg-white p-4 transform translate-x-0 transition-transform duration-300 shadow-lg overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg text-black font-semibold">Menu</div>
                  <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md">
                    <FiX className="w-6 h-6 text-black" />
                  </button>
                </div>
                <nav>
                  <ul className="space-y-3">
                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/adminManagement'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center flex-shrink-0">
                          <FiUserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Admin Management</div>
                          <div className="text-xs text-gray-600">Create, update and assign administrators to batches</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/batch-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center flex-shrink-0">
                          <FiLayers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Batch Management</div>
                          <div className="text-xs text-gray-600">Create, organize and link batches to departments</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/viewbatches'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-700 border border-violet-600 flex items-center justify-center flex-shrink-0">
                          <FiList className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">View Batches</div>
                          <div className="text-xs text-gray-600">Browse and inspect batch compositions</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/student-management'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center flex-shrink-0">
                          <FiUsers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Student Management</div>
                          <div className="text-xs text-gray-600">Add, update and organize students</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/admin-batch-mapping'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center flex-shrink-0">
                          <FiMap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Admin ↔ Batch Mapping</div>
                          <div className="text-xs text-gray-600">Visualize admin ownership across batches</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/export'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-700 border border-violet-600 flex items-center justify-center flex-shrink-0">
                          <FiDownload className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Export Data</div>
                          <div className="text-xs text-gray-600">Download filtered or full Excel exports</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/student-analysis'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center flex-shrink-0">
                          <FiBarChart2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Student Analysis</div>
                          <div className="text-xs text-gray-600">Drill into student attendance performance</div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button onClick={() => { setMobileOpen(false); window.location.pathname = '/super-admin/messages'; }} className="w-full text-left p-3 rounded flex items-start gap-3 hover:bg-gray-50">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center flex-shrink-0">
                          <FiMessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Messages</div>
                          <div className="text-xs text-gray-600">View and reply to admin requests</div>
                        </div>
                      </button>
                    </li>
                  </ul>
                </nav>
              </aside>
            </>
          )}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setOpen(s => !s)}
            className="relative p-2 rounded-full hover:bg-supergreenAccent/20"
            aria-label="Notifications"
          >
            <FiBell size={20} />
            {unread > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unread}</span>}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white text-black rounded-lg shadow-lg border overflow-hidden z-50">
              <div className="px-4 py-2 border-b font-semibold">Notifications</div>
              <div className="max-h-64 overflow-auto">
                {notifications.length === 0 && <div className="p-4 text-sm text-gray-600">No notification</div>}
                {notifications.map(n => (
                  <button
                    key={n._id || n.id}
                    onClick={() => {
                      try {
                        const adminId = (n.sender && n.sender.adminId) || (n.meta && (n.meta.fromAdminId || n.meta.toAdminId));
                        if (adminId) {
                          window.location.href = `/super-admin/messages?adminId=${encodeURIComponent(adminId)}`;
                        } else {
                          window.location.href = '/super-admin/messages';
                        }
                        setOpen(false);
                      } catch (e) { console.error(e); }
                    }}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 flex justify-between items-start gap-2 ${n.read ? '' : 'bg-white'}`}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.sender?.username || n.sender?.adminId || 'Message'}</div>
                      <div className="text-xs text-gray-600 mt-1">{n.message || (n.meta && n.meta.preview) || ''}</div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {!n.read && <span className="text-xs text-violet-600">New</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logout button moved outside the dropdown so it's always visible */}
          <button onClick={logout} className="ml-2 px-3 py-1 bg-red-50 text-red-700 border border-red-600 hover:bg-red-50 rounded flex items-center">
            <FaSignOutAlt className="w-4 h-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
