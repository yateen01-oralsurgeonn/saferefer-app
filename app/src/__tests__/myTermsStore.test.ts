import { describe, expect, it, vi } from 'vitest'
import clinical from '../../../data/clinical-terms.json'
import drugs from '../../../data/drugs.json'
import { buildTermSet, type SavedTerm } from '../core'
import { createMemoryTermsStore, createTermsStore } from '../myTermsStore'

const termSet = buildTermSet({ drugs, clinicalTerms: clinical })

/** A tiny in-memory IDBFactory: just enough for one object store with put/getAll/delete/clear. */
function fakeFactory(put?: (value: unknown, key: unknown) => void, failOpen = false): IDBFactory {
  const data = new Map<string, unknown>()
  const reqOf = <T,>(result: T, tx: Record<string, unknown>) => {
    const req = { result } as IDBRequest<T>
    queueMicrotask(() => (tx.oncomplete as (() => void) | undefined)?.())
    return req
  }
  return {
    open() {
      const req: Record<string, unknown> = {}
      queueMicrotask(() => {
        if (failOpen) return (req.onerror as () => void)?.()
        req.result = {
          createObjectStore: () => ({}),
          transaction() {
            const tx: Record<string, unknown> = {}
            tx.objectStore = () => ({
              put: (v: unknown, k: string) => (put?.(v, k), data.set(k, v), reqOf(k, tx)),
              getAll: () => reqOf([...data.values()], tx),
              delete: (k: string) => (data.delete(k), reqOf(undefined, tx)),
              clear: () => (data.clear(), reqOf(undefined, tx)),
            })
            return tx
          },
        }
        ;(req.onupgradeneeded as () => void)?.()
        ;(req.onsuccess as () => void)?.()
      })
      return req as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory
}

const place: SavedTerm = { kind: 'place', text: 'behind bus stand' }
const lab: SavedTerm = { kind: 'org', text: 'Sunrise Ortho Lab' }
const op: SavedTerm = { kind: 'idFormat', prefix: 'op' }

describe('T16 myTermsStore', () => {
  it('add / list / remove / clear against a fake IndexedDB', async () => {
    const s = createTermsStore(termSet, fakeFactory())
    await s.add(place)
    await s.add(lab)
    await s.add({ kind: 'place', text: 'BEHIND  bus stand' }) // same term, folded
    await s.add(op)
    expect(await s.list()).toHaveLength(3)
    await s.remove(lab)
    expect((await s.list()).map((t) => t.kind).sort()).toEqual(['idFormat', 'place'])
    await s.clear()
    expect(await s.list()).toEqual([])
  })

  it('put is called with a SavedTerm and nothing else, keyed by the folded term', async () => {
    const put = vi.fn()
    const s = createTermsStore(termSet, fakeFactory(put))
    await s.add(place)
    await s.add(op)
    expect(put.mock.calls).toEqual([
      [{ kind: 'place', text: 'behind bus stand' }, 'place:behind bus stand'],
      [{ kind: 'idFormat', prefix: 'op' }, 'id:op'],
    ])
  })

  it('a row that no longer passes validation is ignored on read', async () => {
    const s = createTermsStore(termSet, fakeFactory())
    await s.add(place)
    await s.add({ kind: 'place', text: '00000 55501' } as SavedTerm) // simulated tampering
    expect(await s.list()).toEqual([place])
  })

  it('falls back to memory when the factory is missing or the database cannot open', async () => {
    for (const s of [createTermsStore(termSet, undefined), createTermsStore(termSet, fakeFactory(undefined, true))]) {
      await s.add(place)
      expect(await s.list()).toEqual([place])
      await s.clear()
      expect(await s.list()).toEqual([])
    }
    const m = createMemoryTermsStore()
    await m.add(op)
    expect(await m.list()).toEqual([op])
  })

  it('makes no network request', async () => {
    const original = globalThis.fetch
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    try {
      const s = createTermsStore(termSet, fakeFactory())
      await s.add(place)
      await s.list()
    } finally {
      globalThis.fetch = original
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
