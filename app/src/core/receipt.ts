// T17: the "what was sent" receipt. Pure: describes the approved hidden text that goes to the cloud as the note part of the request.
// It reads only the approved (already hidden) string. It never sees the label map, the original note or the restored letter.
import { tokenRegex } from './tokens'

export interface SentReceipt {
  /** The exact approved text sent as the note. */
  text: string
  /** Size of that text in UTF-8 bytes. */
  bytes: number
  /** How many label occurrences it holds, and how many different labels. */
  labelCount: number
  distinctLabels: number
}

export function makeReceipt(approved: string): SentReceipt {
  const found = approved.match(tokenRegex()) ?? []
  return {
    text: approved,
    bytes: new TextEncoder().encode(approved).length,
    labelCount: found.length,
    distinctLabels: new Set(found).size,
  }
}

/** SHA-256 of the text as lower-case hex, or null where the browser has no Web Crypto. */
export async function sha256Hex(text: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) return null
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}
