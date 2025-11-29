import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
