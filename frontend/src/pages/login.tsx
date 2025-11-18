import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { authAPI, type LoginResponse } from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      
      toast.success(`${response.message}! Welcome ${response.user.username}`);
      
      // Redirect based on role
      setTimeout(() => {
        if (response.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else if (response.role === 'ADMIN') {
          window.location.href = '/admin-dashboard';
        }
      }, 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center ">
      <Toaster position="top-center" />

      <div className=" rounded-3xl shadow-2xl p-10 w-full max-w-md border-4 border-blue-200 outline outline-4 outline-blue-950">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mt-4">MavLink</h2>
          <p className="text-blue-700 text-sm">Please login to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-blue-900 mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-blue-400 rounded-lg bg-blue-50 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-blue-900 mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-blue-400 rounded-lg bg-blue-50 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
