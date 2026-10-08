import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 5180 端口：避开 5173-5179
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180 },
})
