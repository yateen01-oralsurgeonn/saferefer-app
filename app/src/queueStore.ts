// The offline queue's storage: the ONLY file in the app that touches IndexedDB (SECURITY B1, T13 greps for it).
// One database, one object store, one slot. It holds a QueuedItem (core/queue.ts): the approved anonymous string
// and the profession id. Never the note, the token map or a restored letter.
// No console output. If IndexedDB is missing or blocked (a private window, site data cleared), it falls back to memory,
// so the app still works and the queue simply does not survive a reload.
import { createMemoryStore, type QueuedItem, type QueueStore } from './core'

const DB_NAME = 'saferefer-queue'
const STORE = 'queue'
const KEY = 'current'

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('queue-db'))
    req.onblocked = () => reject(new Error('queue-db'))
  })
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = work(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(new Error('queue-db'))
    tx.onabort = () => reject(new Error('queue-db'))
  })
}

/** The browser's queue store, or a memory store when IndexedDB cannot be used. */
export function createQueueStore(factory: IDBFactory | undefined = globalThis.indexedDB): QueueStore {
  if (!factory) return createMemoryStore()
  let db: Promise<IDBDatabase> | null = null
  const get = () => (db ??= open(factory))
  return {
    read: async () => run(await get(), 'readonly', (s) => s.get(KEY)),
    write: async (item: QueuedItem) => {
      await run(await get(), 'readwrite', (s) => s.put(item, KEY))
    },
    clear: async () => {
      await run(await get(), 'readwrite', (s) => s.delete(KEY))
    },
  }
}
