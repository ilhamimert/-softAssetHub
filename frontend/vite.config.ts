import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    hmr: { overlay: true },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
      '/monitoring': {
        target: 'ws://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // Sanal RAM sayesinde daha büyük chunk limiti
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          query: ['@tanstack/react-query', 'zustand', 'axios'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
  // Worker sayısı: sanal RAM ile daha fazla paralel işlem
  worker: {
    format: 'es',
  },
  esbuild: {
    target: 'esnext',
  },
})
