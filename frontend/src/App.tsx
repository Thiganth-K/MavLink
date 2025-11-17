import Login from './pages/login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import StudentManagement from './pages/StudentManagement';
import './App.css';

function App() {
  // Simple routing based on URL path
  const path = window.location.pathname;

  if (path === '/super-admin') {
    return <SuperAdminDashboard />;
  }

  if (path === '/student-management') {
    return <StudentManagement />;
  }

  // Default to login page
  return <Login />;
}

export default App;
