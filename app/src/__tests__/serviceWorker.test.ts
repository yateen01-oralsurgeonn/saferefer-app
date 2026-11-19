import { describe, expect, it, vi } from 'vitest'
import swTemplate from '../../sw-template.js?raw'

// Run the real service-worker file against stand-ins for `self`, `caches` and `fetch`.
const SHELL = ['/', '/index.html', '/favicon.svg', '/assets/index-abc.js', '/assets/index-abc.css']
const ORIGIN = 'https://saferefer.example'

function load() {
  const handlers: Record<string, (e: unknown) => void> = {}
  const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(), add: vi.fn() }
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['saferefer-shell-old', 'other-app']),
    delete: vi.fn(async () => true),
    match: vi.fn(async (r: unknown, _opts?: unknown) => ({ cached: typeof r === 'string' ? r : (r as { url: string }).url })),
  }
  const fetchFn = vi.fn(async (r: { url: string }) => ({ network: r.url }))
  const selfStub = {
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
    addEventListener: (name: string, fn: (e: unknown) => void) => {
      handlers[name] = fn
    },
  }
  const source = swTemplate.replace('__PRECACHE__', JSON.stringify(SHELL)).replace('__VERSION__', 'v1')
  new Function('self', 'caches', 'fetch', source)(selfStub, caches, fetchFn)
  const ask = async (method: string, url: string, mode = 'cors') => {
    const respondWith = vi.fn()
    handlers.fetch({ request: { method, url, mode }, respondWith })
    const answered = respondWith.mock.calls.length > 0
    return { answered, value: answered ? await respondWith.mock.calls[0][0] : undefined }
  }
  return { handlers, cache, caches, fetchFn, selfStub, ask }
}

describe('T10 service worker (SECURITY A12)', () => {
  it('has no runtime cache write anywhere in its source', () => {
    expect(swTemplate).not.toMatch(/\.put\(/)
    expect(swTemplate).not.toMatch(/\.add\(/)
    expect(swTemplate).not.toMatch(/localStorage|indexedDB|postMessage/)
    // the only cache write is addAll of the shell at install
    expect(swTemplate.match(/addAll/g)).toHaveLength(1)
  })

  it('install precaches exactly the shell list, nothing else', async () => {
    const t = load()
    await new Promise<void>((resolve) => t.handlers.install({ waitUntil: (p: Promise<unknown>) => void p.then(() => resolve()) }))
    expect(t.cache.addAll).toHaveBeenCalledWith(SHELL)
    expect(t.cache.put).not.toHaveBeenCalled()
  })

  it('activate removes only old SafeRefer shell caches', async () => {
    const t = load()
    await new Promise<void>((resolve) => t.handlers.activate({ waitUntil: (p: Promise<unknown>) => void p.then(() => resolve()) }))
    expect(t.caches.delete).toHaveBeenCalledTimes(1)
    expect(t.caches.delete).toHaveBeenCalledWith('saferefer-shell-old')
  })

  it('a POST is never answered from the cache: not the app\'s own, not Google\'s', async () => {
    const t = load()
    expect((await t.ask('POST', `${ORIGIN}/anything`)).answered).toBe(false)
    expect((await t.ask('POST', 'https://firebasevertexai.googleapis.com/v1beta/projects/p/models/m:generateContent')).answered).toBe(false)
    expect((await t.ask('PUT', `${ORIGIN}/assets/index-abc.js`)).answered).toBe(false)
  })

  it('other sites (Google, Firebase, reCAPTCHA) go straight to the network, even as GET', async () => {
    const t = load()
    for (const url of [
      'https://firebasevertexai.googleapis.com/v1beta/x',
      'https://content-firebaseappcheck.googleapis.com/v1/x',
      'https://www.google.com/recaptcha/enterprise.js',
    ]) {
      expect((await t.ask('GET', url)).answered, url).toBe(false)
    }
    expect(t.caches.match).not.toHaveBeenCalled()
  })

  it('a shell file is answered from the cache, with the network as the fallback', async () => {
    const t = load()
    const r = await t.ask('GET', `${ORIGIN}/assets/index-abc.js`)
    expect(r.answered).toBe(true)
    // a request with an Origin header must still find a file that was stored without one (Vary: Origin)
    expect(t.caches.match).toHaveBeenCalledWith(expect.anything(), { ignoreVary: true })
    t.caches.match.mockResolvedValueOnce(undefined as never)
    const miss = await t.ask('GET', `${ORIGIN}/assets/index-abc.css`)
    expect(miss.value).toEqual({ network: `${ORIGIN}/assets/index-abc.css` })
  })

  it('a same-site file that is not in the shell is left alone', async () => {
    const t = load()
    expect((await t.ask('GET', `${ORIGIN}/assets/other.js`)).answered).toBe(false)
    expect((await t.ask('GET', `${ORIGIN}/api/anything`)).answered).toBe(false)
  })

  it('the page itself: network first, the cached shell when offline', async () => {
    const t = load()
    const online = await t.ask('GET', `${ORIGIN}/?leak`, 'navigate')
    expect(online.value).toEqual({ network: `${ORIGIN}/?leak` })
    t.fetchFn.mockRejectedValueOnce(new TypeError('offline'))
    const offline = await t.ask('GET', `${ORIGIN}/`, 'navigate')
    expect(offline.value).toEqual({ cached: '/index.html' })
  })

  it('nothing is ever written to the cache while fetching', async () => {
    const t = load()
    await t.ask('GET', `${ORIGIN}/assets/index-abc.js`)
    await t.ask('GET', `${ORIGIN}/`, 'navigate')
    await t.ask('POST', `${ORIGIN}/x`)
    expect(t.cache.put).not.toHaveBeenCalled()
    expect(t.cache.add).not.toHaveBeenCalled()
  })
})
