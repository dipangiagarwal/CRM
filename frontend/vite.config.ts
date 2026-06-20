import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://crm-3-p5xh.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://crm-3-p5xh.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
