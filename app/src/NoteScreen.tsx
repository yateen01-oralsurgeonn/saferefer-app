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
  checkFacts,
  DEFAULT_PACK,
  getPack,
  PACKS,
  type Pack,
  draftLetter,
  droppedNotice,
  hasRed,
  itemsToReview,
  listTeeth,
  RULES_ONLY_MESSAGE,
  type ToothResult,
  MANUAL_MESSAGE,
  MANUAL_TICK,
  nanoRedact,
  redactFirst,
  rulesForPack,
  restoreLetter,
  type Warning,
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
import { createToothModelFn } from './toothAdapter'

const lists = { drugs, clinicalTerms: terms }
const termSet = buildTermSet(lists)
/** Words that are never "a possible missed name": clinical words, drug names and the shorthand list. */
const safeWords = new Set([...termSet, ...Object.keys(shorthand).map((k) => k.toLowerCase())])
const guardSafeWords = [...termSet]
const modelFn = createNanoModelFn(ai)
const letterModelFn = createLetterModelFn(ai, CLOUD_MODEL)
const toothModelFn = createToothModelFn(ai, CLOUD_MODEL)
const BADGE_TEXT = { 'on-device': 'On-device', cloud: 'Cloud', rules: 'Rules only' } as const
const NANO_DELAY_MS = 600
const FACT_DELAY_MS = 300
const factLists = { drugs, treatments: terms.treatments, findings: terms.findings, shorthand }
/** Professions without teeth check only numbers, dates and the generic word lists (P2). */
const genericFactLists = { drugs: [], treatments: [], findings: [], shorthand: {} }
/** Template heading lines are not fact-checked; the model may add a colon to them. */
const skipLinesOf = (pack: Pack) => pack.letter.template.flatMap((l) => [l, `${l}:`])
const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

export default function NoteScreen() {
  // P1: the profession pack changes words only (packs.ts). Every lock stays the same.
  const [pack, setPack] = useState<Pack>(DEFAULT_PACK)
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
  // The restored letter is the dentist's to edit. It lives in React state only (SECURITY B1).
  const [letterText, setLetterText] = useState<string | null>(null)
  const [tokenWarnings, setTokenWarnings] = useState<Warning[]>([])
  const [factWarnings, setFactWarnings] = useState<Warning[]>([])
  const [ackKey, setAckKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [problem, setProblem] = useState<{ message: string; hit?: string; blocked: boolean } | null>(null)
  const [hint, setHint] = useState('')
  const [teeth, setTeeth] = useState<ToothResult | null>(null)
  const [listingTeeth, setListingTeeth] = useState(false)

  const mapRef = useRef<TokenMap | null>(null)
  const runCounter = useRef(0)
  const approvedRef = useRef<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const sendCtrl = useRef<AbortController | null>(null)
  const toothCtrl = useRef<AbortController | null>(null)

  useEffect(() => {
    approvedRef.current = approved
  }, [approved])

  // Every change to the note, the hand-hidden words or the un-hidden words starts a new run.
  useEffect(() => {
    const runId = ++runCounter.current
    if (approvedRef.current !== null) setEdited(true)
    sendCtrl.current?.abort()
    toothCtrl.current?.abort()
    setTeeth(null)
    setListingTeeth(false)
    setApproved(null)
    setSending(false)
    setLetter(null)
    setLetterText(null)
    setFactWarnings([])
    setTokenWarnings([])
    setAckKey('')
    setCopied(false)
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
    const first = redactFirst(note, manualHides, rulesForPack(pack))
    mapRef.current = first.map
    setPreview(unhideTokens(first.text, first.map, unhidden))
    setStageOneMissed(first.notFound)
    setRunning(true)

    // Stage two: Gemini Nano on the device, after a short pause so typing does not flood it (SECURITY D2).
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      const result = await nanoRedact(first.text, first.map, modelFn, lists, { signal: ctrl.signal, noteKind: pack.nanoNoteKind })
      if (runCounter.current !== runId || result.aborted) return
      setNano(result)
      setPreview(unhideTokens(result.text, first.map, unhidden))
      setRunning(false)
    }, NANO_DELAY_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [note, manualHides, unhidden, pack])

  const review = useMemo(() => (nano ? [...itemsToReview(nano), ...stageOneMissed] : stageOneMissed), [nano, stageOneMissed])
  const needManualTick = nano?.state === 'manual'
  const needReviewTick = review.length > 0 && !running
  const canApprove =
    !running && nano !== null && preview.trim() !== '' && (!needManualTick || tickManual) && (!needReviewTick || tickReview)
  // Approval only counts while it still matches the right-hand text and every tick is still ticked.
  const isApproved = approved !== null && approved === preview && canApprove

  // Step A on the edited text (bracketed items that are not hidden items, a missing patient name) and step B (every
  // fact in the letter must be in the ORIGINAL note). Reruns on every edit, after a short pause.
  useEffect(() => {
    if (letterText === null) return
    const map = mapRef.current
    const timer = setTimeout(() => {
      const a = map ? restoreLetter(letterText, map).warnings.filter((w) => w.kind !== 'patient-missing') : []
      const patient = map?.entries().find((e) => e.type === 'PATIENT')
      if (patient && !letterText.toLowerCase().includes(patient.value.toLowerCase())) {
        a.push({ level: 'amber', kind: 'patient-missing', message: 'Patient name is missing.', text: '', index: 0 })
      }
      setTokenWarnings(a)
      setFactWarnings(checkFacts(letterText, note, pack.facts === 'dental' ? factLists : genericFactLists, {
          skipLines: skipLinesOf(pack),
          teeth: pack.facts === 'dental',
        }))
    }, FACT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [letterText, note, pack])

  const warnings = useMemo(() => [...tokenWarnings, ...factWarnings], [tokenWarnings, factWarnings])
  const warnKey = warnings.map((w) => `${w.kind}:${w.index}:${w.text}`).join('|')
  const redNow = hasRed(warnings)
  const acked = ackKey === warnKey && warnKey !== ''
  const canCopy = letterText !== null && letterText.trim() !== '' && (!redNow || acked)

  async function copyLetter() {
    if (!canCopy || letterText === null) return
    try {
      await navigator.clipboard.writeText(letterText) // the plain letter only, never the map
      setCopied(true)
    } catch {
      setHint('Copy did not work. Select the letter text and copy it by hand.')
    }
  }

  const segments = useMemo(() => segmentPreview(preview, { safe: safeWords, allowed: unhidden }), [preview, unhidden])
  const missedCount = segments.filter((s) => s.kind === 'amber').length

  function onNoteChange(value: string) {
    setNote(value)
  }

  function approve() {
    if (!canApprove) return
    setEdited(false)
    setApproved(preview)
    if (pack.items === 'teeth') void runTeeth(preview)
  }

  /** Changing the profession clears everything: note, hidden words, map, approval, letter. */
  function changePack(id: string) {
    const next = getPack(id)
    if (next.id === pack.id) return
    setNote('')
    setManualHides([])
    setUnhidden([])
    setPack(next)
  }

  // T9: tooth lines run only after Approve, on the frozen approved string, never while the dentist types
  // (SECURITY A3). listTeeth sends each attempt through guardedSend; Nano first, the cloud if Nano is not there.
  async function runTeeth(frozen: string) {
    if (!mapRef.current) return
    const runId = runCounter.current
    toothCtrl.current?.abort()
    const ctrl = new AbortController()
    toothCtrl.current = ctrl
    setTeeth(null)
    setListingTeeth(true)
    const result = await listTeeth(frozen, mapRef.current, toothModelFn, {
      signal: ctrl.signal,
      guard: { allowed: unhidden, safeWords: guardSafeWords, protect: rulesForPack(pack).protect },
    })
    if (runCounter.current !== runId || ctrl.signal.aborted) return // edited meanwhile: stale
    setListingTeeth(false)
    if (result.ok || result.failure !== 'aborted') setTeeth(result)
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
      letterText: pack.letter,
      guard: { allowed: unhidden, safeWords: guardSafeWords, protect: rulesForPack(pack).protect },
    })
    if (runCounter.current !== runId) return // the dentist edited meanwhile: this result is stale
    setSending(false)
    if (result.ok) {
      setLetter({ letter: result.letter, notRecorded: result.notRecorded })
      // Put the names back here, in the browser. The map never leaves this ref.
      const restored = restoreLetter(result.letter, mapRef.current)
      setLetterText(restored.text)
    }
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
  else if (copied) status = 'Copied. Paste it into your letter.'
  else if (letter) status = 'Letter ready. Names are put back. Read it, edit it, then copy.'
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
        <label className="pack-pick">
          Profession{' '}
          <select value={pack.id} onChange={(e) => changePack(e.target.value)} data-testid="pack">
            {Object.values(PACKS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="banner">Synthetic data only: not for real patients</p>
      </header>

      <div className="panes">
        <section className="pane">
          <label htmlFor="note">{pack.noteLabel}</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={pack.placeholder}
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
            <>
              <textarea
                className="preview letter"
                data-testid="letter"
                aria-labelledby="cloud-label"
                value={letterText ?? ''}
                onChange={(e) => {
                  setLetterText(e.target.value)
                  setCopied(false)
                }}
                spellCheck={false}
                autoComplete="off"
              />
              {letter.notRecorded.length > 0 && (
                <p className="small grey" data-testid="not-recorded">
                  Not recorded in your note: {letter.notRecorded.join(', ')}
                </p>
              )}
              {warnings.length > 0 && (
                <ul className="warnings" data-testid="warnings">
                  {warnings.map((w, i) => (
                    <li key={i} className={w.level}>
                      {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </>
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

      {(listingTeeth || teeth) && (
        <section className="teeth" data-testid="teeth" aria-live="polite">
          <div className="pane-head">
            <span className="pane-label">Teeth in this note</span>
            {teeth?.ok && (
              <span className={`badge ${teeth.source}`} data-testid="tooth-badge">
                {BADGE_TEXT[teeth.source]}
              </span>
            )}
            {listingTeeth && <span className="spinner" role="status" aria-label="Listing teeth" />}
          </div>
          {listingTeeth && <p className="small">Listing teeth from the approved text…</p>}
          {teeth && !teeth.ok && <p className="small">{teeth.message}</p>}
          {teeth?.ok && (
            <>
              {teeth.teeth.length === 0 && teeth.unnumbered.length === 0 && (
                <p className="small">No tooth number found in the note.</p>
              )}
              {teeth.teeth.length > 0 && (
                <ul className="tooth-list">
                  {teeth.teeth.map((t) => (
                    <li key={t.tooth}>
                      <strong>{t.tooth}</strong> {t.finding}
                    </li>
                  ))}
                </ul>
              )}
              {teeth.unnumbered.length > 0 && (
                <p className="small">No tooth number given: {teeth.unnumbered.join('; ')}</p>
              )}
              {teeth.source === 'rules' && <p className="small grey">{RULES_ONLY_MESSAGE}</p>}
            </>
          )}
        </section>
      )}

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
          {showingLetter && redNow && (
            <label className="tick">
              <input type="checkbox" checked={acked} onChange={(e) => setAckKey(e.target.checked ? warnKey : '')} /> I have checked
              each warning
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
          {showingLetter && (
            <>
              <button type="button" onClick={copyLetter} disabled={!canCopy} data-testid="copy">
                {copied ? 'Copied' : 'Copy letter'}
              </button>
            </>
          )}
          <button type="button" onClick={send} disabled={!isApproved || sending || letter !== null} data-testid="send">
            {problem && !problem.blocked ? 'Try again' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
