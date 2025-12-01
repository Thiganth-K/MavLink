import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy `/api` requests during development to the backend server.
    // Uses VITE_API_BASE_URL (if set) or falls back to localhost:5001.
    proxy: (() => {
      // Default backend dev port is 3000 in this repo (check backend/.env)
      const raw = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const target = String(raw).replace(/\/api\/?$/, '');
      return {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          // keep path as-is
        }
      };
    })()
  },
  build: {
    chunkSizeWarningLimit: 1200, // raise threshold for warnings
    rollupOptions: {
      output: {
        manualChunks: {
          // Split common vendor libs to reduce main chunk size
          react: ['react', 'react-dom'],
          charts: ['chart.js'],
        }
      }
    }
  }
})
