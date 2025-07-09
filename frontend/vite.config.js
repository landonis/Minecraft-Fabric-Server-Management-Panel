import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
