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
        manualChunks(id) {
          if (id.includes('node_modules/peerjs')) return 'peerjs'
          if (id.includes('node_modules/@vimeo/player')) return 'vimeo'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor'
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
  },
})
