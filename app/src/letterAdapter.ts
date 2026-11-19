// The cloud letter adapter: the ONLY place that calls Firebase AI Logic in the cloud.
// The cloud model is named here (the caller passes it in, from firebase.ts) and nowhere in the redaction files.
// It never logs. SDK errors are turned into a kind only; their text is thrown away (SECURITY A8).
import { getGenerativeModel, InferenceMode, Schema, type AI } from 'firebase/ai'
import { LetterCallError, type LetterModelFn } from './core'

/** What the adapter needs from the SDK. Tests pass a stub. */
export interface LetterSdk {
  getGenerativeModel: typeof getGenerativeModel
}

interface SdkErrorShape {
  name?: unknown
  code?: unknown
  customErrorData?: { status?: unknown }
}

/** Turn any SDK or network error into a fixed kind. Reads codes and HTTP status only, never message text. */
export function mapLetterError(e: unknown): LetterCallError {
  const err = (typeof e === 'object' && e !== null ? e : {}) as SdkErrorShape
  if (err.name === 'AbortError') return new LetterCallError('aborted')
  const status = err.customErrorData?.status
  if (status === 429) return new LetterCallError('quota')
  if (status === 401 || status === 403) return new LetterCallError('app-check')
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || (err.code === 'fetch-error' && status === undefined)) return new LetterCallError('offline')
  return new LetterCallError('failed')
}

/** Build the model function for draftLetter(). `ai` and `model` come from firebase.ts. */
export function createLetterModelFn(ai: AI, model: string, sdk: LetterSdk = { getGenerativeModel }): LetterModelFn {
  return async (system, userText, _schema, signal) => {
    try {
      const m = sdk.getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: {
          model,
          systemInstruction: system,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: Schema.object({
              properties: {
                letter: Schema.string(),
                not_recorded: Schema.array({ items: Schema.string() }),
              },
            }),
          },
        },
      })
      const result = await m.generateContent(userText, { signal })
      return result.response.text()
    } catch (e) {
      throw mapLetterError(e)
    }
  }
}
