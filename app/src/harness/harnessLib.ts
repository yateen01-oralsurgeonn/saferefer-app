// H3/H4 shared code: score a harness set with the code rules only (deterministic, no model, no network).
// Nano runs are NOT repeatable and are done by hand on the leak page (/?leak&pack=..&set=tune|locked).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import terms from '../../../data/clinical-terms.json'
import drugs from '../../../data/drugs.json'
import tuneDental from '../../../data/harness/tune-dental.json'
import tuneCa from '../../../data/harness/tune-ca.json'
import tuneLaw from '../../../data/harness/tune-law.json'
import lockedDental from '../../../data/harness/locked-dental.json'
import lockedCa from '../../../data/harness/locked-ca.json'
import lockedLaw from '../../../data/harness/locked-law.json'
import { getPack, rulesForPack, scoreNote, summarise, type LeakResult, type PackId, type TestNote } from '../core'
import { makeRedact } from '../leakRun'

export type HarnessNote = TestNote & { keep?: string[]; style?: string[] }
export type SetName = 'tune' | 'locked'
export interface SetRef {
  pack: PackId
  set: SetName
  key: string
  notes: HarnessNote[]
  file: string
}

const mk = (pack: PackId, set: SetName, notes: unknown): SetRef => ({ pack, set, key: `${set}-${pack}`, notes: notes as HarnessNote[], file: `data/harness/${set}-${pack}.json` })
export const SETS: SetRef[] = [
  mk('dental', 'tune', tuneDental),
  mk('ca', 'tune', tuneCa),
  mk('law', 'tune', tuneLaw),
  mk('dental', 'locked', lockedDental),
  mk('ca', 'locked', lockedCa),
  mk('law', 'locked', lockedLaw),
]

/** Types that code rules are supposed to catch every time. A regression on these is never accepted. */
export const STRUCTURED = ['phone', 'email', 'record_id', 'date', 'dob', 'amount'] as const

export interface Baseline {
  key: string
  mode: 'code-only'
  notes: number
  total: number
  leaked: number
  byType: Record<string, { leaked: number; total: number }>
  keep: { total: number; lost: number }
  savedOn: string
}
export interface Scored extends Baseline {
  /** Misses with the surrounding text. Only ever printed for TUNE sets. */
  misses: LeakResult[]
}

export async function scoreSet(ref: SetRef): Promise<Scored> {
  const pack = getPack(ref.pack)
  const rules = rulesForPack(pack)
  const { redact } = makeRedact(null, { drugs, clinicalTerms: terms }, pack.nanoNoteKind, rules)
  const results: LeakResult[] = []
  const keep = { total: 0, lost: 0 }
  for (const n of ref.notes) {
    const anon = await redact(n.text)
    results.push(...scoreNote(anon, n))
    for (const k of n.keep ?? []) {
      keep.total++
      if (!anon.toLowerCase().includes(k.toLowerCase())) keep.lost++
    }
  }
  const s = summarise(results)
  return { key: ref.key, mode: 'code-only', notes: ref.notes.length, total: s.total, leaked: s.leaked, byType: s.byType, keep, savedOn: new Date().toISOString().slice(0, 10), misses: s.misses }
}

/** SHA-256 of a data file with line endings normalised (Git on Windows may convert them). */
export function fileHash(relPath: string): string {
  const url = new URL(`../../../${relPath}`, import.meta.url)
  const text = readFileSync(fileURLToPath(url), 'utf8').replace(/\r\n/g, '\n')
  return createHash('sha256').update(text).digest('hex')
}
export function readJson<T>(relPath: string): T | null {
  try {
    return JSON.parse(readFileSync(fileURLToPath(new URL(`../../../${relPath}`, import.meta.url)), 'utf8')) as T
  } catch {
    return null
  }
}
export const baselinePath = (key: string) => `harness/baselines/${key}.json`
