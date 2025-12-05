import { FiHome } from 'react-icons/fi';
import { FaUsers, FaCalendarAlt } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const role = localStorage.getItem('role');

  return (
    <footer className="bg-purple-950 text-purple-100 mt-auto">
      <div className="w-full mx-0 px-4 sm:px-6">
        <div className=" mx-auto py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-purple-800">
            {/* About Section */}
            <div className="py-4 md:py-0 md:px-6">
              <div className="flex items-center gap-2 mb-4">
                  <img src="/stars-logo.png" alt="STARS" className="w-8 h-8 object-contain" />
                  <span className="text-xl font-bold text-white">STARS</span>
                </div>
              <p className="text-sm text-purple-200 mb-4">
                STARS — a secure, easy-to-use platform for administrators to manage batches, students, attendance and reports efficiently.
              </p>
              {/* social icons removed per UI preference */}
            </div>

            {/* Quick Links - Dynamic based on role */}
            <div className="py-4 md:py-0 md:px-6">
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                {role === 'ADMIN' ? (
                  <>
                    <li>
                      <a href="/admin-dashboard" className="text-purple-200 hover:text-white transition-colors flex items-center gap-2">
                        <FiHome className="text-purple-300" />
                        <span>Home</span>
                      </a>
                    </li>
                    <li>
                      <a href="/admin-dashboard/view-students" className="text-purple-200 hover:text-white transition-colors flex items-center gap-2">
                        <FaUsers className="text-purple-300" />
                        <span>View Students</span>
                      </a>
                    </li>
                    <li>
                      <a href="/admin-dashboard/view-attendance" className="text-purple-200 hover:text-white transition-colors flex items-center gap-2">
                        <FaCalendarAlt className="text-purple-300" />
                        <span>View Attendance</span>
                      </a>
                    </li>
                    <li>
                      <a href="/admin-dashboard/mark-attendance" className="text-purple-200 hover:text-white transition-colors flex items-center gap-2">
                        <MdEdit className="text-purple-300" />
                        <span>Mark Attendance</span>
                      </a>
                    </li>
                  </>
                ) : role === 'SUPER_ADMIN' ? (
                  <>
                    <li>
                      <a href="/super-admin" className="text-purple-200 hover:text-white transition-colors">
                        Dashboard
                      </a>
                    </li>
                    <li>
                      <a href="/super-admin" className="text-purple-200 hover:text-white transition-colors">
                        Manage Admins
                      </a>
                    </li>
                    <li>
                      <a href="/student-management" className="text-purple-200 hover:text-white transition-colors">
                        Student Management
                      </a>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <a href="/" className="text-purple-200 hover:text-white transition-colors">
                        Login
                      </a>
                    </li>
                    <li>
                      <a href="#about" className="text-purple-200 hover:text-white transition-colors">
                        About Us
                      </a>
                    </li>
                    <li>
                      <a href="#contact" className="text-purple-200 hover:text-white transition-colors">
                        Contact Support
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="py-4 md:py-0 md:px-6">
              <h3 className="text-white font-semibold mb-4">Contact Us</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-purple-200">support@STARS.edu</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-purple-200">+1 (555) 123-4567</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-purple-200">123 Education St, Campus City</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-purple-800 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-center items-center">
              <p className="text-sm text-purple-300">© {currentYear} STARS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
