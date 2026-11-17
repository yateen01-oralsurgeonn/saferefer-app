// Send guard (PROMPTS.md section 2, SECURITY.md A2 and A6).
// Run it before EVERY cloud call, Firestore write and retry.
// Plain code: no model, no network. It only answers "may this text leave the browser?"
import { findEmails, findPhones } from './patterns'
import { HONORIFICS, isPersonType, tokenRegex, type TokenMap } from './tokens'

/** The only message the screen shows when the guard blocks. Never add note text to it. */
export const BLOCKED_MESSAGE = 'Blocked: an identifier is still in the note.'
export const NOT_APPROVED_MESSAGE = 'Approve the hidden note before sending.'

export type GuardReason = 'map-value' | 'name-word' | 'phone' | 'email' | 'not-approved'

export type GuardResult =
  | { ok: true }
  | {
      ok: false
      message: string
      reason: GuardReason
      /** The text that tripped the guard. Show it on screen only. Never log it or put it in an Error. */
      hit: string
    }

export interface GuardOptions {
  /**
   * Text the dentist un-hid by hand in the preview ("this is not an identifier").
   * Only fill this from an explicit un-hide click. Matching is exact, ignoring case and extra spaces.
   */
  allowed?: string[]
}

const ZERO_WIDTH = /[­​-‏⁠﻿]/g
const fold = (s: string) => s.normalize('NFKC').replace(ZERO_WIDTH, '').toLowerCase().replace(/\s+/g, ' ').trim()
const squash = (s: string) => fold(s).replace(/[^\p{L}\p{N}]/gu, '')
const digitsOf = (s: string) => s.normalize('NFKC').replace(/\D/g, '')
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wholeWord = (word: string, flags: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])`, flags)

const block = (reason: GuardReason, hit: string): GuardResult => ({ ok: false, message: BLOCKED_MESSAGE, reason, hit })

/**
 * Returns ok only if the outgoing text holds:
 * - no value from the token map: 4 or more characters anywhere in any case
 *   (so "Rameshs", "RameshPatil" and "RAMESH" are caught), 2 or 3 characters as a whole word;
 * - no map value with its spaces or punctuation changed ("Ramesh-Patil", "R a m e s h");
 * - no single word of a hidden person's name written with a capital letter;
 * - no digits of a hidden phone number, in any grouping;
 * - nothing that looks like a phone number or an email address.
 */
export function checkSend(text: string, map: TokenMap, options: GuardOptions = {}): GuardResult {
  const allowed = new Set((options.allowed ?? []).map(fold))
  // Valid tokens are cut out first, so the word inside "[PATIENT]" is never matched.
  const plain = text.normalize('NFKC').replace(ZERO_WIDTH, '').replace(tokenRegex(), '\u0001')
  const folded = fold(plain)
  const squashed = plain.split('\u0001').map(squash)
  const digits = plain.split('\u0001').map(digitsOf)

  for (const entry of map.entries()) {
    const forms = new Set([entry.value, ...entry.variants])
    for (const form of forms) {
      const v = fold(form)
      if (!v || allowed.has(v)) continue
      if (v.length >= 4) {
        if (folded.includes(v)) return block('map-value', form)
      } else if (v.length >= 2) {
        if (wholeWord(v, 'iu').test(folded)) return block('map-value', form)
      }
      const sq = squash(form)
      if (sq.length >= 6 && squashed.some((s) => s.includes(sq))) return block('map-value', form)
      if (entry.type === 'PHONE') {
        const d = digitsOf(form)
        if (d.length >= 7 && digits.some((s) => s.includes(d))) return block('phone', form)
      }
      if (isPersonType(entry.type)) {
        for (const word of v.split(/[^\p{L}\p{N}]+/u)) {
          if (word.length < 3 || HONORIFICS.includes(word) || allowed.has(word)) continue
          // A single word of a hidden name, written with a capital: "Mrs Patil" when "Asha Patil" is hidden.
          for (const m of plain.matchAll(wholeWord(word, 'giu'))) {
            if (/^\p{Lu}/u.test(m[0])) return block('name-word', m[0])
          }
        }
      }
    }
  }

  for (const f of findEmails(plain)) if (!allowed.has(fold(f.value))) return block('email', f.value)
  for (const f of findPhones(plain)) if (!allowed.has(fold(f.value))) return block('phone', f.value)
  return { ok: true }
}

/**
 * The one door to the cloud. Give it the frozen, approved anonymous text
 * (or null if nothing is approved) and the function that makes the call.
 * `send` receives exactly the approved string and nothing else.
 * Use this for the letter call, the tooth-line call, the Firestore queue write and every retry.
 */
export async function guardedSend<T>(
  approvedText: string | null,
  map: TokenMap,
  send: (approvedText: string) => Promise<T>,
  options: GuardOptions = {},
): Promise<{ ok: true; value: T } | Extract<GuardResult, { ok: false }>> {
  if (approvedText === null || approvedText.trim() === '') {
    return { ok: false, message: NOT_APPROVED_MESSAGE, reason: 'not-approved', hit: '' }
  }
  const verdict = checkSend(approvedText, map, options)
  if (!verdict.ok) return verdict
  return { ok: true, value: await send(approvedText) }
}
