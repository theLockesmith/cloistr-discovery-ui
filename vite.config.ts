import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@cloistr/auth'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://discover.cloistr.xyz',
        changeOrigin: true,
      },
    },
  },
})
