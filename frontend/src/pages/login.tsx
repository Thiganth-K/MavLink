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
        @keyframes gradientShift { 
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-anim { background: linear-gradient(90deg,#fb7185,#a21caf,#6366f1); background-size:200% 200%; animation: gradientShift 3s linear infinite; }
        .gradient-anim-inner { background: linear-gradient(90deg,#6366f1,#a21caf,#fb7185); background-size:200% 200%; animation: gradientShift 3s linear infinite; }
        .gradient-ripple { background: linear-gradient(90deg,#fb7185,#a21caf,#6366f1); background-size:200% 200%; opacity:0.28; }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1] flex items-center justify-center">
        <Toaster position="top-center" />
        <div className="rounded-3xl p-[2px] bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1] w-full max-w-md">
          <div className="rounded-3xl shadow-2xl p-10 relative bg-gray-50 border border-gray-200 text-black">
          {/* Success Animation Overlay inside the box */}
          {showSuccess && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-black/60">
              <div>
                <div className="relative">
                  {/* Outer Circle with scale animation */}
                  <div className="w-24 h-24 gradient-anim rounded-full flex items-center justify-center animate-scale-in">
                    {/* Inner colored circle with gradient */}
                    <div className="w-20 h-20 gradient-anim-inner rounded-full flex items-center justify-center ring-2 ring-white">
                      {/* Checkmark in white with draw animation */}
                      <svg
                        className="w-12 h-12"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          className="animate-draw-check"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Success ripple effect (gradient) */}
                  <div className="absolute inset-0 w-24 h-24 rounded-full gradient-ripple animate-ripple"></div>
                </div>
              </div>
              {/* Success Text */}
              <p className="mt-6 text-xl font-bold text-white">
                {animationType === 'login' ? 'Logged in Successfully!!' : 'Logged out Successfully!!'}
              </p>
            </div>
          )}

            <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center shadow-md ring-1 ring-white/20">
              <svg className="w-10 h-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#a21caf" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <path fill="url(#logoGrad)" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1]">MavLink</h2>
            <p className="text-black/70 text-sm">Please login to continue</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 font-medium bg-clip-text text-transparent bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              className="w-full px-4 py-3 rounded-lg text-black placeholder:text-black/60 outline-none"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #fb7185, #a21caf, #6366f1) border-box',
                border: '1px solid transparent'
              }}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium bg-clip-text text-transparent bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-3 rounded-lg text-black placeholder:text-black/60 outline-none"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #fb7185, #a21caf, #6366f1) border-box',
                border: '1px solid transparent'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-l from-[#fb7185] via-[#a21caf] to-[#6366f1] text-white font-semibold rounded-lg shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
