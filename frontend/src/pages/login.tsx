import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { authAPI, type LoginResponse } from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes drawCheck {
          0% {
            stroke-dashoffset: 30;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }
        .animate-draw-check {
          animation: drawCheck 0.6s ease-out 0.3s forwards;
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
        }
        .animate-ripple {
          animation: ripple 1s ease-out infinite;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-white to-violet-100 flex items-center justify-center ">
        <Toaster position="top-center" />

        <div className="rounded-3xl shadow-2xl p-10 w-full max-w-md border-4 border-violet-200 outline outline-4 outline-violet-950 relative bg-white">
          {/* Success Animation Overlay inside the box */}
          {showSuccess && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm bg-white/30">
              <div>
                <div className="relative">
                  {/* Outer Circle with scale animation */}
                  <div className="w-24 h-24 bg-violet-500 rounded-full flex items-center justify-center animate-scale-in">
                    {/* Inner white circle */}
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                      {/* Checkmark with draw animation */}
                      <svg
                        className="w-16 h-16 text-violet-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          className="animate-draw-check"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Success ripple effect */}
                  <div className="absolute inset-0 w-24 h-24 bg-violet-400 rounded-full animate-ripple"></div>
                </div>
              </div>
              {/* Success Text */}
              <p className="mt-6 text-xl font-bold text-violet-700">
                {animationType === 'login' ? 'Logged in Successfully!!' : 'Logged out Successfully!!'}
              </p>
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-violet-900 mt-4">MavLink</h2>
          <p className="text-violet-700 text-sm">Please login to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-violet-900 mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-violet-400 rounded-lg bg-violet-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
              required
            />
          </div>

          <div>
            <label className="block text-violet-900 mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-violet-400 rounded-lg bg-violet-50 text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-violet-700 text-white font-semibold rounded-lg shadow-md hover:bg-violet-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
