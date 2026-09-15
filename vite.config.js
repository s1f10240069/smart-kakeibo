import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages版は従来のサブパス、Cloudflare Pages版は同一生成元APIを使えるルート配信。
  base: process.env.GITHUB_ACTIONS ? '/smart-kakeibo/' : '/',
})
