import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split large third-party libraries into their own chunks so the
    // initial bundle stays small and loads fast.
    rollupOptions: {
      output: {
        manualChunks: {
          peerjs: ['peerjs'],
          vimeo: ['@vimeo/player'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
  },
})
