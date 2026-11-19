// SafeRefer service worker (T10). It precaches the APP SHELL only: the page and its own script, style and icon files.
// SECURITY A12: it never caches a POST, never caches a Google or Firebase API reply, and never writes to the cache
// while the app runs. There is no cache.put here on purpose. Anything that is not a same-origin GET of a shell file
// is left to the browser untouched, so note text and model replies never go near the cache.
// The build (vite.config.ts) replaces the two placeholders below with the real file list and a version.
const CACHE = 'saferefer-shell-__VERSION__'
const SHELL = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('saferefer-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  // Only a GET is ever answered from the cache. A POST (a note, a letter request) is never touched.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Only this site. Google, Firebase and reCAPTCHA calls go straight to the network.
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    // The page itself: network first so a new version is picked up, the cached shell when offline.
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }
  if (!SHELL.includes(url.pathname)) return
  // ignoreVary: a module script is requested with an Origin header, and a file stored without one would otherwise not match.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((hit) => hit || fetch(request)))
})
