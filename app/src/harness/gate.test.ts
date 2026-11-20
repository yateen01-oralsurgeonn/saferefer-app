// H4: the regression gate. Runs with every `npm test`. Code-only scoring is deterministic, so a change to the rules
// that makes any set worse than its saved baseline fails the build. Improving is always allowed; to accept a new,
// better baseline on purpose, delete the file in harness/baselines/ and run `npm run harness`.
import { describe, expect, it } from 'vitest'
import { baselinePath, fileHash, readJson, scoreSet, SETS, STRUCTURED, type Baseline } from './harnessLib'

const seal = readJson<Record<string, string>>('data/harness/SEAL.json')

describe('harness gate (code-only vs saved baselines)', () => {
  for (const ref of SETS) {
    it(`${ref.key}: no regression against the baseline`, async () => {
      const base = readJson<Baseline>(baselinePath(ref.key))
      expect(base, `no baseline for ${ref.key}: run npm run harness once and commit harness/baselines`).not.toBeNull()
      if (!base) return
      const s = await scoreSet(ref)
      // The data must be the data the baseline was taken on.
      expect(s.notes).toBe(base.notes)
      expect(s.total).toBe(base.total)
      // Overall rate may not be worse by more than one percentage point.
      expect(s.leaked / s.total).toBeLessThanOrEqual(base.leaked / base.total + 0.01)
      // Structured identifiers (what the code is supposed to catch every time): not worse by even one.
      for (const type of STRUCTURED) {
        const was = base.byType[type]?.leaked ?? 0
        const now = s.byType[type]?.leaked ?? 0
        expect(now, `${ref.key}: ${type} leaks went from ${was} to ${now}`).toBeLessThanOrEqual(was)
      }
      // Over-redaction (amounts, sections and form names that must stay): not worse by more than one point.
      if (base.keep.total > 0) expect(s.keep.lost / s.keep.total).toBeLessThanOrEqual(base.keep.lost / base.keep.total + 0.01)
    }, 60_000)
  }

  it('the locked sets are unchanged (SHA-256 seal)', () => {
    expect(seal, 'data/harness/SEAL.json is missing').not.toBeNull()
    for (const ref of SETS.filter((r) => r.set === 'locked')) {
      const name = `locked-${ref.pack}.json`
      expect(fileHash(`data/harness/${name}`), `${name} differs from its seal: locked data must never be edited or tuned on`).toBe(seal?.[name])
    }
  })
})
