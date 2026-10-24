import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Pisahkan library 3D agar cache browser lebih efektif
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three/')) return 'vendor-3d'
          if (id.includes('node_modules/react')) return 'vendor-react'
        },
      },
    },
  },
})
