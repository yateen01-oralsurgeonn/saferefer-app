// H3: the harness runner. From app/:  npm run harness
// Scores every set with the code rules only, prints a table per profession and per identifier type, and compares with the
// saved baseline. A missing baseline is written on the first run (that is the baseline); delete a file to re-baseline on purpose.
// LOCKED sets print totals and per-type COUNTS only: no misses, no text. Nobody tunes on the locked set's misses.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'vitest'
import { baselinePath, readJson, scoreSet, SETS, type Baseline } from './harnessLib'

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url))
const pct = (a: number, b: number) => (b === 0 ? '0.0%' : `${((a / b) * 100).toFixed(1)}%`)

describe('harness run (code-only)', () => {
  it('scores every set and compares with the baselines', async () => {
    mkdirSync(root('harness/baselines'), { recursive: true })
    mkdirSync(root('harness/out'), { recursive: true })
    const lines: string[] = []
    for (const ref of SETS) {
      const s = await scoreSet(ref)
      const base = readJson<Baseline>(baselinePath(ref.key))
      const { misses, ...record } = s
      if (!base) {
        writeFileSync(root(baselinePath(ref.key)), JSON.stringify(record, null, 1) + '\n')
        lines.push(`\n## ${ref.key}  (${record.notes} notes)  FIRST RUN: baseline saved`)
      } else {
        lines.push(`\n## ${ref.key}  (${record.notes} notes)  baseline ${base.leaked}/${base.total} (${pct(base.leaked, base.total)}) saved ${base.savedOn}`)
      }
      lines.push(`   leaked ${s.leaked} of ${s.total} identifiers (${pct(s.leaked, s.total)}); over-redaction: ${s.keep.lost} of ${s.keep.total} "keep" strings lost`)
      for (const [type, v] of Object.entries(s.byType).sort((a, b) => b[1].leaked - a[1].leaked)) {
        const b = base?.byType[type]
        lines.push(`   ${type.padEnd(13)} ${String(v.leaked).padStart(4)} / ${String(v.total).padEnd(4)} ${pct(v.leaked, v.total).padStart(6)}${b ? `   (baseline ${b.leaked})` : ''}`)
      }
      if (ref.set === 'tune') {
        writeFileSync(root(`harness/out/misses-${ref.key}.json`), JSON.stringify(misses.map((m) => ({ note: m.noteId, type: m.type, value: m.value, kind: m.kind, context: m.context })), null, 1))
        lines.push(`   misses written to harness/out/misses-${ref.key}.json (not committed)`)
      } else {
        lines.push('   LOCKED: counts only, no misses are written or printed')
      }
    }
    console.log(lines.join('\n'))
  }, 120_000)
})
