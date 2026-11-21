// "My terms" storage (T16, D3): the SECOND and last file in the app that touches IndexedDB (SECURITY B1; queue.test.ts greps for it).
// One database, one object store. It only ever receives a validated SavedTerm (core/myTerms.ts): a place, an
// organisation or an ID prefix. Never a note, the token map, a preview, a letter or a person's name.
// No console output. If IndexedDB is missing or blocked, it falls back to memory (the list then lasts until reload).
import { dedupeTerms, sanitiseTerms, termId, type SavedTerm } from './core'

const DB_NAME = 'saferefer-terms'
const STORE = 'terms'

export interface TermsStore {
  list(): Promise<SavedTerm[]>
  add(term: SavedTerm): Promise<void>
  remove(term: SavedTerm): Promise<void>
  clear(): Promise<void>
}

export function createMemoryTermsStore(): TermsStore {
  let items: SavedTerm[] = []
  return {
    list: async () => items.map((t) => ({ ...t })),
    add: async (t) => {
      items = dedupeTerms([...items, { ...t }])
    },
    remove: async (t) => {
      items = items.filter((x) => termId(x) !== termId(t))
    },
    clear: async () => {
      items = []
    },
  }
}

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('terms-db'))
    req.onblocked = () => reject(new Error('terms-db'))
  })
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = work(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(new Error('terms-db'))
    tx.onabort = () => reject(new Error('terms-db'))
  })
}

/**
 * The browser's terms store, or a memory store when IndexedDB cannot be used.
 * `termSet` (buildTermSet) is used to re-check everything read back: a stored row that no longer passes is ignored.
 * If the database fails after opening, the store keeps working from memory for the rest of the session.
 */
export function createTermsStore(termSet: ReadonlySet<string>, factory: IDBFactory | undefined = globalThis.indexedDB): TermsStore {
  const memory = createMemoryTermsStore()
  if (!factory) return memory
  let db: Promise<IDBDatabase> | null = null
  let broken = false
  const get = () => (db ??= open(factory))
  const guard = async <T>(real: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
    if (broken) return fallback()
    try {
      return await real()
    } catch {
      broken = true
      return fallback()
    }
  }
  return {
    list: () =>
      guard(
        async () => sanitiseTerms(await run(await get(), 'readonly', (s) => s.getAll()), termSet),
        () => memory.list(),
      ),
    add: (t) =>
      guard(
        async () => {
          await run(await get(), 'readwrite', (s) => s.put({ ...t }, termId(t)))
        },
        () => memory.add(t),
      ),
    remove: (t) =>
      guard(
        async () => {
          await run(await get(), 'readwrite', (s) => s.delete(termId(t)))
        },
        () => memory.remove(t),
      ),
    clear: () =>
      guard(
        async () => {
          await run(await get(), 'readwrite', (s) => s.clear())
        },
        () => memory.clear(),
      ),
  }
}
