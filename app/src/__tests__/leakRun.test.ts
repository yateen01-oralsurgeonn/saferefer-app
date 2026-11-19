import { initializeApp } from 'firebase/app'
import { getAI } from 'firebase/ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import drugs from '../../../data/drugs.json'
import terms from '../../../data/clinical-terms.json'
import notesJson from '../../../data/notes.json'
import { runLeakTest, type TestNote } from '../core'
import { checkNoModel, makeRedact, withFetchCount } from '../leakRun'
import { createNanoModelFn } from '../nanoAdapter'

const notes = notesJson as TestNote[]
const lists = { drugs, clinicalTerms: terms }
const ai = getAI(initializeApp({ apiKey: 'k', appId: 'a', projectId: 'p' }, 'leak-run-test'))

let fetchSpy: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('T8 page helpers', () => {
  it('code-only run over the 30 notes finishes, counts Y from the file, makes no request', async () => {
    const { redact, fallback } = makeRedact(null, lists)
    const { value, fetches } = await withFetchCount(() => runLeakTest(notes, redact, fallback))
    expect(value.error).toBeNull()
    if (value.error === null) {
      expect(value.summary.total).toBe(notes.reduce((n, x) => n + x.identifiers.length, 0))
      expect(value.failedNotes).toEqual([])
    }
    expect(fetches).toBe(0)
  })

  it('a Nano run that goes manual is listed as a failed note and scored on the code-only text', async () => {
    const failing = async () => {
      throw new Error('no model')
    }
    const { redact, fallback } = makeRedact(failing, lists)
    const r = await runLeakTest(notes, redact, fallback)
    expect(r.error).toBeNull()
    if (r.error === null) {
      expect(r.failedNotes.length).toBe(notes.length)
      expect(r.summary.total).toBeGreaterThan(0)
    }
  })

  it('ACCEPTANCE D3/A4: with LanguageModel undefined, the real adapter makes zero requests and every note goes manual', async () => {
    const out = await checkNoModel(
      notes.map((n) => n.text),
      createNanoModelFn(ai),
      lists,
    )
    expect(out).toMatchObject({ notes: 30, fetches: 0, manual: 30, pass: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('withFetchCount counts calls and restores fetch', async () => {
    const { fetches } = await withFetchCount(async () => {
      await fetch('x').catch(() => {})
      await fetch('y').catch(() => {})
    })
    expect(fetches).toBe(2)
    expect(globalThis.fetch).toBe(fetchSpy)
  })
})
