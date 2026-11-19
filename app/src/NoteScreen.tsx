// T5 screen: your note on the left, what the cloud will see on the right.
//
// Privacy rules this file keeps (CLAUDE.md, SECURITY.md A2, A5, A14, B1, D2, D4):
// - The token map lives in a React ref. The note lives in React state. Nothing is stored, logged or put in a URL.
// - Any edit clears approval. Send uses only the frozen approved string, through guardedSend.
// - Every edit aborts the running Nano call and bumps a run counter; late results are ignored.
// - Redaction never calls the cloud. Send is a stub in T5; the real letter call is T6.
import { useEffect, useMemo, useRef, useState } from 'react'
import terms from '../../data/clinical-terms.json'
import drugs from '../../data/drugs.json'
import shorthand from '../../data/shorthand.json'
import {
  buildTermSet,
  droppedNotice,
  guardedSend,
  itemsToReview,
  MANUAL_MESSAGE,
  MANUAL_TICK,
  nanoRedact,
  redactFirst,
  segmentPreview,
  unhideTokens,
  type HideItem,
  type NanoResult,
  type TokenMap,
} from './core'
import { ai } from './firebase'
import { createNanoModelFn } from './nanoAdapter'

const lists = { drugs, clinicalTerms: terms }
const termSet = buildTermSet(lists)
/** Words that are never "a possible missed name": clinical words, drug names and the shorthand list. */
const safeWords = new Set([...termSet, ...Object.keys(shorthand).map((k) => k.toLowerCase())])
const guardSafeWords = [...termSet]
const modelFn = createNanoModelFn(ai)
const NANO_DELAY_MS = 600
const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

/** T5 stub: the real cloud call is T6. It receives only the approved string and keeps nothing. */
const sendStub = async (approved: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return approved.length > 0
}

export default function NoteScreen() {
  const [note, setNote] = useState('')
  const [manualHides, setManualHides] = useState<string[]>([])
  const [unhidden, setUnhidden] = useState<string[]>([])
  const [preview, setPreview] = useState('')
  const [stageOneMissed, setStageOneMissed] = useState<HideItem[]>([])
  const [nano, setNano] = useState<NanoResult | null>(null)
  const [running, setRunning] = useState(false)
  const [tickManual, setTickManual] = useState(false)
  const [tickReview, setTickReview] = useState(false)
  const [approved, setApproved] = useState<string | null>(null)
  const [edited, setEdited] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [blocked, setBlocked] = useState<{ message: string; hit: string } | null>(null)
  const [hint, setHint] = useState('')

  const mapRef = useRef<TokenMap | null>(null)
  const runCounter = useRef(0)
  const approvedRef = useRef<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    approvedRef.current = approved
  }, [approved])

  // Every change to the note, the hand-hidden words or the un-hidden words starts a new run.
  useEffect(() => {
    const runId = ++runCounter.current
    if (approvedRef.current !== null) setEdited(true)
    setApproved(null)
    setSent(false)
    setBlocked(null)
    setHint('')
    setNano(null)
    setTickManual(false)
    setTickReview(false)
    if (!note.trim()) {
      mapRef.current = null
      setPreview('')
      setStageOneMissed([])
      setRunning(false)
      return
    }
    // Stage one is instant: the code redactor, then the hand-hidden words.
    const first = redactFirst(note, manualHides)
    mapRef.current = first.map
    setPreview(unhideTokens(first.text, first.map, unhidden))
    setStageOneMissed(first.notFound)
    setRunning(true)

    // Stage two: Gemini Nano on the device, after a short pause so typing does not flood it (SECURITY D2).
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      const result = await nanoRedact(first.text, first.map, modelFn, lists, { signal: ctrl.signal })
      if (runCounter.current !== runId || result.aborted) return
      setNano(result)
      setPreview(unhideTokens(result.text, first.map, unhidden))
      setRunning(false)
    }, NANO_DELAY_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [note, manualHides, unhidden])

  const review = useMemo(() => (nano ? [...itemsToReview(nano), ...stageOneMissed] : stageOneMissed), [nano, stageOneMissed])
  const needManualTick = nano?.state === 'manual'
  const needReviewTick = review.length > 0 && !running
  const canApprove =
    !running && nano !== null && preview.trim() !== '' && (!needManualTick || tickManual) && (!needReviewTick || tickReview)
  // Approval only counts while it still matches the right-hand text and every tick is still ticked.
  const isApproved = approved !== null && approved === preview && canApprove

  const segments = useMemo(() => segmentPreview(preview, { safe: safeWords, allowed: unhidden }), [preview, unhidden])
  const missedCount = segments.filter((s) => s.kind === 'amber').length

  function onNoteChange(value: string) {
    setNote(value)
  }

  function approve() {
    if (!canApprove) return
    setEdited(false)
    setApproved(preview)
  }

  async function send() {
    if (!isApproved || approved === null || !mapRef.current || sending) return
    setSending(true)
    setBlocked(null)
    // The one door: guardedSend gets the frozen string, never the live text.
    const result = await guardedSend(approved, mapRef.current, sendStub, { allowed: unhidden, safeWords: guardSafeWords })
    setSending(false)
    if (!result.ok) setBlocked({ message: result.message, hit: result.hit })
    else setSent(true)
  }

  function unhide(token: string) {
    const entry = mapRef.current?.get(token)
    if (!entry) return
    setUnhidden((prev) => [...prev, ...entry.variants.filter((v) => !prev.some((p) => fold(p) === fold(v)))])
  }

  function hideSelection() {
    const sel = window.getSelection()
    const text = sel?.toString().trim() ?? ''
    if (!sel || !text || !previewRef.current?.contains(sel.anchorNode)) {
      setHint('Select some words in the right-hand text first, then press this button.')
      return
    }
    if (/[[\]]/.test(text)) {
      setHint('Select plain words, not a hidden label.')
      return
    }
    setManualHides((prev) => (prev.some((p) => fold(p) === fold(text)) ? prev : [...prev, text]))
    sel.removeAllRanges()
  }

  let status = 'Check the right-hand text. Is every name hidden?'
  if (!note.trim()) status = 'Type or paste a note to begin.'
  else if (running) status = 'Hiding names in this browser…'
  else if (sending) status = 'Sending…'
  else if (sent) status = 'Sent to a stub. The real letter call is built in T6.'
  else if (blocked) status = blocked.message
  else if (isApproved) status = 'Approved. Only the right-hand text will be sent.'
  else if (edited) status = 'You changed the note. Please check it again.'
  else if (needManualTick) status = MANUAL_MESSAGE

  const empty = !note.trim()
  return (
    <div className="app" role="main">
      <header className="top">
        <h1>SafeRefer</h1>
        <p className="banner">Synthetic data only: not for real patients</p>
      </header>

      <div className="panes">
        <section className="pane">
          <label htmlFor="note">Your note (stays in this browser)</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Type or paste a synthetic clinical note"
          />
        </section>

        <section className="pane">
          <div className="pane-head">
            <span className="pane-label" id="cloud-label">
              What the cloud will see
            </span>
            {running && <span className="spinner" role="status" aria-label="Hiding names" />}
          </div>
          <div
            ref={previewRef}
            className="preview"
            aria-labelledby="cloud-label"
            data-testid="preview"
            spellCheck={false}
          >
            {empty ? (
              <span className="placeholder">Hidden text appears here. Names, phones and dates become labels.</span>
            ) : (
              segments.map((s, i) =>
                s.kind === 'token' ? (
                  <button
                    key={i}
                    type="button"
                    className="chip"
                    title="Click to show this text again"
                    onClick={() => unhide(s.text)}
                  >
                    {s.text}
                  </button>
                ) : s.kind === 'amber' ? (
                  <mark key={i} className="amber" title="Check this: is it a name?">
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )
            )}
          </div>
          <div className="pane-tools">
            <button
              type="button"
              className="secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={hideSelection}
              disabled={empty}
            >
              Hide selected words
            </button>
            <span className="small">Click a label to show its text again.</span>
            {missedCount > 0 && <span className="small amber-note">Check this: {missedCount} underlined</span>}
          </div>
          {hint && <p className="small">{hint}</p>}
        </section>
      </div>

      <p className={`status${blocked ? ' error' : isApproved || sent ? ' ok' : ''}`} aria-live="polite" data-testid="status">
        {status}
        {blocked && blocked.hit && (
          <>
            {' '}
            Check: <strong data-testid="blocked-hit">{blocked.hit}</strong>
          </>
        )}
      </p>

      {!running && review.length > 0 && (
        <p className="small review" data-testid="review">
          {droppedNotice(review.length)} {review.map((i) => i.text).join(', ')}
        </p>
      )}

      <div className="bar">
        <div className="ticks">
          {needManualTick && (
            <label className="tick">
              <input type="checkbox" checked={tickManual} onChange={(e) => setTickManual(e.target.checked)} /> {MANUAL_TICK}
            </label>
          )}
          {needReviewTick && (
            <label className="tick">
              <input type="checkbox" checked={tickReview} onChange={(e) => setTickReview(e.target.checked)} /> I checked the
              items listed above
            </label>
          )}
        </div>
        <div className="buttons">
          <button type="button" onClick={approve} disabled={!canApprove || isApproved}>
            {isApproved ? 'Approved' : 'Approve'}
          </button>
          <button type="button" onClick={send} disabled={!isApproved || sending} data-testid="send">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
