// T7 restore and token check (PROMPTS.md section 2 "Restore" and section 4 step A).
// Plain code, no model. The letter from the cloud is untrusted text.
import { TOKEN_TYPES, type TokenMap } from './tokens'

export interface Warning {
  level: 'red' | 'amber'
  kind: string
  /** Plain words for the banner. */
  message: string
  /** The piece of letter text the warning is about. */
  text: string
  /** Where it starts in the checked text (for highlighting). */
  index: number
}

export interface RestoreResult {
  /** The letter with real values put back. Unknown bracketed text is left exactly as it was. */
  text: string
  warnings: Warning[]
  /** How many near-miss tokens ("[Patient]", "[ PATIENT ]", "[RELATIVE 1]") were repaired. */
  repaired: number
}

const BRACKETED = /\[([^[\]\n]{1,40})\]/g
const TYPE_ALT = TOKEN_TYPES.join('|')

/** Which map token does this bracketed text mean? Only an exact or a single unambiguous match counts. */
function resolve(inner: string, map: TokenMap): string | null {
  const exact = `[${inner}]`
  if (map.get(exact)) return exact
  let canon = inner
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const numbered = new RegExp(`^(${TYPE_ALT})_?0*(\\d{1,2})$`).exec(canon)
  if (numbered) canon = `${numbered[1]}_${numbered[2]}`
  const m = new RegExp(`^(${TYPE_ALT})(?:_(\\d{1,2}))?$`).exec(canon)
  if (!m) return null
  const candidates = new Set<string>()
  if (map.get(`[${canon}]`)) candidates.add(`[${canon}]`)
  else if (m[2] === '1' && map.get(`[${m[1]}]`)) candidates.add(`[${m[1]}]`) // [PATIENT_1] -> [PATIENT]
  else if (!m[2]) {
    // [RELATIVE] -> [RELATIVE_1], but only if there is exactly one RELATIVE
    const sameType = map.entries().filter((e) => e.type === m[1])
    if (sameType.length === 1) candidates.add(sameType[0].token)
  }
  return candidates.size === 1 ? [...candidates][0] : null
}

/**
 * One regex pass over the letter: each known token is swapped for its value.
 * String replaces are never chained, so a value that looks like a token is not replaced again.
 * Anything else in square brackets stays as it is and raises a red warning.
 */
export function restoreLetter(letter: string, map: TokenMap): RestoreResult {
  const warnings: Warning[] = []
  let repaired = 0
  let patientSeen = false
  let out = ''
  let pos = 0
  for (const m of letter.matchAll(BRACKETED)) {
    const token = resolve(m[1], map)
    out += letter.slice(pos, m.index)
    if (token) {
      const entry = map.get(token)!
      if (token !== m[0]) repaired++
      if (entry.type === 'PATIENT' || entry.type === 'CLIENT') patientSeen = true
      out += entry.value
    } else {
      warnings.push({
        level: 'red',
        kind: 'unknown-token',
        message: `"${m[0]}" is not one of your hidden items. Check it by hand.`,
        text: m[0],
        index: out.length,
      })
      out += m[0]
    }
    pos = m.index + m[0].length
  }
  out += letter.slice(pos)

  // A token that lost its brackets ("RELATIVE_1", "PATIENT") cannot be repaired safely.
  const bare = new RegExp(`(?<![\\[\\p{L}\\p{N}_])(?:(?:${TYPE_ALT})_\\d{1,2}|PATIENT|CLIENT)(?![\\]\\p{L}\\p{N}_])`, 'gu')
  for (const m of out.matchAll(bare)) {
    warnings.push({
      level: 'red',
      kind: 'bare-token',
      message: `"${m[0]}" looks like a hidden item that lost its brackets. Fix it by hand.`,
      text: m[0],
      index: m.index,
    })
  }

  const mainEntry = map.entries().find((e) => e.type === 'PATIENT' || e.type === 'CLIENT')
  if (mainEntry && !patientSeen) {
    const word = mainEntry.type === 'CLIENT' ? 'Client' : 'Patient'
    warnings.push({ level: 'amber', kind: 'patient-missing', message: `${word} name is missing.`, text: '', index: 0 })
  }
  return { text: out, warnings, repaired }
}
