import React, { useEffect, useState, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { FiBell } from 'react-icons/fi';

interface Props { onLogout?: () => void; }

export default function SuperAdminNavbar({ onLogout }: Props) {
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
    poll.current = window.setInterval(load, 10000) as unknown as number;
    const onNotifs = () => { load().catch(() => {}); };
    window.addEventListener('notificationsChanged', onNotifs as EventListener);
    return () => { if (poll.current) window.clearInterval(poll.current); window.removeEventListener('notificationsChanged', onNotifs as EventListener); };
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      await load();
    } catch (e) { console.error(e); }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    try { localStorage.setItem('showLogoutAnimation', 'true'); } catch (e) {}
    window.location.href = '/';
  };

  return (
    <nav className="w-full bg-supergreen text-supercream shadow-xl mb-0 rounded-none py-4 border-b border-supergreenDark">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold tracking-tight">MavLink</span>
          <span className="hidden sm:inline-block h-6 w-px bg-supergreenAccent" />
          <span className="text-lg font-semibold">Super Admin Dashboard</span>
        </div>
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
                    onClick={async () => {
                      try {
                        // mark notification removed on server first
                        await notificationAPI.markRead(n._id || n.id).catch(() => {});
                        // redirect to conversation with the admin who sent the message
                        const adminId = (n.sender && n.sender.adminId) || (n.meta && (n.meta.fromAdminId || n.meta.toAdminId));
                        if (adminId) {
                          window.location.href = `/super-admin/messages?adminId=${encodeURIComponent(adminId)}`;
                        } else {
                          // fallback: reload notifications
                          await load();
                        }
                      } catch (e) { console.error(e); }
                    }}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 flex justify-between items-start gap-2 ${n.read ? '' : 'bg-white'}`}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.sender?.username || n.sender?.adminId || 'Message'}</div>
                      <div className="text-xs text-gray-600 mt-1">{n.message || (n.meta && n.meta.preview) || ''}</div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {!n.read && <span className="text-xs text-blue-600">New</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logout button moved outside the dropdown so it's always visible */}
          <button onClick={logout} className="ml-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">Logout</button>
        </div>
      </div>
    </nav>
  );
}
