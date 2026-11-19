import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

// T12: React prints a caught error, with its text, to the console. An error could hold anything, so the three error
// hooks are switched off: the dentist sees the fixed sentence of ErrorBoundary and nothing is logged (SECURITY A8).
const quiet = () => {}

createRoot(document.getElementById('root')!, { onCaughtError: quiet, onUncaughtError: quiet, onRecoverableError: quiet }).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// T10: the service worker keeps the app shell so the page opens offline. Production build only (never in development).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app works without it */
    })
  })
}
