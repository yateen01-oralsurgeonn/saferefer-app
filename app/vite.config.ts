import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// T10: write dist/sw.js from sw-template.js with the list of files the build produced (the app shell).
// Only the build's own files go in the list: no API address, no runtime caching (SECURITY A12).
function precacheShell(): Plugin {
  return {
    name: 'saferefer-precache-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map') && f !== 'sw.js')
        .map((f) => `/${f}`)
      const shell = [...new Set(['/', '/index.html', '/favicon.svg', ...built])].sort()
      const version = createHash('sha256').update(shell.join('|')).digest('hex').slice(0, 10)
      const source = readFileSync(resolve(import.meta.dirname, 'sw-template.js'), 'utf8')
        .replace('__PRECACHE__', JSON.stringify(shell))
        .replace('__VERSION__', version)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheShell()],
})
