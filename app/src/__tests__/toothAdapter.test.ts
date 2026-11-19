import { initializeApp } from 'firebase/app'
import { getAI, getGenerativeModel, InferenceSource } from 'firebase/ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import notes from '../../../data/notes.json'
import { buildToothPrompt, listTeeth, redactByCode } from '../core'
import { createToothModelFn, type ToothSdk } from '../toothAdapter'

const ai = getAI(initializeApp({ apiKey: 'test-key', appId: 'test-app', projectId: 'test-project' }, 'tooth-adapter-test'))
const MODEL = 'gemini-3.5-flash-lite'
const g = globalThis as { LanguageModel?: unknown }
const GOOD = JSON.stringify({ teeth: [{ tooth: '36', finding: 'Deep distal caries' }], unnumbered: [] })

let fetchSpy: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete g.LanguageModel
})

const stubSdk = (source: InferenceSource, calls: unknown[]): ToothSdk => ({
  getGenerativeModel: ((_ai: unknown, params: unknown) => ({
    generateContent: async (text: unknown) => {
      calls.push({ params, text })
      return { response: { text: () => GOOD, inferenceSource: source } }
    },
  })) as unknown as typeof getGenerativeModel,
})

describe('T9 adapter', () => {
  it('uses PREFER_ON_DEVICE with the same prompt for both, a JSON schema on each side, and the named cloud model', async () => {
    const calls: Array<{ params: unknown; text: unknown }> = []
    const out = await createToothModelFn(ai, MODEL, stubSdk(InferenceSource.ON_DEVICE, calls))('PROMPT', { s: 1 }, new AbortController().signal)
    expect(out).toEqual({ text: GOOD, source: 'on-device' })
    const p = calls[0].params as {
      mode: string
      onDeviceParams: { promptOptions: { responseConstraint: unknown } }
      inCloudParams: { model: string; generationConfig: { responseMimeType: string; responseSchema: unknown } }
    }
    expect(p.mode).toBe('prefer_on_device')
    expect(p.onDeviceParams.promptOptions.responseConstraint).toEqual({ s: 1 })
    expect(p.inCloudParams.model).toBe(MODEL)
    expect(p.inCloudParams.generationConfig.responseMimeType).toBe('application/json')
    expect(p.inCloudParams.generationConfig.responseSchema).toBeTruthy()
    expect(calls[0].text).toBe('PROMPT')
  })

  it('reports "cloud" when the cloud answered', async () => {
    const out = await createToothModelFn(ai, MODEL, stubSdk(InferenceSource.IN_CLOUD, []))('P', {}, new AbortController().signal)
    expect(out.source).toBe('cloud')
  })

  it('SDK errors become a fixed kind with no SDK text', async () => {
    const sdk: ToothSdk = {
      getGenerativeModel: (() => ({
        generateContent: async () => {
          throw Object.assign(new Error('Asha 00000 55501'), { customErrorData: { status: 429 } })
        },
      })) as unknown as typeof getGenerativeModel,
    }
    const err = await createToothModelFn(ai, MODEL, sdk)('P', {}, new AbortController().signal).catch((e: Error & { kind: string }) => e)
    expect((err as { kind: string }).kind).toBe('quota')
    expect((err as Error).message).not.toContain('Asha')
  })

  it('ACCEPTANCE T9, real SDK, Nano off (LanguageModel undefined): the call goes to the cloud and the body holds only the approved anonymous note', async () => {
    expect(typeof g.LanguageModel).toBe('undefined')
    const note = notes[0]
    const code = redactByCode(note.text)
    const r = await listTeeth(code.text, code.map, createToothModelFn(ai, MODEL), { timeoutMs: 2000 })
    expect(fetchSpy).toHaveBeenCalled()
    // Network is off in the test, so the list falls back to rules only, from the approved text.
    expect(r.ok && r.source).toBe('rules')
    expect(r.ok && r.teeth.map((t) => t.tooth)).toEqual(['36'])
    for (const [url, init] of fetchSpy.mock.calls as Array<[string, { body: string }]>) {
      expect(String(url)).toContain(MODEL)
      const body = init.body
      for (const id of note.identifiers) {
        for (const part of id.value.split(/\s+/)) expect(body.toLowerCase()).not.toContain(part.toLowerCase())
      }
      const parsed = JSON.parse(body) as { contents: Array<{ parts: Array<{ text: string }> }> }
      expect(parsed.contents.flatMap((c) => c.parts.map((p) => p.text))).toEqual([buildToothPrompt(code.text)])
    }
  })

  it('a blocked text never reaches fetch', async () => {
    const note = notes[0]
    const code = redactByCode(note.text)
    const r = await listTeeth(note.text, code.map, createToothModelFn(ai, MODEL), { timeoutMs: 2000 })
    expect(r).toMatchObject({ ok: false, failure: 'blocked' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
