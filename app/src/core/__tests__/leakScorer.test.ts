import { describe, expect, it } from 'vitest'
import notesJson from '../../../../data/notes.json'
import { redactByCode } from '../codeRedactor'
import { checkTestData, runLeakTest, scoreIdentifier, scoreNote, summarise, type TestNote } from '../leakScorer'

const notes = notesJson as TestNote[]
const kind = (anon: string, type: string, value: string) => scoreIdentifier(anon, { type, value }).kind

describe('T8 leak scorer: one made-up text per kind (SPECS.md bug 1)', () => {
  it('exact', () => expect(kind('Patient: Arvind Testwala.', 'name', 'Arvind Testwala')).toBe('exact'))
  it('case', () => expect(kind('Patient: ARVIND TESTWALA.', 'name', 'Arvind Testwala')).toBe('case'))
  it('split', () => {
    expect(kind('Patient: Arvind-Testwala.', 'name', 'Arvind Testwala')).toBe('split')
    expect(kind('Patient: Arvind\nTestwala.', 'name', 'Arvind Testwala')).toBe('split')
    expect(kind('Ring 00000-55501.', 'phone', '00000 55501')).toBe('split')
  })
  it('partial', () => {
    expect(kind('[PATIENT] Testwala attended.', 'name', 'Arvind Testwala')).toBe('partial')
    expect(kind('Seen [DATE_1]/2026 or 03/11.', 'date', '03/11/2026')).toBe('partial')
    expect(kind('Seen 2 Nov this year.', 'date', '2 Nov 2026')).toBe('partial')
    expect(kind('Ring 00 55 501 now.', 'phone', '00000 55501')).toBe('partial')
    expect(kind('Mail suresh.dummyrao at home.', 'email', 'suresh.dummyrao@example.com')).toBe('partial')
    expect(kind('File 0006 here.', 'record_id', 'SR-0006')).toBe('partial')
    expect(kind('Lives in Testnagar.', 'address', '12 Placeholder Road, Testnagar 000008')).toBe('partial')
    expect(kind('PIN 000008.', 'address', '12 Placeholder Road, Testnagar 000008')).toBe('partial')
  })
  it('clean', () => {
    expect(kind('Patient: [PATIENT]. Phone [PHONE].', 'name', 'Arvind Testwala')).toBe('clean')
    // ordinary words and the stop list do not count
    expect(kind('Fell on the road near the school in 2026.', 'address', '12 Placeholder Road, Testnagar 000008')).toBe('clean')
    expect(kind('Seen in 2026.', 'date', '03/11/2026')).toBe('clean')
    expect(kind('Mr [PATIENT] is here.', 'name', 'Mr Dinesh Mockwani')).toBe('clean')
  })
  it('text on two sides of a token is never joined', () => {
    expect(kind('Arvind[PHONE]Testwala', 'name', 'ArvindTestwala')).toBe('clean')
  })
})

describe('T8 leak scorer: honesty checks', () => {
  it('ACCEPTANCE: with redaction skipped, every identifier of a note is reported as leaked (exact)', () => {
    for (const n of notes) {
      const results = scoreNote(n.text, n)
      expect(results.every((r) => r.kind === 'exact'), n.id).toBe(true)
    }
  })

  it('a fully hand-redacted note scores 0 (SPECS.md bug 4)', () => {
    const n = notes[0]
    const anon = 'Patient: [PATIENT]. Phone: [PHONE]. Seen on [DATE_1]. Referred for endodontic assessment of tooth 36.'
    expect(summarise(scoreNote(anon, n)).leaked).toBe(0)
  })

  it('the data check passes on the real file and fails on a broken value', () => {
    expect(checkTestData(notes)).toBeNull()
    const broken = [{ ...notes[0], identifiers: [{ type: 'name', value: 'Arvind Testwalla' }] }]
    expect(checkTestData(broken)).toBe('Test data error in note N01')
  })

  it('Y is counted from the file; a note where redaction fails stays in Y and is scored on the fallback', async () => {
    const total = notes.reduce((sum, n) => sum + n.identifiers.length, 0)
    const run = await runLeakTest(
      notes,
      () => {
        throw new Error('model failed')
      },
      (text) => text, // fallback that hides nothing: everything must count as leaked
    )
    expect(run.error).toBeNull()
    if (run.error === null) {
      expect(run.summary.total).toBe(total)
      expect(run.summary.leaked).toBe(total)
      expect(run.failedNotes).toHaveLength(notes.length)
      expect(run.summary.headline).toBe(`Identifiers leaked: ${total} of ${total}`)
      expect(run.summary.percent).toBe('100.0%')
    }
  })

  it('stops with the data error instead of scoring', async () => {
    const broken = [{ ...notes[0], identifiers: [{ type: 'name', value: 'Nobody Here' }] }]
    const run = await runLeakTest(broken, (t) => t, (t) => t)
    expect(run.error).toBe('Test data error in note N01')
  })
})

describe('code redactor only, over the 30 notes (the real score, shown not hidden)', () => {
  it('prints the score and pins it, so any change is noticed', async () => {
    const run = await runLeakTest(notes, (text) => redactByCode(text).text, (t) => t)
    expect(run.error).toBeNull()
    if (run.error !== null) return
    const s = run.summary
    const lines = [
      `${s.headline} (${s.percent})  [code redactor only, no Nano, no dentist check]`,
      `by kind: ${JSON.stringify(s.byKind)}`,
      `by type: ${Object.entries(s.byType).map(([t, v]) => `${t} ${v.leaked}/${v.total}`).join(', ')}`,
      ...s.misses.map((m) => `  ${m.noteId} ${m.type} "${m.value}" -> ${m.kind}: ...${m.context.replace(/\n/g, ' ')}...`),
    ]
    console.log(lines.join('\n'))
    expect(s.total).toBe(124)
    // 3 single nicknames (Bunty, Rose, Pinky) and 1 scorer false alarm: the verb "works" in "works at [EMPLOYER]"
    // counts as a piece of "Dummy Steel Works" under the SPECS.md rule. The rule is left as written.
    expect(s.leaked).toBe(4)
  })
})
