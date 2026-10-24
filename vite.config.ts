import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import { buildTrace, ExtractError, guessViz, leanVersion, theoremName } from './scripts/extract-traces.mjs'

const MAX_UPLOAD_BYTES = 200_000
const UPLOAD_TIMEOUT_MS = 30_000 // Lean runs synchronously; a runaway file must not freeze the dev server

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_UPLOAD_BYTES) reject(new ExtractError('file is too large (max 200 KB)'))
      else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Dev server only (`npm run dev`): lets the app open any .lean file by running the
 * real extractor on it with the Lean installed on this machine.
 *   GET  /api/lean     -> { available, version } (the app hides the button if this fails)
 *   POST /api/extract  -> body { name, source }; returns { trace } or { error }
 * The static build on Vercel has neither route, so uploading is a local-demo feature.
 */
function leanUpload(): Plugin {
  return {
    name: 'proof-player-lean-upload',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/lean', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          res.end(JSON.stringify({ available: true, version: leanVersion() }))
        } catch (e) {
          res.end(JSON.stringify({ available: false, error: (e as Error).message }))
        }
      })

      server.middlewares.use('/api/extract', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'POST a { name, source } body' }))
        }
        try {
          const { name, source } = JSON.parse(await readBody(req)) as { name?: string; source?: string }
          if (typeof source !== 'string' || !source.trim()) throw new ExtractError('the file is empty')
          const fileName = typeof name === 'string' && name ? name : 'upload.lean'
          const slug = fileName.replace(/\.lean$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 40)
          const meta = {
            id: `upload-${slug}-${Date.now().toString(36)}`,
            title: `${theoremName(source) ?? slug} (uploaded)`,
            description: `${fileName}, run through Lean on this machine just now.`,
            viz: 'goal' as const,
          }
          const trace = buildTrace(meta, source, leanVersion(), new Date().toLocaleDateString('en-CA'), {
            timeoutMs: UPLOAD_TIMEOUT_MS,
          })
          trace.viz = guessViz(trace.steps)
          res.end(JSON.stringify({ trace }))
        } catch (e) {
          // ExtractError = a problem with the file (Lean error, unsupported layout). Anything else is ours.
          res.statusCode = e instanceof ExtractError || e instanceof SyntaxError ? 422 : 500
          res.end(JSON.stringify({ error: (e as Error).message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), leanUpload()],
  // Relative asset paths, so dist/ works at a domain root (Vercel) or a subpath (GitHub Pages).
  base: './',
})
