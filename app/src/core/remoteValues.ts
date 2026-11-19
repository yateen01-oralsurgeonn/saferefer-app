// T11 Remote Config values (PLAN.md T11, SECURITY.md A11). Plain TypeScript: no React, no Firebase, no network.
// The Firebase call lives in app/src/remoteConfig.ts and hands the raw strings to resolveRemote().
//
// A remote value can change TWO things and nothing else:
//   1. the cloud model name, and only to a name on the allow-list below;
//   2. the section list of one profession's letter (the pack's `letter.template`).
// It can never touch the fixed rules, the tokens, the locks, the redaction words or any other pack text.
// Every bad value, in any way, is thrown away and the default compiled into the app is used (A11).
// A bad template is REJECTED as a whole, never partly repaired: a half-edited template is not trusted.
import { isCleanText, PACKS, type Pack, type PackId } from './packs'

/** Models the app may call for letters and tooth lines. `gemini-3.8-flash` is NOT here: it timed out twice at the
 *  30 s letter limit in the 19 Nov test. Add a name only together with a longer timeout and a test. */
export const ALLOWED_MODELS: readonly string[] = ['gemini-3.5-flash-lite']
export const DEFAULT_MODEL = ALLOWED_MODELS[0]

export const MIN_TEMPLATE_LINES = 3
export const MAX_TEMPLATE_LINES = 14
export const MAX_TEMPLATE_LINE = 90

/** Remote Config parameter names. The console must use exactly these. */
export const PARAM_MODEL = 'cloud_model'
export const PARAM_TEMPLATE: Readonly<Record<PackId, string>> = {
  dental: 'template_dental',
  ca: 'template_ca',
  law: 'template_law',
}

/** The model name if it is on the allow-list (exact match after trimming), else the default. */
export function pickModel(raw: unknown): string {
  return typeof raw === 'string' && ALLOWED_MODELS.includes(raw.trim()) ? raw.trim() : DEFAULT_MODEL
}

/**
 * A template from the console: a JSON array of strings, or plain text with one section per line.
 * Returns the clean lines, or null when anything is wrong (the caller then keeps the default).
 */
export function parseTemplate(raw: unknown): readonly string[] | null {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > MAX_TEMPLATE_LINES * (MAX_TEMPLATE_LINE + 2)) return null
  let lines: unknown
  const text = raw.trim()
  if (text.startsWith('[')) {
    try {
      lines = JSON.parse(text)
    } catch {
      return null
    }
  } else {
    lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  }
  if (!Array.isArray(lines) || lines.length < MIN_TEMPLATE_LINES || lines.length > MAX_TEMPLATE_LINES) return null
  const out: string[] = []
  for (const l of lines) {
    // Same text rules as every pack text (brackets other than [PATIENT], braces, angle brackets, backticks,
    // override words, empty, too long), and the tighter line cap.
    if (typeof l !== 'string' || !isCleanText(l, MAX_TEMPLATE_LINE) || /[\r\n]/.test(l)) return null
    const line = l.trim()
    // [PATIENT] may appear only in a "Re:" line, where the default templates have it.
    if (line.includes('[PATIENT]') && !/^Re:/i.test(line)) return null
    out.push(line)
  }
  return out
}

export interface RemoteValues {
  model: string
  /** Only professions with a valid remote template are present. */
  templates: Partial<Record<PackId, readonly string[]>>
}

export const DEFAULT_REMOTE: RemoteValues = { model: DEFAULT_MODEL, templates: {} }

/** Turn the raw Remote Config strings into safe values. Anything missing or bad becomes the default. */
export function resolveRemote(raw: Record<string, unknown> | null | undefined): RemoteValues {
  if (!raw || typeof raw !== 'object') return DEFAULT_REMOTE
  // Own properties only: a value that arrives through the prototype chain ("__proto__") is never read.
  const own = (key: string): unknown => (Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : undefined)
  const templates: Partial<Record<PackId, readonly string[]>> = {}
  for (const id of Object.keys(PACKS) as PackId[]) {
    const t = parseTemplate(own(PARAM_TEMPLATE[id]))
    if (t) templates[id] = t
  }
  return { model: pickModel(own(PARAM_MODEL)), templates }
}

/** The pack with its remote section list, if there is a valid one. Nothing else about the pack changes. */
export function withRemoteTemplate(pack: Pack, remote: RemoteValues): Pack {
  const template = remote.templates[pack.id]
  if (!template) return pack
  return { ...pack, letter: { ...pack.letter, template } }
}

