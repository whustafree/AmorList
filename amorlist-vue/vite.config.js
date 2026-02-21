import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Cada vez que Vue pida algo a '/api', Vite lo mandará al puerto 3000 invisiblemente
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})