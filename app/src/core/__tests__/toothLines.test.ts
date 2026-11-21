import { describe, expect, it, vi } from 'vitest'
import notes from '../../../../data/notes.json'
import {
  buildToothPrompt,
  checkTeeth,
  findingIsFromNote,
  LetterCallError,
  listTeeth,
  noteToothSet,
  parseToothReply,
  redactByCode,
  rulesOnlyTeeth,
  TokenMap,
  TOOTH_SCHEMA,
  type ToothModelFn,
} from '..'

const reply = (o: unknown, source: 'on-device' | 'cloud' = 'on-device') => ({ text: JSON.stringify(o), source })

describe('T9 tooth set (code, not model)', () => {
  it('finds single teeth, lists and ranges in note order', () => {
    expect(noteToothSet('Caries 36, 37. Crowns 11-13 planned. Tooth 46 TTP.')).toEqual(['36', '37', '11', '12', '13', '46'])
  })
  it('age and sex written together ("41 M", "34 F") near the start is not a tooth', () => {
    expect(noteToothSet('[PERSON_1], 41 M, phone [PHONE]. Bridge 24-26 trial.')).toEqual(['24', '25', '26'])
    expect(noteToothSet('Ravi Demokar, 41 M, phone [PHONE]. RCT 36 done.')).toEqual(['36'])
    expect(noteToothSet('[PERSON_1], 34 F, RCT 36 done.')).toEqual(['36'])
    expect(noteToothSet('[PERSON_1], 41M, 46 tender')).toEqual(['46'])
    expect(noteToothSet('RCT 36 M surface caries, 46 tender')).toEqual(['36', '46'])
  })
  it('ACCEPTANCE: "36 years" is not a tooth; ages, doses and durations are left out', () => {
    expect(noteToothSet('A 36 years old lady with pain in 46.')).toEqual(['46'])
    expect(noteToothSet('36-year-old male, 46 tender.')).toEqual(['46'])
    expect(noteToothSet('Pain for 24 hours, amoxicillin 25 mg, 12 days. 21 fractured.')).toEqual(['21'])
    expect(noteToothSet('Age: 34. Aged 36. 15% bone loss. 11 mobile.')).toEqual(['11'])
    expect(noteToothSet('[PATIENT] (36) has pain in 26.')).toEqual(['26'])
    expect(noteToothSet('[PATIENT], 27, was assaulted. Fracture of 31, 32, 41 and 42.')).toEqual(['31', '32', '41', '42'])
    expect(noteToothSet('a 44 year old teacher with a calcified canal in 11')).toEqual(['11'])
  })
  it('numbers inside decimals, times, dates and tokens are not teeth', () => {
    expect(noteToothSet('INR 2.36 at 10:36 on 3/11/26, see [DATE_12]. 47 sound.')).toEqual(['47'])
  })
  it('non-FDI numbers and cross-quadrant ranges are not teeth', () => {
    expect(noteToothSet('Probing 6 to 8 mm, pockets 19 and 90. 18-21 ignored as a range.')).toEqual(['18', '21'])
  })
  it('a tooth written as "tooth no. 36" or "t36" still counts', () => {
    expect(noteToothSet('tooth no. 36 and t46')).toEqual(['36', '46'])
  })
  it('every tooth in the 30 synthetic notes is a real FDI code', () => {
    for (const n of notes) for (const t of noteToothSet(n.text)) expect(TOOTH_SCHEMA.properties.teeth.items.properties.tooth.enum).toContain(t)
  })
})

describe('T9 reply parsing and code checks', () => {
  const NOTE = 'Deep distal caries 36, lingering pain to cold. 37 sound. Upper left first molar sensitive. Age 45.'
  it('parses a valid reply and rejects bad ones', () => {
    expect(parseToothReply(JSON.stringify({ teeth: [{ tooth: '36', finding: 'x' }], unnumbered: [] }))).not.toBeNull()
    expect(parseToothReply('not json')).toBeNull()
    expect(parseToothReply(JSON.stringify({ teeth: 'x', unnumbered: [] }))).toBeNull()
    expect(parseToothReply(JSON.stringify({ teeth: [{ tooth: 36, finding: 'x' }], unnumbered: [] }))).toBeNull()
    expect(parseToothReply(undefined)).toBeNull()
  })
  it('drops a tooth not in the note, and an age read as a tooth', () => {
    const out = checkTeeth(
      { teeth: [{ tooth: '36', finding: 'Deep distal caries' }, { tooth: '45', finding: 'Age 45' }, { tooth: '26', finding: 'caries' }], unnumbered: [] },
      NOTE,
    )
    expect(out.teeth.map((t) => t.tooth)).toEqual(['36', '37'])
  })
  it('merges duplicate teeth', () => {
    const out = checkTeeth({ teeth: [{ tooth: '36', finding: 'Deep distal caries' }, { tooth: '36', finding: 'lingering pain to cold' }, { tooth: '36', finding: 'deep distal caries' }], unnumbered: [] }, NOTE)
    expect(out.teeth[0]).toEqual({ tooth: '36', finding: 'Deep distal caries; lingering pain to cold' })
  })
  it('a finding with an added word or number is replaced by the note sentence', () => {
    expect(findingIsFromNote('irreversible pulpitis', NOTE)).toBe(false)
    expect(findingIsFromNote('caries for 3 weeks', NOTE)).toBe(false)
    expect(findingIsFromNote('[PATIENT] caries', NOTE)).toBe(false)
    const out = checkTeeth({ teeth: [{ tooth: '36', finding: 'irreversible pulpitis' }], unnumbered: [] }, NOTE)
    expect(out.teeth[0].finding).toBe('Deep distal caries 36, lingering pain to cold.')
  })
  it('a tooth the model missed is listed with its sentence', () => {
    const out = checkTeeth({ teeth: [{ tooth: '36', finding: 'Deep distal caries' }], unnumbered: [] }, NOTE)
    expect(out.teeth[1]).toEqual({ tooth: '37', finding: '37 sound.' })
  })
  it('unnumbered keeps only phrases in the note, never bracket text', () => {
    const out = checkTeeth({ teeth: [], unnumbered: ['Upper left first molar', 'UR6', '[PATIENT]'] }, NOTE)
    expect(out.unnumbered).toEqual(['Upper left first molar'])
  })
  it('rules only: each tooth with its own sentence', () => {
    expect(rulesOnlyTeeth(NOTE).teeth).toEqual([
      { tooth: '36', finding: 'Deep distal caries 36, lingering pain to cold.' },
      { tooth: '37', finding: '37 sound.' },
    ])
  })
  it('the prompt holds the note between the markers and the rules of PROMPTS.md section 5', () => {
    const p = buildToothPrompt('Tooth 36 caries.')
    expect(p).toContain('<<<\nTooth 36 caries.\n>>>')
    expect(p).toContain('Numbers that are ages, doses, dates or durations are not teeth.')
  })
})

describe('T9 listTeeth: the one door (SECURITY A3)', () => {
  const raw = notes[0].text
  const { text: approved, map } = redactByCode(raw)

  it('the model gets only the approved anonymous text, inside the prompt', async () => {
    const fn = vi.fn<ToothModelFn>(async () => reply({ teeth: [{ tooth: '36', finding: 'Deep distal caries' }], unnumbered: [] }, 'cloud'))
    const r = await listTeeth(approved, map, fn)
    expect(r.ok && r.source).toBe('cloud')
    expect(fn).toHaveBeenCalledTimes(1)
    const prompt = fn.mock.calls[0][0]
    expect(prompt).toBe(buildToothPrompt(approved))
    for (const id of notes[0].identifiers) expect(prompt).not.toContain(id.value)
  })
  it('nothing approved: no call', async () => {
    const fn = vi.fn<ToothModelFn>()
    const r = await listTeeth(null, map, fn)
    expect(r.ok).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
  it('a name left in the text: blocked, no call', async () => {
    const fn = vi.fn<ToothModelFn>()
    const r = await listTeeth(raw, map, fn)
    expect(!r.ok && r.failure).toBe('blocked')
    expect(fn).not.toHaveBeenCalled()
  })
  it('a bad reply is retried once, through the guard again, then rules only', async () => {
    const fn = vi.fn<ToothModelFn>(async () => ({ text: 'nonsense', source: 'on-device' as const }))
    const r = await listTeeth(approved, map, fn)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(r.ok && r.source).toBe('rules')
    expect(r.ok && r.teeth.map((t) => t.tooth)).toEqual(['36'])
  })
  it('a quota error is not retried; rules only', async () => {
    const fn = vi.fn<ToothModelFn>(async () => {
      throw new LetterCallError('quota')
    })
    const r = await listTeeth(approved, map, fn)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(r.ok && r.source).toBe('rules')
  })
  it('a timeout falls back to rules only; a late reply is ignored', async () => {
    const fn: ToothModelFn = () => new Promise((res) => setTimeout(() => res(reply({ teeth: [], unnumbered: [] })), 200))
    const r = await listTeeth(approved, map, fn, { timeoutMs: 20 })
    expect(r.ok && r.source).toBe('rules')
  })
  it('aborted (the dentist edited): no list', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const r = await listTeeth(approved, map, vi.fn<ToothModelFn>(), { signal: ctrl.signal })
    expect(!r.ok && r.failure).toBe('aborted')
  })
  it('the badge reports which model answered', async () => {
    const r = await listTeeth(approved, new TokenMap(), async () => reply({ teeth: [], unnumbered: [] }, 'on-device'))
    expect(r.ok && r.source).toBe('on-device')
  })
})
