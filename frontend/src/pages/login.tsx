import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { authAPI, type LoginResponse } from "../services/api";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animationType, setAnimationType] = useState<'login' | 'logout'>('login');

  // Check for logout animation flag
  React.useEffect(() => {
    const showLogoutAnim = localStorage.getItem('showLogoutAnimation');
    if (showLogoutAnim === 'true') {
      setAnimationType('logout');
      setShowSuccess(true);
      toast.success('Logged out successfully!');
      localStorage.removeItem('showLogoutAnimation');
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response: LoginResponse = await authAPI.login(username, password);
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('role', response.role);
      localStorage.setItem('showLoginAnimation', 'true');
      
      // Show success animation
      setAnimationType('login');
      setShowSuccess(true);
      toast.success(`${response.message}! Welcome ${response.user.username}`);
      
      // Redirect based on role
      setTimeout(() => {
        if (response.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else if (response.role === 'ADMIN') {
          window.location.href = '/admin-dashboard';
        }
      }, 2000);
      
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes scaleIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes drawCheck { 0% { stroke-dashoffset: 30; } 100% { stroke-dashoffset: 0; } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; }
        .animate-draw-check { animation: drawCheck 0.6s ease-out 0.3s forwards; stroke-dasharray: 30; stroke-dashoffset: 30; }
        .animate-ripple { animation: ripple 1s ease-out infinite; }

        /* Use standard ::placeholder only (gray) and avoid vendor-prefixed selectors */
        .login-input::placeholder { color: #6B7280 !important; opacity: 1 !important; }
      `}</style>

      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Toaster position="top-center" />
        <div className="rounded-3xl p-[2px] bg-gradient-to-r from-fuchsia-700 to-purple-600 w-full max-w-md">
          <div className="rounded-3xl shadow-2xl p-6 sm:p-10 relative bg-white border border-transparent text-black">
          {/* Success Animation Overlay inside the box */}
          {showSuccess && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-4">
              <div className="p-4 sm:p-6">
                <div className="relative">
                  {/* Outer Circle with scale animation */}
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center animate-scale-in ${animationType === 'logout' ? 'bg-gradient-to-r from-red-600 to-red-800' : 'bg-gradient-to-r from-fuchsia-700 to-purple-600'}`}>
                    {/* Inner colored circle */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ring-2 ring-white bg-white">
                      {/* Checkmark with gradient stroke and draw animation */}
                      <svg
                        className="w-10 h-10 sm:w-12 sm:h-12"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <defs>
                          <linearGradient id="tickGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#C026D3" />
                            <stop offset="100%" stopColor="#7C3AED" />
                          </linearGradient>
                          <linearGradient id="tickGradLogout" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#F43F5E" />
                            <stop offset="100%" stopColor="#991B1B" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M5 13l4 4L19 7"
                          className="animate-draw-check"
                          stroke={animationType === 'logout' ? 'url(#tickGradLogout)' : 'url(#tickGrad)'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Success ripple effect */}
                  <div className={`absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full opacity-30 animate-ripple ${animationType === 'logout' ? 'bg-gradient-to-r from-red-600 to-red-800' : 'bg-gradient-to-r from-fuchsia-700 to-purple-600'}`}></div>
                </div>
              </div>
              {/* Success Text */}
              <p className="mt-6 text-xl font-bold text-white">
                {animationType === 'login' ? 'Logged in Successfully!!' : 'Logged out Successfully!!'}
              </p>
            </div>
          )}

            <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-md bg-white">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-black" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 text-black">MavLink</h2>
            <p className="text-black text-sm">Please login to continue</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" spellCheck={false}>
          <div>
            <label className="block mb-1 font-medium text-black">Username</label>
            <div className="rounded-lg border border-black">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="login-input w-full px-4 py-3 rounded-md text-black placeholder:text-gray-500 caret-black outline-none border-none"
                  style={{ color: '#000', backgroundColor: '#fff' }}
                  autoComplete="off"
                  spellCheck={false}
                />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-black">Password</label>
            <div className="rounded-lg bg-white border border-black relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="login-input w-full px-4 py-3 rounded-md bg-white text-black placeholder:text-gray-100 caret-black outline-none border-none"
                  style={{ color: '#000', backgroundColor: '#fff' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-fuchsia-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white text-fuchsia-700 border-2 border-fuchsia-700 font-semibold rounded-lg shadow-md hover:bg-fuchsia-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
          </div>
        </div>
      </div>
    </>
  );
}
