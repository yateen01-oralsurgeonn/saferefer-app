// Firebase setup. App Check starts here, before any AI call is possible:
// every other file gets `ai` from this module, so App Check always runs first.
import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAI, GoogleAIBackend } from 'firebase/ai'

// Always write `import.meta.env.VITE_...` in full. Never copy `import.meta.env` into a
// variable: Vite then bundles every value, including the debug token, into the build.

export const CLOUD_MODEL = 'gemini-3.5-flash-lite'

/** True when app/.env.local has the Firebase web config. */
export const isConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_APP_ID)

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

// The debug token is used on localhost only. Vite removes this block from the
// production build, so the token never ships (SECURITY.md C1).
if (import.meta.env.DEV) {
  ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true
}

if (isConfigured) {
  initializeAppCheck(app, {
    // On localhost the debug token above is used and this key is never contacted.
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || 'site-key-not-set'),
    isTokenAutoRefreshEnabled: true,
  })
}

export const ai = getAI(app, {
  backend: new GoogleAIBackend(),
  useLimitedUseAppCheckTokens: true,
})
