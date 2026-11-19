// T5 screen and T6 letter: your note on the left, what the cloud will see (then the letter) on the right.
//
// Privacy rules this file keeps (CLAUDE.md, SECURITY.md A2, A5, A14, B1, D2, D4):
// - The token map lives in a React ref. The note lives in React state. Nothing is stored, logged or put in a URL.
// - Any edit clears approval. Send uses only the frozen approved string, through guardedSend.
// - Every edit aborts the running Nano call and bumps a run counter; late results are ignored.
// - Redaction never calls the cloud. The letter call (T6) is the only cloud call, and it goes through draftLetter,
//   which sends each attempt through guardedSend with the frozen approved text.
import { useEffect, useMemo, useRef, useState } from 'react'
import terms from '../../data/clinical-terms.json'
import drugs from '../../data/drugs.json'
import shorthand from '../../data/shorthand.json'
import {
  buildTermSet,
  draftLetter,
  droppedNotice,
  itemsToReview,
  MANUAL_MESSAGE,
  MANUAL_TICK,
  nanoRedact,
  redactFirst,
  segmentPreview,
  unhideTokens,
  type HideItem,
  type NanoResult,
  type ParsedLetter,
  type TokenMap,
} from './core'
import { ai, CLOUD_MODEL } from './firebase'
import { createLetterModelFn } from './letterAdapter'
import { createNanoModelFn } from './nanoAdapter'

const lists = { drugs, clinicalTerms: terms }
const termSet = buildTermSet(lists)
/** Words that are never "a possible missed name": clinical words, drug names and the shorthand list. */
const safeWords = new Set([...termSet, ...Object.keys(shorthand).map((k) => k.toLowerCase())])
const guardSafeWords = [...termSet]
const modelFn = createNanoModelFn(ai)
const letterModelFn = createLetterModelFn(ai, CLOUD_MODEL)
const NANO_DELAY_MS = 600
const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

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
  const [letter, setLetter] = useState<ParsedLetter | null>(null)
  const [showNote, setShowNote] = useState(false)
  const [problem, setProblem] = useState<{ message: string; hit?: string; blocked: boolean } | null>(null)
  const [hint, setHint] = useState('')

  const mapRef = useRef<TokenMap | null>(null)
  const runCounter = useRef(0)
  const approvedRef = useRef<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const sendCtrl = useRef<AbortController | null>(null)

  useEffect(() => {
    approvedRef.current = approved
  }, [approved])

  // Every change to the note, the hand-hidden words or the un-hidden words starts a new run.
  useEffect(() => {
    const runId = ++runCounter.current
    if (approvedRef.current !== null) setEdited(true)
    sendCtrl.current?.abort()
    setApproved(null)
    setSending(false)
    setLetter(null)
    setShowNote(false)
    setProblem(null)
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
    if (!isApproved || approved === null || !mapRef.current || sending || letter) return
    const runId = runCounter.current
    const ctrl = new AbortController()
    sendCtrl.current = ctrl
    setSending(true)
    setProblem(null)
    // The one door: draftLetter sends every attempt through guardedSend with the frozen string, never the live text.
    const result = await draftLetter(approved, mapRef.current, letterModelFn, {
      signal: ctrl.signal,
      guard: { allowed: unhidden, safeWords: guardSafeWords },
    })
    if (runCounter.current !== runId) return // the dentist edited meanwhile: this result is stale
    setSending(false)
    if (result.ok) setLetter({ letter: result.letter, notRecorded: result.notRecorded })
    else if (result.failure !== 'aborted') setProblem({ message: result.message, hit: result.hit, blocked: result.failure === 'blocked' })
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
  else if (sending) status = 'Writing the letter…'
  else if (letter) status = 'Letter ready. The names are still labels; the next step puts them back.'
  else if (problem) status = problem.message
  else if (isApproved) status = 'Approved. Only the right-hand text will be sent.'
  else if (edited) status = 'You changed the note. Please check it again.'
  else if (needManualTick) status = MANUAL_MESSAGE

  const empty = !note.trim()
  const showingLetter = letter !== null && !showNote
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
              {showingLetter ? 'Letter (written by the cloud model)' : 'What the cloud will see'}
            </span>
            {showingLetter && <span className="badge cloud">Cloud</span>}
            {(running || sending) && <span className="spinner" role="status" aria-label="Working" />}
            {letter && (
              <button type="button" className="secondary" onClick={() => setShowNote((v) => !v)}>
                {showNote ? 'Show the letter' : 'Show the hidden note'}
              </button>
            )}
          </div>
          {showingLetter ? (
            <pre className="preview letter" data-testid="letter" aria-labelledby="cloud-label">
              {letter.letter}
            </pre>
          ) : (
          <>
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
          </>
          )}
        </section>
      </div>

      <p className={`status${problem ? ' error' : isApproved || letter ? ' ok' : ''}`} aria-live="polite" data-testid="status">
        {status}
        {problem?.blocked && problem.hit && (
          <>
            {' '}
            Check: <strong data-testid="blocked-hit">{problem.hit}</strong>
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
          <button type="button" onClick={send} disabled={!isApproved || sending || letter !== null} data-testid="send">
            {problem && !problem.blocked ? 'Try again' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
