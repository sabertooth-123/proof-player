import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { createLeanHandler } from './scripts/lean-api.mjs'

/**
 * Dev server only (`npm run dev`): lets the app open any .lean file by running the
 * real extractor on it with the Lean installed on this machine. The same handler runs
 * publicly in lean-server/ (with strict checks) for the live site.
 */
function leanUpload(): Plugin {
  return {
    name: 'proof-player-lean-upload',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createLeanHandler({ timeoutMs: 30_000 }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), leanUpload()],
  // Relative asset paths, so dist/ works at a domain root (Vercel) or a subpath (GitHub Pages).
  base: './',
})
