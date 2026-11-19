// T4 test panel (development only; Vite removes it from the production build).
// The real screen is T5. This shows: code redactor, then the Nano redactor, then the result.
// The token map lives in a ref and is never shown, stored or logged.
import { useRef, useState } from 'react'
import terms from '../../data/clinical-terms.json'
import drugs from '../../data/drugs.json'
import { droppedNotice, itemsToReview, MANUAL_MESSAGE, nanoRedact, redactByCode, TokenMap, type NanoResult } from './core'
import { ai } from './firebase'
import { createNanoModelFn } from './nanoAdapter'

const lists = { drugs, clinicalTerms: terms }
const modelFn = createNanoModelFn(ai)

export default function RedactorCheck() {
  const [note, setNote] = useState('')
  const [out, setOut] = useState<{ code: string; nano: NanoResult } | null>(null)
  const [busy, setBusy] = useState(false)
  const map = useRef(new TokenMap())

  async function run() {
    setBusy(true)
    map.current = new TokenMap()
    const code = redactByCode(note, map.current)
    const nano = await nanoRedact(code.text, map.current, modelFn, lists)
    setOut({ code: code.text, nano })
    setBusy(false)
  }

  return (
    <section>
      <h2>Redaction check (T4, test only)</h2>
      <textarea
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-label="Synthetic note"
        placeholder="Paste a synthetic note"
      />
      <div className="row">
        <button onClick={run} disabled={busy || !note.trim()}>
          Redact
        </button>
      </div>
      {out && (
        <div data-testid="redaction-result">
          <p className="status" data-testid="redaction-state">
            {out.nano.state === 'ok' ? 'Automatic check done.' : MANUAL_MESSAGE}
          </p>
          <pre data-testid="redaction-text">{out.nano.text}</pre>
          {itemsToReview(out.nano).length > 0 && (
            <p className="status">
              {droppedNotice(itemsToReview(out.nano).length)} {itemsToReview(out.nano).map((i) => i.text).join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
