// T10 offline queue logic (PLAN.md T10, SECURITY.md A2, A6, A7, A12, B1). Plain TypeScript: no React, no Firebase,
// no storage API. The store comes in as an argument; app/src/queueStore.ts is the only file that touches IndexedDB.
//
// What is stored: the approved ANONYMOUS string and the profession id. Nothing else.
// Never the note, the token map, the restored letter or a name (CLAUDE.md rule 3, SECURITY B1).
// Every write goes through guardedSend (A6), so text that fails the send guard is never stored either,
// and every send of a queued item goes through guardedSend again (A2).
import { draftLetter, type LetterModelFn, type LetterOptions, type LetterResult } from './letter'
import { PACKS, type PackId } from './packs'
import { BLOCKED_MESSAGE, guardedSend, NOT_APPROVED_MESSAGE, type GuardOptions } from './sendGuard'
import type { TokenMap } from './tokens'

export interface QueuedItem {
  /** One slot: a new approved note replaces the old one. */
  id: 'current'
  packId: PackId
  /** The frozen approved anonymous string. */
  approved: string
  savedAt: number
}

/** The storage behind the queue. Real: IndexedDB (app/src/queueStore.ts). Tests: memory. */
export interface QueueStore {
  read(): Promise<unknown>
  write(item: QueuedItem): Promise<void>
  clear(): Promise<void>
}

export const MAX_QUEUED_CHARS = 20_000
/** Fixed texts (FINISH.md section 1). */
export const QUEUED_MESSAGE = 'You are offline. The letter is queued and will be sent when you are back online.'
export const QUEUE_UNAVAILABLE_MESSAGE = 'This browser could not keep the letter for later. Nothing was sent. Connect and try again.'
export const ORPHAN_NOTE =
  'This letter was written after the page was closed, so your browser no longer had the names. They are shown as labels. Add the names by hand before you use it.'

/** Check what came back from storage. It is untrusted: another page or an old version may have written it. */
export function asQueuedItem(raw: unknown): QueuedItem | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== 4 || !['id', 'packId', 'approved', 'savedAt'].every((k) => keys.includes(k))) return null
  if (o.id !== 'current' || typeof o.savedAt !== 'number') return null
  if (typeof o.packId !== 'string' || !Object.prototype.hasOwnProperty.call(PACKS, o.packId)) return null
  if (typeof o.approved !== 'string' || !o.approved.trim() || o.approved.length > MAX_QUEUED_CHARS) return null
  return { id: 'current', packId: o.packId as PackId, approved: o.approved, savedAt: o.savedAt }
}

export type EnqueueResult =
  | { ok: true }
  | { ok: false; reason: 'blocked' | 'not-approved' | 'too-long' | 'store'; message: string; hit?: string }

/**
 * Queue the approved anonymous string for later. It goes through guardedSend first: a name left in the text,
 * a phone or an email blocks the write, exactly as it would block a send. The map is only used for that check.
 */
export async function enqueue(
  store: QueueStore,
  approved: string | null,
  packId: PackId,
  map: TokenMap,
  guard?: GuardOptions,
  now: () => number = Date.now,
): Promise<EnqueueResult> {
  if (approved !== null && approved.length > MAX_QUEUED_CHARS) {
    return { ok: false, reason: 'too-long', message: QUEUE_UNAVAILABLE_MESSAGE }
  }
  const out = await guardedSend<EnqueueResult>(
    approved,
    map,
    async (text) => {
      try {
        await store.write({ id: 'current', packId, approved: text, savedAt: now() })
        return { ok: true }
      } catch {
        return { ok: false, reason: 'store', message: QUEUE_UNAVAILABLE_MESSAGE }
      }
    },
    guard,
  )
  if (out.ok) return out.value
  return out.reason === 'not-approved'
    ? { ok: false, reason: 'not-approved', message: NOT_APPROVED_MESSAGE }
    : { ok: false, reason: 'blocked', message: BLOCKED_MESSAGE, hit: out.hit }
}

/** The queued item, or null when there is none, it is unreadable, or storage is not available. */
export async function readQueued(store: QueueStore): Promise<QueuedItem | null> {
  try {
    return asQueuedItem(await store.read())
  } catch {
    return null
  }
}

/** Remove the queued item. Storage errors are swallowed: the next write replaces the slot anyway. */
export async function clearQueue(store: QueueStore): Promise<void> {
  try {
    await store.clear()
  } catch {
    /* nothing to do */
  }
}

/**
 * Send a queued item now. The text is the item's own frozen string, sent through draftLetter (so through guardedSend
 * again, with the map the page still has, or an empty map after a reload). The item is removed ONLY when a letter came
 * back. Offline, quota and other failures leave it queued for the next try. A blocked text is removed: it must never be sent.
 */
export async function sendQueued(
  store: QueueStore,
  item: QueuedItem,
  map: TokenMap,
  modelFn: LetterModelFn,
  options: Omit<LetterOptions, 'letterText' | 'template'> = {},
): Promise<LetterResult> {
  const result = await draftLetter(item.approved, map, modelFn, { ...options, letterText: PACKS[item.packId].letter })
  if (result.ok || result.failure === 'blocked') await clearQueue(store)
  return result
}

/** A store that lives only in memory. Used when IndexedDB is not available, and in tests. */
export function createMemoryStore(): QueueStore & { peek(): unknown } {
  let slot: unknown = null
  return {
    read: async () => slot,
    write: async (item) => {
      slot = JSON.parse(JSON.stringify(item))
    },
    clear: async () => {
      slot = null
    },
    peek: () => slot,
  }
}
