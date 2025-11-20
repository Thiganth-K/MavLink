export default function Footer() {
  const currentYear = new Date().getFullYear();
  const role = localStorage.getItem('role');

  return (
    <footer className="bg-blue-950 text-blue-100 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="text-xl font-bold text-white">MavLink</span>
            </div>
            <p className="text-sm text-blue-200 mb-4">
              A comprehensive student management and attendance tracking system designed to streamline educational administration.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-blue-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-blue-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="#" className="text-blue-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 16.892c-2.102.144-6.784.144-8.883 0C5.282 16.736 5.017 15.622 5 12c.017-3.629.285-4.736 2.558-4.892 2.099-.144 6.782-.144 8.883 0C18.718 7.264 18.982 8.378 19 12c-.018 3.629-.285 4.736-2.559 4.892zM10 9.658l4.917 2.338L10 14.342V9.658z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links - Dynamic based on role */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {role === 'ADMIN' ? (
                <>
                  <li>
                    <a href="/admin-dashboard#home" className="text-blue-200 hover:text-white transition-colors">
                      Home
                    </a>
                  </li>
                  <li>
                    <a href="/admin-dashboard#students" className="text-blue-200 hover:text-white transition-colors">
                      View Students
                    </a>
                  </li>
                  <li>
                    <a href="/admin-dashboard#attendance" className="text-blue-200 hover:text-white transition-colors">
                      View Attendance
                    </a>
                  </li>
                  <li>
                    <a href="/admin-dashboard#mark" className="text-blue-200 hover:text-white transition-colors">
                      Mark Attendance
                    </a>
                  </li>
                </>
              ) : role === 'SUPER_ADMIN' ? (
                <>
                  <li>
                    <a href="/super-admin" className="text-blue-200 hover:text-white transition-colors">
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <a href="/super-admin" className="text-blue-200 hover:text-white transition-colors">
                      Manage Admins
                    </a>
                  </li>
                  <li>
                    <a href="/student-management" className="text-blue-200 hover:text-white transition-colors">
                      Student Management
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="/" className="text-blue-200 hover:text-white transition-colors">
                      Login
                    </a>
                  </li>
                  <li>
                    <a href="#about" className="text-blue-200 hover:text-white transition-colors">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#contact" className="text-blue-200 hover:text-white transition-colors">
                      Contact Support
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span className="text-blue-200">support@mavlink.edu</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-blue-200">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-200">123 Education St, Campus City</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-center items-center">
            <p className="text-sm text-blue-300">
              © {currentYear} MavLink. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
