// The Nano adapter: the ONLY place that calls Firebase AI Logic for redaction.
//
// THE LOCK IS THIS FILE, NOT THE SDK (SECURITY A4, tested 18 Nov 2026, firebase 13.4.0):
// in a browser with no window.LanguageModel the SDK builds no on-device adapter and sends an
// ONLY_ON_DEVICE call to the cloud. So before EVERY call we check that Gemini Nano is really
// there, and if not we throw a fixed error BEFORE any SDK call. Nothing is sent.
// InferenceMode.ONLY_ON_DEVICE stays as the second lock.
//
// This file never names the cloud model and never imports ./firebase: the caller passes `ai` in.
import { getGenerativeModel, InferenceMode, InferenceSource, type AI } from 'firebase/ai'
import { NanoUnavailableError, type NanoModelFn } from './core'

/** What the adapter needs from the SDK. Tests pass a stub to prove the SDK is not reached. */
export interface NanoSdk {
  getGenerativeModel: typeof getGenerativeModel
}

const createOptions = () => ({
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
})

interface LanguageModelApi {
  availability: (options?: unknown) => Promise<string>
}

/**
 * True only when window.LanguageModel exists AND its availability() is "available".
 * Any problem (missing, throws, "downloadable", "downloading", "unavailable") is false.
 */
export async function nanoIsReady(): Promise<boolean> {
  const lm = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel
  if (typeof lm === 'undefined' || lm === null || typeof lm.availability !== 'function') return false
  try {
    return (await lm.availability(createOptions())) === 'available'
  } catch {
    return false
  }
}

/** Build the model function for nanoRedact(). `ai` comes from firebase.ts. */
export function createNanoModelFn(ai: AI, sdk: NanoSdk = { getGenerativeModel }): NanoModelFn {
  return async (prompt, schema, signal) => {
    // The lock. Runs before every call, before the SDK is touched.
    if (!(await nanoIsReady())) throw new NanoUnavailableError()

    const model = sdk.getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: createOptions(),
        promptOptions: { responseConstraint: schema as never },
      },
    })
    const result = await model.generateContent(prompt, { signal })
    // Belt and braces: a reply that did not come from Nano is thrown away unread.
    if (result.response.inferenceSource !== InferenceSource.ON_DEVICE) throw new NanoUnavailableError()
    return result.response.text()
  }
}
