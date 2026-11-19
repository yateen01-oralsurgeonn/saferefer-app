import { initializeApp } from 'firebase/app'
import { getAI, getGenerativeModel } from 'firebase/ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import notes from '../../../data/notes.json'
import { draftLetter, LetterCallError, redactByCode } from '../core'
import { createLetterModelFn, mapLetterError, type LetterSdk } from '../letterAdapter'

const ai = getAI(initializeApp({ apiKey: 'test-key', appId: 'test-app', projectId: 'test-project' }, 'letter-adapter-test'))
const MODEL = 'gemini-3.5-flash-lite'
const GOOD = JSON.stringify({ letter: 'Dear Colleague,\nRe: [PATIENT]\nTooth 36 caries.', not_recorded: [] })

let fetchSpy: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('T6 adapter', () => {
  it('uses ONLY_IN_CLOUD, the named model, the system instruction and a JSON schema; sends the user text as is', async () => {
    const calls: Array<{ params: unknown; text: unknown }> = []
    const sdk: LetterSdk = {
      getGenerativeModel: ((_ai: unknown, params: unknown) => ({
        generateContent: async (text: unknown) => {
          calls.push({ params, text })
          return { response: { text: () => GOOD } }
        },
      })) as unknown as typeof getGenerativeModel,
    }
    const out = await createLetterModelFn(ai, MODEL, sdk)('SYSTEM', 'Tooth 36 [PATIENT]', {}, new AbortController().signal)
    expect(out).toBe(GOOD)
    const p = calls[0].params as {
      mode: string
      onDeviceParams?: unknown
      inCloudParams: { model: string; systemInstruction: string; generationConfig: { responseMimeType: string; responseSchema: unknown } }
    }
    expect(p.mode).toBe('only_in_cloud')
    expect(p.onDeviceParams).toBeUndefined()
    expect(p.inCloudParams.model).toBe(MODEL)
    expect(p.inCloudParams.systemInstruction).toBe('SYSTEM')
    expect(p.inCloudParams.generationConfig.responseMimeType).toBe('application/json')
    expect(p.inCloudParams.generationConfig.responseSchema).toBeTruthy()
    expect(calls[0].text).toBe('Tooth 36 [PATIENT]')
  })

  it('error mapping reads status and code only: 429 quota, 401/403 app check, no status fetch error offline, abort, other', () => {
    const kind = (e: unknown) => mapLetterError(e).kind
    expect(kind({ customErrorData: { status: 429 }, message: 'Asha' })).toBe('quota')
    expect(kind({ customErrorData: { status: 403 } })).toBe('app-check')
    expect(kind({ customErrorData: { status: 401 } })).toBe('app-check')
    expect(kind({ code: 'fetch-error' })).toBe('offline')
    expect(kind({ name: 'AbortError' })).toBe('aborted')
    expect(kind({ code: 'response-error', customErrorData: { status: 500 } })).toBe('failed')
    expect(kind(new Error('x'))).toBe('failed')
    expect(kind(undefined)).toBe('failed')
    expect(mapLetterError(new Error('Asha 00000 55501')).message).toBe('The letter call failed.')
    expect(mapLetterError(undefined)).toBeInstanceOf(LetterCallError)
  })

  it('ACCEPTANCE T6, real SDK: the request body holds the approved text only, with no name, phone or date of note 1', async () => {
    const note = notes[0]
    const code = redactByCode(note.text)
    const modelFn = createLetterModelFn(ai, MODEL)
    const r = await draftLetter(code.text, code.map, modelFn, { timeoutMs: 2000 })
    expect(fetchSpy).toHaveBeenCalled()
    // The SDK called fetch with the request. Network is off in the test, so the result is a fixed failure message.
    expect(r.ok).toBe(false)
    const [url, init] = fetchSpy.mock.calls[0] as [string, { body: string }]
    expect(String(url)).toContain(MODEL)
    expect(String(url)).not.toMatch(/Arvind|Testwala/i)
    const body = init.body
    expect(body).toContain(code.text.slice(0, 20))
    for (const id of note.identifiers) {
      for (const part of id.value.split(/\s+/)) expect(body.toLowerCase()).not.toContain(part.toLowerCase())
    }
    // Only the approved text is in the user message.
    const parsed = JSON.parse(body) as { contents: Array<{ parts: Array<{ text: string }> }> }
    expect(parsed.contents.flatMap((c) => c.parts.map((p) => p.text))).toEqual([code.text])
  })

  it('a blocked text never reaches fetch', async () => {
    const note = notes[0]
    const code = redactByCode(note.text)
    const r = await draftLetter(note.text, code.map, createLetterModelFn(ai, MODEL), { timeoutMs: 2000 })
    expect(r).toMatchObject({ ok: false, failure: 'blocked' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
