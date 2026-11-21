// T8 helpers for the leak-test page: the same redaction path the screen uses, plus the zero-request checks.
// Nothing here stores or logs note text. The notes are the 30 synthetic notes in data/notes.json.
import { nanoRedact, redactFirst, type NanoLists, type NanoModelFn, type RedactRules } from './core'

/** The same path as the screen: code redactor first, then Nano if a model function is given. */
export function makeRedact(modelFn: NanoModelFn | null, lists: NanoLists, noteKind?: string, rules?: RedactRules) {
  const fallback = (text: string) => redactFirst(text, [], rules).text
  const redact = async (text: string): Promise<string> => {
    const first = redactFirst(text, [], rules)
    if (!modelFn) return first.text // code only: the page says so
    const result = await nanoRedact(first.text, first.map, modelFn, lists, { noteKind })
    // A failed Nano run is not "nothing found": the note is listed as failed and scored on the code-only text.
    if (result.state !== 'ok') throw new Error('manual')
    return result.text
  }
  return { redact, fallback }
}

/** Background App Check token calls: no note text, made by the Firebase SDK on its own timer. */
export function isAppCheckCall(input: unknown): boolean {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : ''
  try {
    return new URL(url, 'https://x.invalid').hostname.endsWith('firebaseappcheck.googleapis.com')
  } catch {
    return false
  }
}

/**
 * Run `fn` while counting fetch calls made through globalThis.fetch. App Check token calls are counted
 * separately (`appCheck`), never hidden: redaction must make zero other requests.
 */
export async function withFetchCount<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; fetches: number; appCheck: number }> {
  const original = globalThis.fetch
  let fetches = 0
  let appCheck = 0
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    if (isAppCheckCall(args[0])) appCheck++
    else fetches++
    return original.apply(globalThis, args)
  }) as typeof fetch
  try {
    return { value: await fn(), fetches, appCheck }
  } finally {
    globalThis.fetch = original
  }
}

/** Run `fn` as if the browser had no window.LanguageModel (Edge, Firefox, a fresh profile). */
export async function withoutLanguageModel<T>(fn: () => Promise<T>): Promise<T> {
  const g = globalThis as Record<string, unknown>
  const own = Object.getOwnPropertyDescriptor(g, 'LanguageModel')
  Object.defineProperty(g, 'LanguageModel', { value: undefined, configurable: true, writable: true })
  try {
    return await fn()
  } finally {
    if (own) Object.defineProperty(g, 'LanguageModel', own)
    else delete g.LanguageModel
  }
}

export interface NoModelCheck {
  notes: number
  fetches: number
  /** Notes where redaction went to manual mode (all of them, when the model is missing). */
  manual: number
  pass: boolean
}

/** D3 and A4: with window.LanguageModel missing, redaction makes zero requests and goes to manual mode. */
export async function checkNoModel(
  texts: string[],
  modelFn: NanoModelFn,
  lists: NanoLists,
  noteKind?: string,
  rules?: RedactRules,
): Promise<NoModelCheck> {
  const { value: manual, fetches } = await withFetchCount(() =>
    withoutLanguageModel(async () => {
      let n = 0
      for (const t of texts) {
        const first = redactFirst(t, [], rules)
        const r = await nanoRedact(first.text, first.map, modelFn, lists, { noteKind })
        if (r.state === 'manual') n++
      }
      return n
    }),
  )
  return { notes: texts.length, fetches, manual, pass: fetches === 0 && manual === texts.length }
}
