import { defineConfig } from 'vitest/config'

// `npm run harness` runs only the harness runner (the normal `npm test` runs the gate, not this).
export default defineConfig({ test: { include: ['src/harness/run.harness.ts'] } })
