import Login from './pages/login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/StudentManagement';
import SuperAdminNavbar from './components/superadminnavbar';
import SuperAdminFooter from './components/superadminfooter';
import './App.css';

function App() {
  // Simple routing based on URL path
  const path = window.location.pathname;

  if (path === '/super-admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <SuperAdminNavbar onLogout={() => {}} />
        <SuperAdminDashboard />
        <SuperAdminFooter />
      </div>
    );
  }

  if (path === '/admin-dashboard') {
    return (
      <div className="min-h-screen flex flex-col">
       
        <AdminDashboard />
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

  // Default to login page
  return <Login />;
}

export default App;
