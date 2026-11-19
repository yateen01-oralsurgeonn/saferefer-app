import { lazy, Suspense } from 'react'
import NoteScreen from './NoteScreen'
import SetupCheck from './SetupCheck'

// The leak-test page holds the synthetic test notes. It is loaded only in development, through a dynamic import, so
// Vite drops the page AND its notes from the production build (checked in T13: search dist/ for a test name).
const LeakTest = import.meta.env.DEV ? lazy(() => import('./LeakTest')) : null

// The setup page (T1) stays for development only: open /?setup. Vite removes the branch from the production build.
export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('setup')) return <SetupCheck />
  if (LeakTest && new URLSearchParams(window.location.search).has('leak')) {
    return (
      <Suspense fallback={null}>
        <LeakTest />
      </Suspense>
    )
  }
  return <NoteScreen />
}
