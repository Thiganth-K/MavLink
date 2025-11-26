import { useEffect, useState } from 'react';
import Login from './pages/login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminMessages from './pages/SuperAdminMessages';
import AdminManagementPage from './pages/AdminManagementPage';
import BatchManagementPage from './pages/BatchManagementPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminChat from './components/AdminChat';
import StudentManagement from './pages/StudentManagement';
import ViewAttendance from './pages/Admin/ViewAttendance';
import MarkAttendance from './pages/Admin/MarkAttendance';
import ViewStudents from './pages/Admin/ViewStudents';
import SuperAdminNavbar from './components/superadminnavbar';
import SuperAdminFooter from './components/superadminfooter';
import AdminNavbar from './components/Admin/AdminNavbar';
import AdminFooter from './components/Admin/AdminFooter';
import AdminProfile from './components/Admin/AdminProfile';
import { adminAPI, batchAPI, studentAPI } from './services/api';
import Loader from './components/Admin/AdminLoader';
import ViewAnalysisPage from './pages/ViewAnalysisPage';
import ViewBatchesPage from './pages/ViewBatchesPage';
import AdminBatchMappingPage from './pages/AdminBatchMapping';
import StudentAnalysisDashboard from './pages/StudentAnalysisDashboard';
import SuperAdminExport from './pages/SuperAdminExport';

function App() {
  useEffect(() => {
    // Provide global loader helpers so any admin page can call them
    let refCount = 0;
    const minMs = 300;
    let firstShownAt: number | null = null;
    let targetWatcher: number | null = null;

    (window as any).showGlobalLoader = (targetId?: string) => {
      refCount = Math.max(0, refCount) + 1;
      const el = document.getElementById('global-loader');
      if (el) {
        el.style.display = 'flex';
        if (!firstShownAt) firstShownAt = Date.now();
      }

      if (targetWatcher) {
        window.clearInterval(targetWatcher);
        targetWatcher = null;
      }

      if (targetId) {
        targetWatcher = window.setInterval(() => {
          try {
            const target = document.getElementById(targetId);
            if (!target) return;
            const style = window.getComputedStyle(target);
            if (style && style.display !== 'none' && style.visibility !== 'hidden' && target.offsetParent !== null) {
              if (targetWatcher) { window.clearInterval(targetWatcher); targetWatcher = null; }
              (window as any).hideGlobalLoader();
            }
          } catch (e) {}
        }, 120) as unknown as number;
      }
    };

    (window as any).hideGlobalLoader = () => {
      refCount = Math.max(0, refCount - 1);
      const el = document.getElementById('global-loader');
      if (!el) return;
      if (targetWatcher) { window.clearInterval(targetWatcher); targetWatcher = null; }
      if (refCount === 0) {
        const elapsed = firstShownAt ? Date.now() - firstShownAt : minMs;
        const remaining = Math.max(0, minMs - elapsed);
        setTimeout(() => {
          try {
            window.requestAnimationFrame(() => { window.requestAnimationFrame(() => { el.style.display = 'none'; firstShownAt = null; }); });
          } catch (e) { el.style.display = 'none'; firstShownAt = null; }
        }, remaining);
      }
    };

    (window as any).hideGlobalLoaderImmediate = () => {
      try { refCount = 0; firstShownAt = null; const el = document.getElementById('global-loader'); if (el) el.style.display = 'none'; } catch (e) {}
    };

    // Ensure overlay is hidden right after registration to clear any stuck state
    try { (window as any).hideGlobalLoaderImmediate && (window as any).hideGlobalLoaderImmediate(); } catch (e) {}

    return () => {
      try { delete (window as any).showGlobalLoader; delete (window as any).hideGlobalLoader; delete (window as any).hideGlobalLoaderImmediate; } catch (e) {}
    };
  }, []);

  // Simple routing based on URL path
  const path = window.location.pathname;

  // Profile state shared across all admin pages
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<{ username: string; password?: string | null; batches: Array<{ batchId?: string; batchName?: string; dept?: string; studentCount?: number }>; } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogout = async () => {
    try { localStorage.removeItem('user'); localStorage.removeItem('role'); localStorage.removeItem('password'); localStorage.setItem('showLogoutAnimation', 'true'); } catch (e) {}
    window.location.href = '/';
  };

  const openProfile = async () => {
    setShowProfile(true);
    if (profileData) return;
    setProfileLoading(true);
    try { (window as any).showGlobalLoader && (window as any).showGlobalLoader('profile-data'); } catch (e) {}
    try {
      let apiProfile: { username?: string; adminId?: string; assignedBatchIds?: string[]; password?: string } | null = null;
      try { const res = await adminAPI.getProfile(); apiProfile = res.profile || null; } catch (err) { apiProfile = null; }

      const assignedIds: string[] = (apiProfile && Array.isArray(apiProfile.assignedBatchIds)) ? apiProfile.assignedBatchIds : [];
      const all = await batchAPI.getBatches();
      const myBatches = all.filter(b => assignedIds.includes(b.batchId || ''));

      const batchesWithCounts: Array<{ batchId?: string; batchName?: string; dept?: string; studentCount?: number }> = [];
      for (const b of myBatches) {
        let count = 0;
        if (Array.isArray((b as any).students) && (b as any).students.length >= 0) {
          count = (b as any).students.length;
        } else {
          try { const students = await studentAPI.getStudents(b.batchId); count = Array.isArray(students) ? students.length : 0; } catch (err) { count = 0; }
        }
        batchesWithCounts.push({ batchId: b.batchId, batchName: b.batchName, dept: (b as any).deptId || undefined, studentCount: count });
      }

      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : {};
      const possiblePassword = (apiProfile && apiProfile.password) ?? null;
      const usernameToShow = (apiProfile && apiProfile.username) ? apiProfile.username : (user.username || user.adminId || 'Admin');
      setProfileData({ username: usernameToShow, password: possiblePassword, batches: batchesWithCounts });
    } catch (e) {
      setProfileData({ username: 'Admin', password: null, batches: [] });
    } finally {
      setProfileLoading(false);
      try { (window as any).hideGlobalLoader && (window as any).hideGlobalLoader(); } catch (e) {}
    }
  };

  const closeProfile = () => setShowProfile(false);

  // Listen for navbar toggle to open/close profile globally for admin routes
  useEffect(() => {
    const onToggle = () => {
      try { if (showProfile) closeProfile(); else openProfile(); } catch (e) {}
    };
    window.addEventListener('toggleProfile', onToggle as EventListener);
    return () => window.removeEventListener('toggleProfile', onToggle as EventListener);
  }, [showProfile, profileData]);

  if (path === '/super-admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <SuperAdminDashboard />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/messages') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <SuperAdminMessages />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/adminManagement') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <AdminManagementPage />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/batchManagement') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <BatchManagementPage />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path.startsWith('/admin-dashboard')) {
    let content: any = null;
    if (path === '/admin-dashboard') content = <AdminDashboard />;
    else if (path === '/admin-dashboard/chat') content = <div className="max-w-7xl mx-auto p-6 flex-grow"><AdminChat /></div>;
    else if (path === '/admin-dashboard/view-attendance') content = <div className="max-w-7xl mx-auto p-6 flex-grow"><ViewAttendance /></div>;
    else if (path === '/admin-dashboard/mark-attendance') content = <div className="max-w-7xl mx-auto p-6 flex-grow"><MarkAttendance /></div>;
    else if (path === '/admin-dashboard/view-students') content = <div className="max-w-7xl mx-auto p-6 flex-grow"><ViewStudents /></div>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-200 flex flex-col">
        <AdminNavbar />
        <div id="global-loader" style={{ display: 'none' }} className="fixed inset-0 z-50 bg-black/40 items-center justify-center">
          <div className="w-full h-full flex items-center justify-center">
            <Loader />
          </div>
        </div>

        {/* Global profile drawer (available on all admin pages) */}
        {showProfile && (
          <div className="fixed inset-0 z-60 flex">
            <div className="absolute inset-0 bg-black/40" onClick={closeProfile} />
            <aside className="absolute right-0 top-16 bottom-0 w-full max-w-sm bg-white shadow-xl p-6 transform transition-transform" role="dialog" aria-label="Profile panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-950">Profile</h3>
              </div>
              <AdminProfile profileLoading={profileLoading} profileData={profileData} showPassword={showPassword} setShowPassword={setShowPassword} onLogout={handleLogout} />
            </aside>
          </div>
        )}

        {content}
        <AdminFooter />
      </div>
    );
  }

  if (path === '/student-management') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <StudentManagement />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/viewanalysis') {
    return <ViewAnalysisPage />;
  }

  if (path === '/super-admin/student-analysis') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <StudentAnalysisDashboard />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/export') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <SuperAdminExport />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/viewbatches') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <ViewBatchesPage />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/super-admin/admin-batch-mapping') {
    return <AdminBatchMappingPage />;
  }

  // Default to login page
  return <Login />;
}

export default App;
