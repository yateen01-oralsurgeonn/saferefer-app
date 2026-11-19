import LeakTest from './LeakTest'
import NoteScreen from './NoteScreen'
import SetupCheck from './SetupCheck'

// The setup page (T1) stays for development only: open /?setup. Vite removes the branch from the production build.
export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('setup')) return <SetupCheck />
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('leak')) return <LeakTest />
  return <NoteScreen />
}
