// T12 the last safety net (FINISH.md "Anything else (error boundary)"). If anything in the screen throws while drawing,
// the dentist reads one fixed sentence and a Reload button. The error itself is never shown, stored or logged:
// it could hold anything, so this file does not even keep a reference to it (SECURITY A8, B3).
// An error boundary cannot know whether something was sent, so it uses the "unsure" text, which never claims "not sent".
import { Component, type ReactNode } from 'react'
import { messageFor } from './core'

interface State {
  crashed: boolean
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false }

  // Returns a flag only. The error object is dropped here.
  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div className="crash" role="alert" data-testid="crash">
        <p className="banner">Synthetic data only: not for real patients</p>
        <h1>SafeRefer</h1>
        <p className="crash-text">{messageFor('unknown-unsure')}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    )
  }
}
