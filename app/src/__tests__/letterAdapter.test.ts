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

describe('T10 follow-up: no connection while the browser still says "online" (found on Dr. Yatin\'s laptop, 20 Nov)', () => {
  // What the AI SDK throws when the App Check token cannot be fetched: a bare "error" with the App Check code inside its message.
  const sdkError = (appCheckCode: string, extra = '') =>
    Object.assign(
      new Error(`AI: Error fetching from https://firebasevertexai.googleapis.com/v1beta/models/m:generateContent: AppCheck: Fetch failed. ${extra} (${appCheckCode}). (AI/error)`),
      { name: 'FirebaseError', code: 'error', customErrorData: undefined },
    )
  const kind = (e: unknown) => mapLetterError(e).kind

  it('an App Check network failure is "offline", so the letter is queued, not "could not be written"', () => {
    expect(kind(sdkError('appCheck/fetch-network-error'))).toBe('offline')
  })

  it('an App Check refusal is "app-check", not a general failure', () => {
    expect(kind(sdkError('appCheck/fetch-status-error'))).toBe('app-check')
    expect(kind(sdkError('appCheck/throttled'))).toBe('app-check')
  })

  it('a bare error with no App Check code stays a general failure', () => {
    expect(kind(Object.assign(new Error('something else'), { code: 'error' }))).toBe('failed')
  })

  it('message text never comes out: only the kind does, even if the message holds a name, a phone and the code', () => {
    const e = sdkError('appCheck/fetch-network-error', 'Asha Testpatil 00000 55501')
    const mapped = mapLetterError(e)
    expect(mapped.kind).toBe('offline')
    expect(mapped.message).toBe('The letter call failed.')
    expect(JSON.stringify(mapped)).not.toMatch(/Asha|00000|googleapis|appCheck/)
  })

  it('the real SDK in a browser with no network gives the offline kind through the adapter', async () => {
    // fetch rejects like a dead network; the SDK's App Check step then fails first with the bare error.
    const failing = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    vi.stubGlobal('fetch', failing)
    const sdk: LetterSdk = {
      getGenerativeModel: (() => ({
        generateContent: async () => {
          throw sdkError('appCheck/fetch-network-error')
        },
      })) as unknown as typeof getGenerativeModel,
    }
    const err = await createLetterModelFn(ai, MODEL, sdk)('S', 'T', {}, new AbortController().signal).catch((e: unknown) => e)
    expect((err as LetterCallError).kind).toBe('offline')
  })
})
