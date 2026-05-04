import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/smart-kakeibo/',
  server: {
    proxy: {
      // GitHub Device Flow エンドポイント (CORS回避)
      '/github-auth': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-auth/, ''),
      },
    },
  },
})
