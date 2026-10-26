import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { 
    host: '0.0.0.0'
  },
  define: {
    'process.env': {}
  },
  build: {
    sourcemap: false,
    target: ['es2020'],
  },
  test: {
    environment: 'jsdom',
  },
  optimizeDeps: {
    exclude: ['axios', 'react-icons/ai', 'react-icons/fa6'],
  },
})



