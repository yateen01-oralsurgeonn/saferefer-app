import { describe, expect, it } from 'vitest'
import terms from '../../../../data/clinical-terms.json'
import drugs from '../../../../data/drugs.json'
import shorthand from '../../../../data/shorthand.json'
import { buildTermSet, redactFirst, segmentPreview, unhideTokens } from '../index'

const safe = new Set([...buildTermSet({ drugs, clinicalTerms: terms }), ...Object.keys(shorthand).map((k) => k.toLowerCase())])
const seg = (text: string, allowed: string[] = []) => segmentPreview(text, { safe, allowed })
const amber = (text: string, allowed: string[] = []) => seg(text, allowed).filter((s) => s.kind === 'amber').map((s) => s.text)

describe('T5 redactFirst', () => {
  it('runs the code redactor at once, then hides hand-hidden text as PERSON', () => {
    const r = redactFirst('Patient: Asha Testpatil. Phone 00000 55501. Met Gopal at the clinic. Tooth 36 caries.', ['Gopal'])
    expect(r.text).toContain('Patient: [PATIENT]')
    expect(r.text).toContain('[PHONE]')
    expect(r.text).toMatch(/Met \[PERSON_\d\] at the clinic/)
    expect(r.text).toContain('Tooth 36 caries')
    expect(r.notFound).toEqual([])
  })

  it('hand-hidden text that is not in the note comes back in notFound', () => {
    expect(redactFirst('Tooth 36 caries.', ['Zorblax']).notFound.map((i) => i.text)).toEqual(['Zorblax'])
  })

  it('a fresh map every call', () => {
    const a = redactFirst('Patient: Asha Testpatil.', [])
    const b = redactFirst('Patient: Asha Testpatil.', [])
    expect(a.map).not.toBe(b.map)
  })
})

describe('T5 unhideTokens', () => {
  it('puts the text back for the clicked token only, and keeps the possessive', () => {
    const r = redactFirst("Patient: Asha Testpatil. Phone 00000 55501. Husband Ramesh's job.", [])
    expect(r.text).toContain('[PHONE]')
    const phone = r.map.entries().find((e) => e.type === 'PHONE')!
    const back = unhideTokens(r.text, r.map, phone.variants)
    expect(back).toContain(phone.variants[0])
    expect(back).not.toContain('[PHONE]')
    expect(back).toContain('[PATIENT]')
    expect(back).toContain("[RELATIVE_1]'s")
  })

  it('does nothing when nothing is un-hidden, and matches ignoring case and spaces', () => {
    const r = redactFirst('Patient: Asha Testpatil. Husband Ramesh came.', [])
    expect(unhideTokens(r.text, r.map, [])).toBe(r.text)
    expect(unhideTokens(r.text, r.map, ['  RAMESH '])).toContain('Ramesh')
  })
})

describe('T5 amber underline (PROMPTS.md 6.4)', () => {
  it('underlines a capitalised word in the middle of a sentence', () => {
    expect(amber('Referred by Zorblax today.')).toEqual(['Zorblax'])
  })
  it('skips sentence starts, clinical words, drugs, label words and months', () => {
    expect(amber('Tooth 36 caries. Pain on cold. Given Ibuprofen. Seen by Dr [PERSON_1] in November. Patient: [PATIENT].')).toEqual([])
  })
  it('never underlines tokens, and the pieces join back to the original text', () => {
    const text = 'Patient: [PATIENT]. Came with [RELATIVE_1] and Zorblax.'
    const segs = seg(text)
    expect(segs.filter((s) => s.kind === 'token').map((s) => s.text)).toEqual(['[PATIENT]', '[RELATIVE_1]'])
    expect(segs.map((s) => s.text).join('')).toBe(text)
    expect(amber(text)).toEqual(['Zorblax'])
  })
  it('does not underline text the dentist un-hid', () => {
    expect(amber('Referred by Zorblax today.', ['Zorblax'])).toEqual([])
  })
  it('the word after a full stop and a new line is a sentence start', () => {
    expect(amber('Seen.\nKavita waited. Then Kavita left. Later Kavita came.')).toEqual(['Kavita', 'Kavita'])
  })
})
