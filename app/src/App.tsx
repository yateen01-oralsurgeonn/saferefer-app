import { useState } from 'react'
import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai'
import { ai, CLOUD_MODEL, isConfigured } from './firebase'

type Mode = (typeof InferenceMode)[keyof typeof InferenceMode]
type Badge = 'on-device' | 'cloud' | null

function askModel(mode: Mode) {
  return getGenerativeModel(ai, {
    mode,
    inCloudParams: { model: CLOUD_MODEL },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      },
    },
  })
}

export default function App() {
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState('')
  const [badge, setBadge] = useState<Badge>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>(InferenceMode.PREFER_ON_DEVICE)

  async function ask() {
    if (!question.trim() || busy) return
    setBusy(true)
    setReply('')
    setBadge(null)
    setMessage('Asking...')
    try {
      const result = await askModel(mode).generateContent(question)
      setReply(result.response.text())
      setBadge(result.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'cloud')
      setMessage('')
    } catch {
      // Fixed message only: never show raw error text (CLAUDE.md rule 4).
      setMessage(
        mode === InferenceMode.ONLY_ON_DEVICE
          ? 'The on-device model is not available. Nothing was sent to the cloud.'
          : 'Could not get an answer. Check the connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <p className="banner">Synthetic data only: not for real patients</p>
      <h1>SafeRefer</h1>
      <p className="hint">Setup check: one Firebase AI Logic call, on-device first, cloud as fallback.</p>

      {!isConfigured && <p className="status">Firebase is not set up yet. Fill in app/.env.local and restart.</p>}

      <label htmlFor="question">Your question</label>
      <textarea
        id="question"
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder="Say hello"
      />

      <div className="row">
        <button onClick={ask} disabled={busy || !question.trim() || !isConfigured}>
          Ask
        </button>
        {import.meta.env.DEV && (
          <label className="devmode">
            Test mode{' '}
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value={InferenceMode.PREFER_ON_DEVICE}>on-device first (normal)</option>
              <option value={InferenceMode.ONLY_ON_DEVICE}>on-device only</option>
              <option value={InferenceMode.ONLY_IN_CLOUD}>cloud only</option>
            </select>
          </label>
        )}
      </div>

      {message && <p className="status">{message}</p>}

      {badge && (
        <section className="reply">
          <span className={`badge ${badge}`} data-testid="badge">
            {badge}
          </span>
          <p data-testid="reply">{reply}</p>
        </section>
      )}
    </main>
  )
}
