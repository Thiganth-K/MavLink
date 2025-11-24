import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../../services/api';
import { FiBell } from 'react-icons/fi';

export default function AdminNavbar() {
  const firstLetter = (() => {
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      const name = (u && (u.username || u.name || u.adminId)) || 'A';
      return String(name)[0].toUpperCase();
    } catch (e) { return 'A'; }
  })();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const res = await notificationAPI.list();
      const arr = Array.isArray(res) ? res : [];
      setNotifications(arr.slice(0, 20));
      setUnread(arr.filter((n: any) => !n.read).length);
    } catch (e) { console.error('load notifications', e); }
  };

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 10000) as unknown as number;
    const onNotifs = () => { load().catch(() => {}); };
    window.addEventListener('notificationsChanged', onNotifs as EventListener);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); window.removeEventListener('notificationsChanged', onNotifs as EventListener); };
  }, []);

  

  return (
    <nav className="bg-blue-950 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-2xl font-bold text-white">MavLink</span>
          </div>

          <div className="flex items-center gap-2">
            <a href="/admin-dashboard" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">Home</a>
            <a href="/admin-dashboard/view-students" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">View Students</a>
            <a href="/admin-dashboard/view-attendance" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">View Attendance</a>
            <a href="/admin-dashboard/mark-attendance" className="px-4 py-2 rounded-lg font-medium text-blue-200 hover:bg-blue-800 hover:text-white">Mark Attendance</a>

            <div className="relative">
              <button
                onClick={async () => {
                  // toggle open; when opening, just load notifications but DO NOT mark them read.
                  const willOpen = !open;
                  if (willOpen) {
                    try {
                      await load();
                    } catch (e) { /* ignore */ }
                    setOpen(true);
                  } else {
                    setOpen(false);
                  }
                }}
                className="p-2 rounded-full hover:bg-blue-800/40 relative"
                aria-label="Notifications"
              >
                <FiBell size={18} className="text-white" />
                {unread > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unread}</span>}
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white text-black rounded-lg shadow-lg border z-50">
                  <div className="px-3 py-2 border-b font-semibold">Notifications</div>
                  <div className="max-h-60 overflow-auto">
                    {notifications.length === 0 && <div className="p-3 text-sm text-gray-600">No notification</div>}
                    {notifications.map((n: any) => (
                      <button
                        key={n._id || n.id}
                        onClick={() => {
                          try {
                            // Do NOT mark the notification read here. Only navigate to chat.
                            window.location.href = '/admin-dashboard/chat';
                          } catch (e) { console.error(e); }
                        }}
                        className="w-full text-left p-3 border-b flex justify-between items-start gap-2"
                      >
                        <div className="text-sm">{n.message || (n.meta && n.meta.preview) || n.text}</div>
                        {!n.read && <span className="text-xs text-blue-600">New</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              title="Profile"
              aria-label="Toggle profile"
              onClick={() => { try { window.dispatchEvent(new CustomEvent('toggleProfile')); } catch (e) {} }}
              className="ml-4 relative w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow-md"
            >
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">{firstLetter}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
