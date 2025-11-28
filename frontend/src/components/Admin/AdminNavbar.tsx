import React from 'react';
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

  const [open, setOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unread, setUnread] = React.useState(0);
  const pollRef = React.useRef<number | null>(null);
  const notifRef = React.useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await notificationAPI.list();
      const arr = Array.isArray(res) ? res : [];
      setNotifications(arr.slice(0, 20));
      setUnread(arr.filter((n: any) => !n.read).length);
    } catch (e) { console.error('load notifications', e); }
  };

  React.useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 10000) as unknown as number;
    const onNotifs = () => { load().catch(() => {}); };
    window.addEventListener('notificationsChanged', onNotifs as EventListener);
    // close notifications when clicking/tapping outside
    const onPointerDown = (e: any) => {
      try {
        if (!notifRef.current) return;
        if (!notifRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      } catch (err) {}
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); window.removeEventListener('notificationsChanged', onNotifs as EventListener); };
  }, []);

  

  return (
    <nav className="bg-violet-950 shadow-lg sticky top-0 z-50 h-16">
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-6px) rotate(-6deg); }
          40% { transform: translateX(6px) rotate(6deg); }
          60% { transform: translateX(-4px) rotate(-3deg); }
          80% { transform: translateX(4px) rotate(3deg); }
          100% { transform: translateX(0) rotate(0); }
        }
        .shake-hover:hover .bell-icon,
        .shake-hover:active .bell-icon {
          animation: shake 0.6s ease-in-out;
          transform-origin: center;
        }
      `}</style>
      <div className="w-full mx-0 px-3 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-violet-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-2xl font-bold text-white">MavLink</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <a href="/admin-dashboard" className="px-4 py-2 rounded-lg font-medium text-violet-200 hover:bg-violet-800 hover:text-white">Home</a>
              <a href="/admin-dashboard/view-students" className="px-4 py-2 rounded-lg font-medium text-violet-200 hover:bg-violet-800 hover:text-white">View Students</a>
              <a href="/admin-dashboard/view-attendance" className="px-4 py-2 rounded-lg font-medium text-violet-200 hover:bg-violet-800 hover:text-white">View Attendance</a>
              <a href="/admin-dashboard/mark-attendance" className="px-4 py-2 rounded-lg font-medium text-violet-200 hover:bg-violet-800 hover:text-white">Mark Attendance</a>
            </div>
            {mobileOpen && (
              <div className="absolute top-full left-0 right-0 bg-violet-950 text-white shadow-lg md:hidden z-50">
                <div className="px-4 py-3 border-b border-violet-900">
                  <a href="/admin-dashboard" className="block px-2 py-2 rounded-md">Home</a>
                  <a href="/admin-dashboard/view-students" className="block px-2 py-2 rounded-md">View Students</a>
                  <a href="/admin-dashboard/view-attendance" className="block px-2 py-2 rounded-md">View Attendance</a>
                  <a href="/admin-dashboard/mark-attendance" className="block px-2 py-2 rounded-md">Mark Attendance</a>
                </div>
              </div>
            )}
            {/* Mobile hamburger */}
            <button aria-label="Open menu" onClick={() => setMobileOpen(v => !v)} className="md:hidden p-2 rounded-md text-white hover:bg-violet-800/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
            </button>

            <div className="relative" ref={notifRef}>
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
                className="p-2 rounded-full hover:bg-violet-800/40 relative flex items-center justify-center shake-hover"
                aria-label="Notifications"
              >
                <span className="relative inline-flex items-center justify-center transform transition-transform duration-200 hover:scale-110 active:scale-95">
                  {unread > 0 && <span className="absolute -inset-1 rounded-full bg-yellow-400/30 animate-ping" aria-hidden />}
                  <FiBell size={18} className="text-white relative z-10 bell-icon" />
                  {unread > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full z-20">{unread}</span>}
                </span>
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
                        {!n.read && <span className="text-xs text-violet-600">New</span>}
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
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold">{firstLetter}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
