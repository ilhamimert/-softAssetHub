import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
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
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      },
      '/monitoring': {
        target: 'ws://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    assetsDir: 'static',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          query: ['@tanstack/react-query', 'zustand', 'axios'],
          icons: ['lucide-react'],
          dates: ['date-fns'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
  worker: {

    format: 'es',
  },
  esbuild: {
    target: 'esnext',
    // Production build'de console.log ve debugger'ları kaldır
    ...(mode === 'production' ? { drop: ['console', 'debugger'] } : {}),
  },
}))
