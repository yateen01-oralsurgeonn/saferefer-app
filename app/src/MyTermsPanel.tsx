// T16: the "My terms" list. Shows what is remembered on this device, one delete button per row, and Forget all.
// Confirmation is in-page (no window.confirm). Never shows a note, a label map or a letter.
import { useState } from 'react'
import type { SavedTerm } from './core'

const KIND_LABEL = { place: 'Place', org: 'Lab / organisation', idFormat: 'ID format' } as const
const label = (t: SavedTerm) => (t.kind === 'idFormat' ? t.prefix : t.text)

export default function MyTermsPanel({
  terms,
  onRemove,
  onClear,
}: {
  terms: readonly SavedTerm[]
  onRemove: (t: SavedTerm) => void
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <section className="card my-terms" data-testid="my-terms-panel" aria-label="My terms">
      <p className="small">Remembered on this device only, as plain text. Never a patient&rsquo;s name. Nothing here is sent anywhere.</p>
      {terms.length === 0 ? (
        <p className="small grey" data-testid="my-terms-empty">
          Nothing is remembered yet. Hide some words by hand, then choose Remember.
        </p>
      ) : (
        <ul className="terms-list">
          {terms.map((t) => (
            <li key={`${t.kind}:${label(t)}`} data-testid="my-term">
              <span className="small grey">{KIND_LABEL[t.kind]}</span> {t.kind === 'idFormat' ? `${t.prefix.toUpperCase()} + any number` : t.text}{' '}
              <button type="button" className="secondary" onClick={() => onRemove(t)} aria-label={`Delete ${label(t)}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {terms.length > 0 &&
        (confirming ? (
          <p className="small" role="alert">
            Forget all {terms.length} remembered terms?{' '}
            <button
              type="button"
              className="secondary"
              data-testid="forget-confirm"
              onClick={() => {
                setConfirming(false)
                onClear()
              }}
            >
              Yes, forget all
            </button>{' '}
            <button type="button" className="secondary" onClick={() => setConfirming(false)}>
              Keep them
            </button>
          </p>
        ) : (
          <button type="button" className="secondary" data-testid="forget-all" onClick={() => setConfirming(true)}>
            Forget all
          </button>
        ))}
    </section>
  )
}
