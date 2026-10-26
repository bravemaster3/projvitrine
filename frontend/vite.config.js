import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // Local development: forward API and media requests to Django (manage.py runserver).
    proxy: {
      '/api': process.env.DEV_API_PROXY || 'http://localhost:8000',
      '/media': process.env.DEV_API_PROXY || 'http://localhost:8000',
    },
  },
  build: {
    sourcemap: false,
    target: ['es2020'],
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'i18next', 'react-i18next', 'axios'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
})



