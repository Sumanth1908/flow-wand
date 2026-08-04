import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@xyflow')) {
              return 'xyflow';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-react';
            }
            if (id.includes('@mui')) {
              return 'mui';
            }
            if (id.includes('@emotion')) {
              return 'emotion';
            }
            if (id.includes('html-to-image')) {
              return 'snapshot-export';
            }
            if (id.includes('dagre')) {
              return 'dagre';
            }
            if (id.includes('zustand')) {
              return 'zustand';
            }
            if (id.includes('/uuid/')) {
              return 'uuid';
            }
          }
        },
      },
    },
  },
})
