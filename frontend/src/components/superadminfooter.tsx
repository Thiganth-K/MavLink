import { FiUserPlus, FiLayers, FiUsers, FiMap, FiList, FiDownload, FiBarChart2, FiMessageSquare, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function SuperAdminFooter() {
  return (
    <footer className="w-full bg-purple-950 text-supercream text-sm">
      <div className="w-full py-6 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-start divide-y divide-purple-100 md:divide-y-0 md:divide-x md:divide-purple-100">

          {/* 1. Short description */}
          <div className="py-4 md:py-0 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <h4 className="font-semibold text-white">MavLink</h4>
            </div>
            <p className="text-sm text-supercream/90">MavLink helps admins and super admins manage batches, students and attendance with a simple modern interface.</p>
          </div>

          {/* 2. First nav group */}
          <div className="py-4 md:py-0 md:px-4">
            <h5 className="font-semibold text-white mb-2 underline decoration-2 decoration-white underline-offset-4">Management</h5>
            <ul className="space-y-2">
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/adminManagement'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiUserPlus /> <span>Admin Management</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/batch-management'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiLayers /> <span>Batch Management</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/student-management'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiUsers /> <span>Student Management</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/admin-batch-mapping'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiMap /> <span>Admin-Batch Mapping</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 3. Second nav group */}
          <div className="py-4 md:py-0 md:px-4">
            <h5 className="font-semibold text-white mb-2 underline decoration-2 decoration-white underline-offset-4">Explore</h5>
            <ul className="space-y-2">
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/viewbatches'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiList /> <span>View Batches</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/export'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiDownload /> <span>Export Data</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/student-analysis'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiBarChart2 /> <span>Student Analysis</span>
                </button>
              </li>
              <li>
                <button onClick={() => { window.location.pathname = '/super-admin/messages'; }} className="flex items-center gap-2 text-supercream hover:text-white">
                  <FiMessageSquare /> <span>Messages</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 4. Contact */}
          <div className="py-4 md:py-0 md:px-4">
            <h5 className="font-semibold text-white mb-2 underline decoration-2 decoration-white underline-offset-4">Contact</h5>
            <ul className="space-y-2 text-supercream">
              <li className="flex items-center gap-2"><FiMail /> <a className="underline" href="mailto:support@mavlink.example">support@mavlink.example</a></li>
              <li className="flex items-center gap-2"><FiPhone /> <a href="tel:+1234567890">+1 234 567 890</a></li>
              <li className="flex items-center gap-2"><FiMapPin /> <span>123 College Road, City</span></li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}
