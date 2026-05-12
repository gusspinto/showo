import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'assets/index.css' : 'assets/[name][extname]',
      },
    },
  },
})
