import { initializeApp } from 'firebase/app'
import { getAI, getGenerativeModel, InferenceSource } from 'firebase/ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import terms from '../../../data/clinical-terms.json'
import drugs from '../../../data/drugs.json'
import { nanoRedact, TokenMap } from '../core'
import { createNanoModelFn, nanoIsReady, type NanoSdk } from '../nanoAdapter'

const g = globalThis as { LanguageModel?: unknown }
const lists = { drugs, clinicalTerms: terms }
const NOTE = 'Seen with husband Ramesh, works at Infosys. Tooth 36 caries.'

// A real SDK object with a dummy app. No network is needed unless something is sent.
const ai = getAI(initializeApp({ apiKey: 'test-key', appId: 'test-app', projectId: 'test-project' }, 'nano-adapter-test'))

let fetchSpy: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new Error('network is off in tests')))
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete g.LanguageModel
})

describe('T4 adapter: the LanguageModel guard (SECURITY A4)', () => {
  it('ACCEPTANCE: with LanguageModel undefined the redactor returns manual and fetch is never called', async () => {
    expect(typeof g.LanguageModel).toBe('undefined')
    const r = await nanoRedact(NOTE, new TokenMap(), createNanoModelFn(ai), lists, { timeoutMs: 200 })
    expect(r.state).toBe('manual')
    expect(r.failure).toBe('unavailable')
    expect(r.text).toBe(NOTE)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the SDK is not even touched when LanguageModel is undefined', async () => {
    const sdk: NanoSdk = { getGenerativeModel: vi.fn() as unknown as typeof getGenerativeModel }
    const r = await nanoRedact(NOTE, new TokenMap(), createNanoModelFn(ai, sdk), lists, { timeoutMs: 200 })
    expect(r.state).toBe('manual')
    expect(sdk.getGenerativeModel).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(['unavailable', 'downloadable', 'downloading', ''])('LanguageModel present but "%s": manual, no SDK call, no fetch', async (state) => {
    g.LanguageModel = { availability: async () => state }
    const sdk: NanoSdk = { getGenerativeModel: vi.fn() as unknown as typeof getGenerativeModel }
    const r = await nanoRedact(NOTE, new TokenMap(), createNanoModelFn(ai, sdk), lists, { timeoutMs: 200 })
    expect(r.state).toBe('manual')
    expect(r.failure).toBe('unavailable')
    expect(sdk.getGenerativeModel).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('availability() that throws, or a LanguageModel without it, counts as not ready', async () => {
    g.LanguageModel = {
      availability: async () => {
        throw new Error('x')
      },
    }
    expect(await nanoIsReady()).toBe(false)
    g.LanguageModel = {}
    expect(await nanoIsReady()).toBe(false)
    g.LanguageModel = null
    expect(await nanoIsReady()).toBe(false)
  })

  it('the real SDK with LanguageModel "unavailable" and the guard in place sends nothing', async () => {
    g.LanguageModel = { availability: async () => 'unavailable' }
    const fn = createNanoModelFn(ai)
    await expect(fn('hello', {}, new AbortController().signal)).rejects.toMatchObject({ name: 'NanoUnavailableError' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('when Nano is available the call uses ONLY_ON_DEVICE with the schema and no cloud model', async () => {
    g.LanguageModel = { availability: async () => 'available' }
    const calls: unknown[] = []
    const sdk: NanoSdk = {
      getGenerativeModel: ((_ai: unknown, params: unknown) => {
        calls.push(params)
        return {
          generateContent: async () => ({
            response: {
              inferenceSource: InferenceSource.ON_DEVICE,
              text: () => '{"items":[{"text":"Ramesh","type":"RELATIVE"},{"text":"Infosys","type":"EMPLOYER"}]}',
            },
          }),
        }
      }) as unknown as typeof getGenerativeModel,
    }
    const r = await nanoRedact(NOTE, new TokenMap(), createNanoModelFn(ai, sdk), lists, { timeoutMs: 200 })
    expect(r.state).toBe('ok')
    expect(r.text).toBe('Seen with husband [RELATIVE_1], works at [EMPLOYER]. Tooth 36 caries.')
    const p = calls[0] as { mode: string; inCloudParams?: unknown; onDeviceParams: { promptOptions: { responseConstraint: { required: string[] } } } }
    expect(p.mode).toBe('only_on_device')
    expect(p.inCloudParams).toBeUndefined()
    expect(p.onDeviceParams.promptOptions.responseConstraint.required).toEqual(['items'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('a reply whose source is not ON_DEVICE is thrown away and the run goes manual', async () => {
    g.LanguageModel = { availability: async () => 'available' }
    const sdk: NanoSdk = {
      getGenerativeModel: (() => ({
        generateContent: async () => ({ response: { inferenceSource: InferenceSource.IN_CLOUD, text: () => '{"items":[]}' } }),
      })) as unknown as typeof getGenerativeModel,
    }
    const r = await nanoRedact(NOTE, new TokenMap(), createNanoModelFn(ai, sdk), lists, { timeoutMs: 200 })
    expect(r.state).toBe('manual')
    expect(r.failure).toBe('unavailable')
  })
})
