import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so dist/ works at a domain root (Vercel) or a subpath (GitHub Pages).
  base: './',
})
