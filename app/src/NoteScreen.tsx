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
  clearQueue,
  DEFAULT_PACK,
  DEFAULT_REMOTE,
  getPack,
  PACKS,
  type Pack,
  draftLetter,
  droppedNotice,
  escapeRegex,
  enqueue,
  hasRed,
  itemsToReview,
  listTeeth,
  RULES_ONLY_MESSAGE,
  type ToothResult,
  MANUAL_TICK,
  nanoRedact,
  ORPHAN_NOTE,
  manualKind,
  messageFor,
  type NanoState,
  STATUS,
  readQueued,
  deriveIdFormat,
  isProblem,
  isNewNote,
  redactFirst,
  termsToHideItems,
  termsToRules,
  validateIdFormat,
  validateTerm,
  type SavedTerm,
  rulesForPack,
  restoreLetter,
  type Warning,
  segmentPreview,
  sendQueued,
  type QueuedItem,
  unhideTokens,
  type HideItem,
  type NanoResult,
  type ParsedLetter,
  type RemoteValues,
  withRemoteTemplate,
  TokenMap,
} from './core'
import { ai } from './firebase'
import { createLetterModelFn } from './letterAdapter'
import { createNanoModelFn, nanoAvailability } from './nanoAdapter'
import MyTermsPanel from './MyTermsPanel'
import { createTermsStore } from './myTermsStore'
import { createQueueStore } from './queueStore'
import { loadRemoteValues } from './remoteConfig'
import { createToothModelFn } from './toothAdapter'

const lists = { drugs, clinicalTerms: terms }
const termSet = buildTermSet(lists)
/** Words that are never "a possible missed name": clinical words, drug names and the shorthand list. */
const safeWords = new Set([...termSet, ...Object.keys(shorthand).map((k) => k.toLowerCase())])
const guardSafeWords = [...termSet]
const modelFn = createNanoModelFn(ai)
/** T10: the offline queue. Holds the approved anonymous text and the profession id only (core/queue.ts). */
const queueStore = createQueueStore()
/** T16: remembered places, labs and ID formats. On this device only; never a name (core/myTerms.ts). */
const termsStore = createTermsStore(termSet)
const BADGE_TEXT = { 'on-device': 'On-device', cloud: 'Cloud', rules: 'Rules only' } as const
const NANO_DELAY_MS = 600
/** How often a queued letter is tried again while the page is open (T10 follow-up, 20 Nov). */
const RETRY_MS = 10_000
const FACT_DELAY_MS = 300
const factLists = { drugs, treatments: terms.treatments, findings: terms.findings, shorthand }
/** Professions without teeth check only numbers, dates and the generic word lists (P2). */
const genericFactLists = { drugs: [], treatments: [], findings: [], shorthand: {} }
/** Template heading lines are not fact-checked; the model may add a colon to them. */
const skipLinesOf = (pack: Pack) => pack.letter.template.flatMap((l) => [l, `${l}:`])
const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

export default function NoteScreen() {
  // P1: the profession pack changes words only (packs.ts). Every lock stays the same.
  const [basePack, setBasePack] = useState<Pack>(DEFAULT_PACK)
  // T11: Remote Config can change the section list and the cloud model name, nothing else (core/remoteValues.ts).
  // The app starts on the compiled-in defaults and never waits for the network.
  const [remote, setRemote] = useState<RemoteValues>(DEFAULT_REMOTE)
  const pack = useMemo(() => withRemoteTemplate(basePack, remote), [basePack, remote])
  const letterModelFn = useMemo(() => createLetterModelFn(ai, remote.model), [remote.model])
  const toothModelFn = useMemo(() => createToothModelFn(ai, remote.model), [remote.model])
  const [note, setNote] = useState('')
  const [manualHides, setManualHides] = useState<string[]>([])
  const [unhidden, setUnhidden] = useState<string[]>([])
  // T16: "My terms". The list is read once from this device; the prompt after a hand hide is cleared by any edit.
  const [savedTerms, setSavedTerms] = useState<SavedTerm[]>([])
  const [remember, setRemember] = useState<string | null>(null)
  const [rememberMsg, setRememberMsg] = useState('')
  const [showTerms, setShowTerms] = useState(false)
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
  const [nanoState, setNanoState] = useState<NanoState>('unavailable')
  const [packChanged, setPackChanged] = useState(false)
  // T10: this page queued the letter (offline), or a letter queued on an earlier visit is waiting (orphan: no names any more).
  const [queued, setQueued] = useState(false)
  const [orphan, setOrphan] = useState<QueuedItem | null>(null)
  const [orphanBusy, setOrphanBusy] = useState(false)
  const [orphanMsg, setOrphanMsg] = useState('')
  const [orphanLetter, setOrphanLetter] = useState<ParsedLetter | null>(null)

  const mapRef = useRef<TokenMap | null>(null)
  const runCounter = useRef(0)
  const approvedRef = useRef<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const sendCtrl = useRef<AbortController | null>(null)
  const toothCtrl = useRef<AbortController | null>(null)
  const queuedRef = useRef(false)
  const orphanBusyRef = useRef(false)
  const deliveringRef = useRef(false)
  const deliverRef = useRef<(retry?: boolean) => Promise<void>>(async () => {})
  const orphanRef = useRef<QueuedItem | null>(null)

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
    // Any edit clears approval, so it clears the queued copy too (SECURITY A2). A queue left by an earlier visit is not touched here.
    if (queuedRef.current) {
      queuedRef.current = false
      void clearQueue(queueStore)
    }
    setQueued(false)
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
    const first = redactFirst(note, manualHides, termsToRules(savedTerms, rulesForPack(basePack)), termsToHideItems(savedTerms))
    mapRef.current = first.map
    setPreview(unhideTokens(first.text, first.map, unhidden))
    setStageOneMissed(first.notFound)
    setRunning(true)

    // Stage two: Gemini Nano on the device, after a short pause so typing does not flood it (SECURITY D2).
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      const result = await nanoRedact(first.text, first.map, modelFn, lists, { signal: ctrl.signal, noteKind: basePack.nanoNoteKind })
      if (runCounter.current !== runId || result.aborted) return
      setNano(result)
      setPreview(unhideTokens(result.text, first.map, unhidden))
      setRunning(false)
    }, NANO_DELAY_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [note, manualHides, unhidden, basePack, savedTerms])

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
    setPackChanged(false)
    setRemember(null)
    setRememberMsg('')
    // A new note (box emptied or all text replaced) starts clean: no hand hides, no un-hides from the last note.
    if (isNewNote(note, value)) {
      setManualHides([])
      setUnhidden([])
    }
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
    if (next.id === basePack.id) return
    setNote('')
    setManualHides([])
    setUnhidden([])
    setPackChanged(true)
    setBasePack(next)
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

  const guardNow = () => ({ allowed: unhidden, safeWords: guardSafeWords, protect: rulesForPack(pack).protect })

  /** Offline (or the network failed): keep the approved anonymous text for later. It goes through the send guard first (SECURITY A6). */
  async function queueNow() {
    if (approved === null || !mapRef.current) return
    const r = await enqueue(queueStore, approved, pack.id, mapRef.current, guardNow())
    if (r.ok) {
      queuedRef.current = true
      setQueued(true)
      setProblem(null)
    } else {
      setProblem({ message: r.message, hit: r.hit, blocked: r.reason === 'blocked' })
    }
  }

  async function send() {
    if (!isApproved || approved === null || !mapRef.current || sending || letter || queued) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await queueNow()
      return
    }
    await deliver()
  }

  // The one door: draftLetter sends every attempt through guardedSend with the frozen string, never the live text.
  // `retry` is a quiet attempt for a letter that is already queued: no "Writing the letter" flicker, and the item stays
  // queued while the network is still down.
  async function deliver(retry = false) {
    if (approved === null || !mapRef.current || sending || letter || deliveringRef.current) return
    const wasQueued = queuedRef.current
    const quiet = retry && wasQueued
    const runId = runCounter.current
    const ctrl = new AbortController()
    sendCtrl.current = ctrl
    deliveringRef.current = true
    if (!quiet) {
      setSending(true)
      setProblem(null)
    }
    try {
      const result = await draftLetter(approved, mapRef.current, letterModelFn, { signal: ctrl.signal, letterText: pack.letter, guard: guardNow() })
      if (runCounter.current !== runId) return // the dentist edited meanwhile: this result is stale
      if (!quiet) setSending(false)
      if (result.ok) {
        if (wasQueued) {
          queuedRef.current = false
          setQueued(false)
          void clearQueue(queueStore)
        }
        setLetter({ letter: result.letter, notRecorded: result.notRecorded })
        // Put the names back here, in the browser. The map never leaves this ref.
        const restored = restoreLetter(result.letter, mapRef.current)
        setLetterText(restored.text)
        return
      }
      if (result.failure === 'aborted') return
      if (result.failure === 'offline') {
        // Still no connection: keep it for later (a queued item simply stays queued and is tried again).
        if (!wasQueued) await queueNow()
        return
      }
      if (wasQueued) {
        // A queued letter that now fails for another reason (blocked by the guard, quota, a bad reply) stops waiting: it must
        // not be retried forever, and a text that fails the guard must never be sent. The dentist sees why and can try again.
        queuedRef.current = false
        setQueued(false)
        void clearQueue(queueStore)
      }
      setProblem({ message: result.message, hit: result.hit, blocked: result.failure === 'blocked' })
    } finally {
      deliveringRef.current = false
    }
  }

  useEffect(() => {
    if (nano?.state !== 'manual') return
    let alive = true
    void nanoAvailability().then((s) => {
      if (alive) setNanoState(s)
    })
    return () => {
      alive = false
    }
  }, [nano])

  useEffect(() => {
    let alive = true
    void loadRemoteValues().then((values) => {
      if (alive) setRemote(values)
    })
    return () => {
      alive = false
    }
  }, [])

  // The "online" event sends a queued letter by itself; the ref always holds the newest deliver().
  useEffect(() => {
    deliverRef.current = deliver
  })
  useEffect(() => {
    const onOnline = () => {
      if (queuedRef.current) void deliverRef.current(true)
      if (orphanRef.current) void runOrphan(orphanRef.current)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Some networks never say they are back (a laptop with a virtual adapter keeps "online" true with Wi-Fi off, so the "online"
  // event never fires). While a letter is queued, try again every 10 seconds, quietly. One attempt at a time.
  useEffect(() => {
    if (!queued) return
    const id = setInterval(() => void deliverRef.current(true), RETRY_MS)
    return () => clearInterval(id)
  }, [queued])
  useEffect(() => {
    if (!orphan) return
    const id = setInterval(() => {
      if (orphanRef.current && !orphanBusyRef.current) void runOrphan(orphanRef.current)
    }, RETRY_MS * 2)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orphan])

  // A letter queued on an earlier visit. The names are gone (the map is never stored), so it is sent as labels (ORPHAN_NOTE).
  async function runOrphan(item: QueuedItem) {
    if (orphanBusyRef.current) return
    orphanBusyRef.current = true
    setOrphanBusy(true)
    setOrphanMsg('')
    const res = await sendQueued(queueStore, item, new TokenMap(), letterModelFn, {
      guard: { safeWords: guardSafeWords, protect: rulesForPack(getPack(item.packId)).protect },
    })
    orphanBusyRef.current = false
    setOrphanBusy(false)
    if (res.ok) {
      orphanRef.current = null
      setOrphan(null)
      setOrphanLetter({ letter: res.letter, notRecorded: res.notRecorded })
    } else if (res.failure === 'blocked') {
      orphanRef.current = null
      setOrphan(null)
      setOrphanMsg(res.message)
    } else if (res.failure !== 'aborted') {
      setOrphanMsg(res.message)
    }
  }

  function discardOrphan() {
    orphanRef.current = null
    setOrphan(null)
    setOrphanMsg('')
    void clearQueue(queueStore)
  }

  useEffect(() => {
    let alive = true
    void readQueued(queueStore).then((item) => {
      if (!alive || !item || queuedRef.current) return
      orphanRef.current = item
      setOrphan(item)
      if (typeof navigator === 'undefined' || navigator.onLine !== false) void runOrphan(item)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setRemember(text.length <= 60 ? text : null)
    setRememberMsg('')
  }

  // ---- T16 My terms ----
  useEffect(() => {
    let alive = true
    void termsStore.list().then((t) => alive && setSavedTerms(t))
    return () => {
      alive = false
    }
  }, [])

  async function saveTerm(kind: 'place' | 'org' | 'idFormat') {
    if (remember === null) return
    const v =
      kind === 'idFormat'
        ? validateIdFormat(remember, termSet, rulesForPack(basePack).notIdPrefixes, savedTerms)
        : validateTerm({ kind, text: remember }, termSet, savedTerms)
    if (isProblem(v)) {
      setRememberMsg(v.message)
      return
    }
    await termsStore.add(v)
    setSavedTerms(await termsStore.list())
    // The words are already hidden by hand in this note; the saved term takes over from the next note on.
    setRemember(null)
    setRememberMsg('Remembered on this device.')
  }
  async function removeTerm(t: SavedTerm) {
    await termsStore.remove(t)
    setSavedTerms(await termsStore.list())
  }
  async function forgetAll() {
    await termsStore.clear()
    setSavedTerms([])
  }
  const savedKeys = useMemo(() => new Set(termsToHideItems(savedTerms).map((i) => fold(i.text))), [savedTerms])
  const hiddenByTerms = (token: string) => (mapRef.current?.get(token)?.variants ?? []).some((v) => savedKeys.has(fold(v)))

  // ---- the status line: one text per state (FINISH.md "States"), all from core/messages.ts ----
  const empty = !note.trim()
  let status: string = STATUS.ready
  let tone: 'neutral' | 'working' | 'ok' | 'error' | 'queued' = 'neutral'
  if (empty) status = packChanged ? STATUS['profession-changed'] : STATUS.empty
  else if (running) [status, tone] = [STATUS.redacting, 'working']
  else if (sending) [status, tone] = [STATUS.sending, 'working']
  else if (queued) [status, tone] = [messageFor('offline'), 'queued']
  else if (copied) [status, tone] = [STATUS.copied, 'ok']
  else if (letter) [status, tone] = [STATUS.letter, 'ok']
  else if (problem) [status, tone] = [problem.message, 'error']
  else if (isApproved) [status, tone] = [STATUS.approved, 'ok']
  else if (edited) status = STATUS.edited
  else if (needManualTick) status = messageFor(manualKind(nanoState))
  else if (needReviewTick) status = STATUS['items-not-placed']

  const showingLetter = letter !== null && !showNote
  // The word the send guard stopped is marked in the right-hand text ("check the highlighted words"). On screen only.
  const hitPattern = problem?.blocked && problem.hit ? new RegExp(`(${escapeRegex(problem.hit)})`, 'giu') : null
  const withHit = (text: string, key: number) =>
    hitPattern
      ? text.split(hitPattern).map((part, j) =>
          j % 2 === 1 ? (
            <mark key={`${key}-${j}`} className="amber hit" data-testid="hit-mark">
              {part}
            </mark>
          ) : (
            <span key={`${key}-${j}`}>{part}</span>
          ),
        )
      : text
  // 1 Note, 2 Check, 3 Letter
  const step = letter || queued || sending ? 3 : empty ? 1 : 2
  const stepClass = (n: number) => (n < step || (n === 2 && isApproved && step === 2) ? 'done' : n === step ? 'now' : '')
  const noNano = typeof (globalThis as { LanguageModel?: unknown }).LanguageModel === 'undefined'

  return (
    <div className="app" role="main">
      <header className="top">
        <div className="brand">
          <h1>SafeRefer</h1>
          <p className="tagline">Hide the names here. Only the hidden text goes to the cloud.</p>
        </div>
        <label className="pack-pick">
          <span>Profession</span>
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

      <ol className="steps" aria-label="Progress">
        {['Note', 'Check', 'Letter'].map((name, i) => (
          <li key={name} className={stepClass(i + 1)} aria-current={step === i + 1 ? 'step' : undefined}>
            <span className="step-n" aria-hidden="true">
              {stepClass(i + 1) === 'done' ? '✓' : i + 1}
            </span>
            {name}
          </li>
        ))}
      </ol>

      {(orphan || orphanLetter) && (
        <section className="card orphan" data-testid="orphan" aria-live="polite">
          <div className="card-head">
            <span className="pane-label">A letter from your last visit</span>
            {orphanBusy && <span className="spinner" role="status" aria-label="Sending" />}
          </div>
          {orphan && (
            <>
              <p className="small">
                A letter ({getPack(orphan.packId).label}) was queued while you were offline. It is sent by itself when you are online.
              </p>
              {orphanMsg && <p className="small">{orphanMsg}</p>}
              <div className="pane-tools">
                <button type="button" className="secondary" onClick={() => void runOrphan(orphan)} disabled={orphanBusy}>
                  Send now
                </button>
                <button type="button" className="secondary" onClick={discardOrphan} disabled={orphanBusy}>
                  Discard
                </button>
              </div>
            </>
          )}
          {orphanLetter && (
            <>
              <textarea className="preview letter orphan-letter" data-testid="orphan-letter" value={orphanLetter.letter} readOnly spellCheck={false} />
              <p className="small">{ORPHAN_NOTE}</p>
              <div className="pane-tools">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void navigator.clipboard.writeText(orphanLetter.letter).catch(() => undefined)}
                >
                  Copy letter
                </button>
                <button type="button" className="secondary" onClick={() => setOrphanLetter(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <div className="panes">
        <section className="pane pane-note">
          <div className="pane-head">
            <label htmlFor="note" className="pane-label">
              {pack.noteLabel}
            </label>
          </div>
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

        <section className="pane pane-cloud">
          <div className="pane-head">
            <span className="pane-label" id="cloud-label">
              {showingLetter ? 'Letter (written by the cloud model)' : 'What the cloud will see'}
            </span>
            {showingLetter && <span className="badge cloud">Cloud</span>}
            {(running || sending) && <span className="spinner" role="status" aria-label="Working" />}
            {letter && (
              <button type="button" className="secondary push" onClick={() => setShowNote((v) => !v)}>
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
                      <span className="warn-mark" aria-hidden="true">
                        {w.level === 'red' ? '!' : '?'}
                      </span>
                      {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <div ref={previewRef} className="preview" aria-labelledby="cloud-label" data-testid="preview" spellCheck={false}>
                {empty ? (
                  <div className="how">
                    <p className="how-title">How it works</p>
                    <ol>
                      <li>
                        Names, phones, dates and IDs are hidden <b>here, in your browser</b> and become labels such as{' '}
                        <span className="chip-static">[PATIENT]</span>.
                      </li>
                      <li>
                        <b>Only this hidden text</b> goes to the cloud, which drafts the letter.
                      </li>
                      <li>The letter comes back and your names are put back <b>here</b>.</li>
                    </ol>
                    {noNano && (
                      <p className="how-note">
                        This browser has no on-device model, so you hide names by hand: select the words here and press{' '}
                        <b>Hide selected words</b>.
                      </p>
                    )}
                  </div>
                ) : (
                  segments.map((s, i) =>
                    s.kind === 'token' ? (
                      <button key={i} type="button" className="chip" title={hiddenByTerms(s.text) ? 'Hidden by My terms. Click to show this text again (this note only)' : 'Click to show this text again'} onClick={() => unhide(s.text)}>
                        {s.text}
                      </button>
                    ) : s.kind === 'amber' ? (
                      <mark key={i} className="amber" title="Check this: is it a name?">
                        {withHit(s.text, i)}
                      </mark>
                    ) : (
                      <span key={i}>{withHit(s.text, i)}</span>
                    ),
                  )
                )}
              </div>
              <div className="pane-tools">
                <button type="button" className="secondary" onMouseDown={(e) => e.preventDefault()} onClick={hideSelection} disabled={empty}>
                  Hide selected words
                </button>
                <span className="small">Click a label to show its text again.</span>
                {missedCount > 0 && (
                  <span className="check-note" role="status">
                    <span aria-hidden="true">!</span> Check this: {missedCount} underlined
                  </span>
                )}
              </div>
              {hint && <p className="small">{hint}</p>}
              {remember !== null && (
                <p className="small remember" data-testid="remember">
                  Remember &lsquo;{remember}&rsquo; for next time?{' '}
                  <button type="button" className="secondary" data-testid="remember-place" onClick={() => void saveTerm('place')}>
                    Place
                  </button>{' '}
                  <button type="button" className="secondary" data-testid="remember-org" onClick={() => void saveTerm('org')}>
                    Lab / organisation
                  </button>{' '}
                  {deriveIdFormat(remember, termSet, rulesForPack(basePack).notIdPrefixes) && (
                    <>
                      <button type="button" className="secondary" data-testid="remember-id" onClick={() => void saveTerm('idFormat')}>
                        ID format
                      </button>{' '}
                    </>
                  )}
                  <button type="button" className="secondary" onClick={() => setRemember(null)}>
                    No
                  </button>
                  <br />
                  Never save a patient&rsquo;s name. Saved on this device only.
                </p>
              )}
              {rememberMsg && (
                <p className="small" role="status" data-testid="remember-msg">
                  {rememberMsg}
                </p>
              )}
              <p className="small">
                <button type="button" className="link" data-testid="my-terms-link" onClick={() => setShowTerms((v) => !v)}>
                  My terms ({savedTerms.length})
                </button>
              </p>
              {showTerms && <MyTermsPanel terms={savedTerms} onRemove={(t) => void removeTerm(t)} onClear={() => void forgetAll()} />}
            </>
          )}

          {(listingTeeth || teeth?.ok) && (
            <section className="card teeth" data-testid="teeth" aria-live="polite">
              <div className="card-head">
                <span className="pane-label">Teeth in this note</span>
                {teeth?.ok && (
                  <span className={`badge ${teeth.source}`} data-testid="tooth-badge">
                    {BADGE_TEXT[teeth.source]}
                  </span>
                )}
                {listingTeeth && <span className="spinner" role="status" aria-label="Listing teeth" />}
              </div>
              {listingTeeth && <p className="small">Listing teeth from the approved text…</p>}
              {teeth?.ok && (
                <>
                  {teeth.teeth.length === 0 && teeth.unnumbered.length === 0 && <p className="small">No tooth number found in the note.</p>}
                  {teeth.teeth.length > 0 && (
                    <ul className="tooth-list">
                      {teeth.teeth.map((t) => (
                        <li key={t.tooth}>
                          <strong>{t.tooth}</strong> {t.finding}
                        </li>
                      ))}
                    </ul>
                  )}
                  {teeth.unnumbered.length > 0 && <p className="small">No tooth number given: {teeth.unnumbered.join('; ')}</p>}
                  {teeth.source === 'rules' && <p className="small grey">{RULES_ONLY_MESSAGE}</p>}
                </>
              )}
            </section>
          )}
        </section>
      </div>

      <div className="dock">
        <div className="dock-info">
          <p className={`status ${tone}`} aria-live="polite" data-testid="status">
            <span className="status-icon" aria-hidden="true" />
            <span>
              {status}
              {problem?.blocked && problem.hit && (
                <>
                  {' '}
                  Check: <strong data-testid="blocked-hit">{problem.hit}</strong>
                </>
              )}
            </span>
          </p>
          {!running && review.length > 0 && (
            <p className="small review" data-testid="review">
              {droppedNotice(review.length)} {review.map((i) => i.text).join(', ')}
            </p>
          )}
          <div className="ticks">
            {needManualTick && (
              <label className="tick">
                <input type="checkbox" checked={tickManual} onChange={(e) => setTickManual(e.target.checked)} /> {MANUAL_TICK}
              </label>
            )}
            {showingLetter && redNow && (
              <label className="tick">
                <input type="checkbox" checked={acked} onChange={(e) => setAckKey(e.target.checked ? warnKey : '')} /> I have checked each
                warning
              </label>
            )}
            {needReviewTick && (
              <label className="tick">
                <input type="checkbox" checked={tickReview} onChange={(e) => setTickReview(e.target.checked)} /> I checked the items listed above
              </label>
            )}
          </div>
        </div>
        <div className="buttons">
          <button type="button" className={isApproved ? 'done' : 'primary'} onClick={approve} disabled={!canApprove || isApproved}>
            {isApproved ? '✓ Approved' : 'Approve'}
          </button>
          {showingLetter && (
            <button type="button" className="primary" onClick={copyLetter} disabled={!canCopy} data-testid="copy">
              {copied ? 'Copied' : 'Copy letter'}
            </button>
          )}
          <button
            type="button"
            className={isApproved && !letter && !queued ? 'primary' : ''}
            onClick={send}
            disabled={!isApproved || sending || letter !== null || queued}
            data-testid="send"
          >
            {queued ? 'Queued' : problem && !problem.blocked ? 'Try again' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
