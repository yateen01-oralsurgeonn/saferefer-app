import { describe, expect, it, vi } from 'vitest'
import notes from '../../../../data/notes.json'
import {
  asQueuedItem,
  createMemoryStore,
  enqueue,
  LetterCallError,
  MAX_QUEUED_CHARS,
  QUEUED_MESSAGE,
  readQueued,
  redactByCode,
  sendQueued,
  TokenMap,
  type LetterModelFn,
  type QueuedItem,
  type QueueStore,
} from '..'

const note = notes[0]
const { text: approved, map } = redactByCode(note.text)
const GOOD = JSON.stringify({ letter: 'Dear Colleague,\nRe: [PATIENT]\nTooth 36 deep distal caries.', not_recorded: [] })
const item = (over: Partial<QueuedItem> = {}): QueuedItem => ({ id: 'current', packId: 'dental', approved, savedAt: 1, ...over })

describe('T10 queue: what is stored', () => {
  it('stores only the approved anonymous string and the profession id', async () => {
    const store = createMemoryStore()
    const r = await enqueue(store, approved, 'ca', map, undefined, () => 42)
    expect(r).toEqual({ ok: true })
    expect(store.peek()).toEqual({ id: 'current', packId: 'ca', approved, savedAt: 42 })
    const json = JSON.stringify(store.peek())
    for (const id of note.identifiers) for (const part of id.value.split(/\s+/)) expect(json.toLowerCase()).not.toContain(part.toLowerCase())
  })

  it('a second approved note replaces the first (one slot)', async () => {
    const store = createMemoryStore()
    await enqueue(store, approved, 'dental', map)
    await enqueue(store, approved + ' Extra.', 'dental', map)
    expect((await readQueued(store))?.approved).toBe(approved + ' Extra.')
  })

  it('SECURITY A6: the write goes through the send guard; a name, phone or email left in the text is never stored', async () => {
    for (const text of [note.text, 'Call 98765 43210 about 36.', 'Mail x@example.org about 36.']) {
      const store = createMemoryStore()
      const r = await enqueue(store, text, 'dental', map)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.reason).toBe('blocked')
      expect(store.peek()).toBeNull()
    }
  })

  it('nothing approved, or too long: nothing stored', async () => {
    const store = createMemoryStore()
    expect(await enqueue(store, null, 'dental', map)).toMatchObject({ ok: false, reason: 'not-approved' })
    expect(await enqueue(store, '', 'dental', map)).toMatchObject({ ok: false, reason: 'not-approved' })
    expect(await enqueue(store, 'x '.repeat(MAX_QUEUED_CHARS), 'dental', map)).toMatchObject({ ok: false, reason: 'too-long' })
    expect(store.peek()).toBeNull()
  })

  it('a storage failure gives a fixed message with no error text', async () => {
    const broken: QueueStore = {
      read: async () => {
        throw new Error('Asha 00000 55501')
      },
      write: async () => {
        throw new Error('Asha 00000 55501')
      },
      clear: async () => {
        throw new Error('x')
      },
    }
    const r = await enqueue(broken, approved, 'dental', map)
    expect(r).toMatchObject({ ok: false, reason: 'store' })
    expect(JSON.stringify(r)).not.toContain('Asha')
    expect(await readQueued(broken)).toBeNull()
  })
})

describe('T10 queue: what comes back from storage is untrusted', () => {
  it('accepts exactly the stored shape', () => {
    expect(asQueuedItem(item())).toEqual(item())
  })
  it.each([
    ['an extra field (a note)', { ...item(), note: 'Asha Patil' }],
    ['a missing field', { id: 'current', packId: 'dental', approved }],
    ['an unknown profession', item({ packId: 'nope' as never })],
    ['an inherited profession name', item({ packId: 'constructor' as never })],
    ['an empty string', item({ approved: '   ' })],
    ['a huge string', item({ approved: 'x'.repeat(MAX_QUEUED_CHARS + 1) })],
    ['a wrong slot id', { ...item(), id: 'other' }],
    ['a string, not an object', 'hello'],
    ['null', null],
    ['an array', [item()]],
  ])('rejects %s', (_name, raw) => {
    expect(asQueuedItem(raw)).toBeNull()
  })
})

describe('T10 queue: sending a queued item', () => {
  it('sends the item\'s own frozen string, with the profession\'s letter words, and clears the slot on success', async () => {
    const store = createMemoryStore()
    await enqueue(store, approved, 'ca', map)
    const queued = (await readQueued(store))!
    const fn = vi.fn<LetterModelFn>(async () => GOOD)
    const r = await sendQueued(store, queued, map, fn)
    expect(r.ok).toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0][1]).toBe(approved)
    expect(fn.mock.calls[0][0]).toContain('chartered accountant')
    expect(store.peek()).toBeNull()
  })

  it('offline, quota and App Check failures keep the item for the next try', async () => {
    for (const kind of ['offline', 'quota', 'app-check'] as const) {
      const store = createMemoryStore()
      await enqueue(store, approved, 'dental', map)
      const fn = vi.fn<LetterModelFn>(async () => {
        throw new LetterCallError(kind)
      })
      const r = await sendQueued(store, (await readQueued(store))!, map, fn)
      expect(r.ok).toBe(false)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(await readQueued(store)).not.toBeNull()
    }
  })

  it('a bad reply keeps the item too (the dentist can try again)', async () => {
    const store = createMemoryStore()
    await enqueue(store, approved, 'dental', map)
    const r = await sendQueued(store, (await readQueued(store))!, map, async () => 'nonsense')
    expect(r).toMatchObject({ ok: false, failure: 'bad-reply' })
    expect(await readQueued(store)).not.toBeNull()
  })

  it('SECURITY A2: the guard runs again at send time; a text that now fails it is dropped from the queue and never sent', async () => {
    const store = createMemoryStore()
    await enqueue(store, approved, 'dental', new TokenMap())
    // The page now knows a name that the queued text contains: the guard must stop it.
    const m = new TokenMap()
    m.assign('PERSON', 'Fakepur')
    const queued = item({ approved: 'Seen in Fakepur. Tooth 36 caries.' })
    await store.write(queued)
    const fn = vi.fn<LetterModelFn>(async () => GOOD)
    const r = await sendQueued(store, queued, m, fn)
    expect(r).toMatchObject({ ok: false, failure: 'blocked' })
    expect(fn).not.toHaveBeenCalled()
    expect(await readQueued(store)).toBeNull()
  })

  it('after a reload the map is empty: a clean queued text still sends, tokens stay as labels', async () => {
    const store = createMemoryStore()
    await enqueue(store, approved, 'dental', map)
    const reloaded = (await readQueued(store))!
    const r = await sendQueued(store, reloaded, new TokenMap(), async () => GOOD)
    expect(r.ok && r.letter).toContain('[PATIENT]')
  })

  it('the queued message is the fixed FINISH.md text', () => {
    expect(QUEUED_MESSAGE).toBe('You are offline. The letter is queued and will be sent when you are back online.')
  })
})

describe('SECURITY B1: storage APIs live in the two storage modules alone', () => {
  const sources = import.meta.glob(['../../**/*.{ts,tsx}', '!../../**/__tests__/**'], { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
  it('indexedDB, localStorage, sessionStorage, the Cache API and cookies appear only in queueStore.ts and myTermsStore.ts', () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /(?:indexedDB|localStorage|sessionStorage|caches\.|document\.cookie)/.test(text))
      .map(([path]) => path.replace('../../', ''))
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    expect(offenders.sort()).toEqual(['myTermsStore.ts', 'queueStore.ts'])
  })
})
