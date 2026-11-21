// T8 leak-test page (open /?leak in development). Runs the 30 synthetic notes through the same
// redaction path as the screen and scores what is still in the text that would be sent.
// A bad score is shown, not hidden. Nothing is stored, logged or sent: redaction never calls the cloud.
import { useState } from 'react'
import terms from '../../data/clinical-terms.json'
import drugs from '../../data/drugs.json'
import notesJson from '../../data/notes.json'
import caNotesJson from '../../data/packs/ca-notes.json'
import lawNotesJson from '../../data/packs/law-notes.json'
import freshDentalJson from '../../data/fresh/dental-fresh.json'
import freshCaJson from '../../data/fresh/ca-fresh.json'
import freshLawJson from '../../data/fresh/law-fresh.json'
import tuneDentalJson from '../../data/harness/tune-dental.json'
import tuneCaJson from '../../data/harness/tune-ca.json'
import tuneLawJson from '../../data/harness/tune-law.json'
import lockedDentalJson from '../../data/harness/locked-dental.json'
import lockedCaJson from '../../data/harness/locked-ca.json'
import lockedLawJson from '../../data/harness/locked-law.json'
import { getPack, rulesForPack, runLeakTest, sanitiseTerms, termsToHideItems, termsToRules, buildTermSet, type LeakSummary, type PackId, type TestNote } from './core'
import { ai } from './firebase'
import { checkNoModel, makeRedact, withFetchCount, type NoModelCheck } from './leakRun'
import { createNanoModelFn, nanoIsReady } from './nanoAdapter'

// P1: one synthetic test set per pack. ?leak&pack=dental (dental is the default).
const NOTES_BY_PACK: Record<PackId, TestNote[]> = { dental: notesJson as TestNote[], ca: caNotesJson as TestNote[], law: lawNotesJson as TestNote[] }
// Fresh notes: written by Dr. Yatin, never seen by the builder, no rule tuned on them. Open /?leak&pack=dental&set=fresh.
// Only the sets that exist are listed; the page says so if a profession has none yet.
const FRESH_BY_PACK: Partial<Record<PackId, TestNote[]>> = { dental: freshDentalJson as TestNote[], ca: freshCaJson as TestNote[], law: freshLawJson as TestNote[] }
const params = new URLSearchParams(window.location.search)
const pack = getPack(params.get('pack'))
// Harness sets (HARNESS_PLAN.md): ?leak&pack=dental&set=tune (200 notes) or set=locked (100 notes, sealed; no tuning on its misses).
const HARNESS: Record<string, Record<PackId, TestNote[]>> = {
  tune: { dental: tuneDentalJson as TestNote[], ca: tuneCaJson as TestNote[], law: tuneLawJson as TestNote[] },
  locked: { dental: lockedDentalJson as TestNote[], ca: lockedCaJson as TestNote[], law: lockedLawJson as TestNote[] },
}
// Hand-written locked set (data/harness/hand/hand-<pack>.json, made by harness/build-hand.ts): counts only, like locked.
const handFiles = import.meta.glob('../../data/harness/hand/hand-*.json', { eager: true, import: 'default' }) as Record<string, TestNote[]>
const HAND: Partial<Record<PackId, TestNote[]>> = {
  dental: handFiles['../../data/harness/hand/hand-dental.json'],
  ca: handFiles['../../data/harness/hand/hand-ca.json'],
  law: handFiles['../../data/harness/hand/hand-law.json'],
}
// set=hand is batch 1, set=hand2 batch 2 (hand-<pack>-2.json, written for the T16 My terms test). Both counts only.
const handBatch = params.get('set') === 'hand' ? '' : params.get('set') === 'hand2' ? '-2' : null
const wantHand = handBatch !== null
const harnessSet = params.get('set') === 'tune' || params.get('set') === 'locked' ? (params.get('set') as 'tune' | 'locked') : null
const wantFresh = params.get('set') === 'fresh'
const freshNotes = FRESH_BY_PACK[pack.id]
const handNotes = handBatch === '-2' ? handFiles[`../../data/harness/hand/hand-${pack.id}-2.json`] : HAND[pack.id]
const notes = wantHand && handNotes ? handNotes : harnessSet ? HARNESS[harnessSet][pack.id] : wantFresh && freshNotes ? freshNotes : NOTES_BY_PACK[pack.id]
const noteSetName = wantHand && handNotes ? `hand-written notes${handBatch === '-2' ? ', batch 2' : ''} (Dr. Yatin, 10 per profession, small set)` : harnessSet ? `harness ${harnessSet} notes (generated)` : wantFresh && freshNotes ? 'fresh notes' : 'builder notes'
const lists = { drugs, clinicalTerms: terms }
// T16 (development only): ?terms=<name> loads data/harness/terms/<name>.json, a synthetic "My terms" list, and runs the same
// path with it. Off by default, so every existing number and the H4 gate are unchanged.
const termFiles = import.meta.glob('../../data/harness/terms/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const termsName = params.get('terms')
const termsRaw = termsName ? termFiles[`../../data/harness/terms/${termsName.replace(/[^a-z0-9-]/gi, '')}.json`] : undefined
const savedTerms = termsName ? sanitiseTerms(termsRaw, buildTermSet(lists)) : []
const rules = termsName ? termsToRules(savedTerms, rulesForPack(pack)) : rulesForPack(pack)
const savedItems = termsToHideItems(savedTerms)
const modelFn = createNanoModelFn(ai)

interface Report {
  summary: LeakSummary
  failedNotes: string[]
  mode: 'nano' | 'code-only'
  fetches: number
  appCheck: number
  noModel: NoModelCheck
}

export default function LeakTest() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setRunning(true)
    setError('')
    setReport(null)
    try {
      const ready = await nanoIsReady()
      const { redact, fallback } = makeRedact(ready ? modelFn : null, lists, pack.nanoNoteKind, rules, savedItems)
      // Pass 1: the full run, counting every fetch. Redaction must make none.
      const { value, fetches, appCheck } = await withFetchCount(() =>
        runLeakTest(notes, redact, fallback, (done, total) => setProgress(`Note ${done} of ${total}`)),
      )
      if (value.error !== null) {
        setError(value.error)
        return
      }
      // Pass 2: pretend the browser has no LanguageModel. Zero requests, and every note goes to manual mode.
      setProgress('Checking with the on-device model removed')
      const noModel = await checkNoModel(
        notes.map((n) => n.text),
        modelFn,
        lists,
        pack.nanoNoteKind,
        rules,
        savedItems,
      )
      setReport({ summary: value.summary, failedNotes: value.failedNotes, mode: ready ? 'nano' : 'code-only', fetches, appCheck, noModel })
    } catch {
      setError('The test could not finish.')
    } finally {
      setRunning(false)
      setProgress('')
    }
  }

  const s = report?.summary
  return (
    <div className="app" role="main" data-testid="leak-page">
      <header className="top">
        <h1>
          SafeRefer leak test: {pack.label} ({noteSetName}){termsName ? ` with My terms: ${termsName} (${savedTerms.length} terms)` : ''}
        </h1>
        <p className="banner">Synthetic data only: the {notes.length} test notes</p>
      </header>
      <div className="leak">
        <button type="button" onClick={run} disabled={running} data-testid="run">
          {running ? 'Running…' : 'Run the test'}
        </button>
        {progress && (
          <p className="small" role="status">
            {progress}
          </p>
        )}
        {error && (
          <p className="status error" data-testid="error">
            {error}
          </p>
        )}

        {report && s && (
          <>
            <h2 data-testid="headline">{s.headline}</h2>
            <p data-testid="percent">
              {s.percent} of identifiers left in the text that would be sent. A partly left name or number counts as leaked.
            </p>
            <p className="small" data-testid="mode">
              {report.mode === 'nano'
                ? 'Mode: code redactor plus Gemini Nano on this device.'
                : 'Mode: code redactor only. Gemini Nano is not ready in this browser, so this score does not include Nano.'}
              {report.failedNotes.length > 0 &&
                ` Nano failed on ${report.failedNotes.length} note(s), scored on code only: ${report.failedNotes.join(', ')}.`}
            </p>

            <ul className="checks" data-testid="checks">
              <li className={report.fetches === 0 ? 'ok' : 'error'}>
                {report.fetches === 0 ? 'PASS' : 'FAIL'}: requests made during the whole run: {report.fetches} (must be 0); background App Check token calls, no note text, counted apart: {report.appCheck}
              </li>
              <li className={report.noModel.pass ? 'ok' : 'error'}>
                {report.noModel.pass ? 'PASS' : 'FAIL'}: with the on-device model removed, {report.noModel.fetches} requests and{' '}
                {report.noModel.manual} of {report.noModel.notes} notes went to manual mode (must be 0 and all)
              </li>
            </ul>

            <h3>By type</h3>
            <table data-testid="by-type">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Leaked</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.byType).map(([type, v]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{v.leaked}</td>
                    <td>{v.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Every miss ({s.misses.length})</h3>
            {harnessSet === 'locked' || (wantHand && handNotes) ? (
              // Sealed set: counts only. Showing the misses would let anyone (or a screenshot) tune the rules on them.
              <p data-testid="locked-note">Locked set: the misses are not shown. Report the totals and the table above only.</p>
            ) : s.misses.length === 0 ? (
              <p>No misses.</p>
            ) : (
              <table data-testid="misses">
                <thead>
                  <tr>
                    <th>Note</th>
                    <th>Type</th>
                    <th>How</th>
                    <th>Left in the text</th>
                  </tr>
                </thead>
                <tbody>
                  {s.misses.map((m, i) => (
                    <tr key={i}>
                      <td>{m.noteId}</td>
                      <td>{m.type}</td>
                      <td>{m.kind}</td>
                      <td>
                        <code>{m.context}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
