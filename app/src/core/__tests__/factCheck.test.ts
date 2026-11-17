import { describe, expect, it } from 'vitest'
import terms from '../../../../data/clinical-terms.json'
import drugs from '../../../../data/drugs.json'
import shorthand from '../../../../data/shorthand.json'
import { checkFacts, hasRed, type FactLists } from '../factCheck'

const lists: FactLists = { drugs, treatments: terms.treatments, findings: terms.findings, shorthand }
const note =
  'Patient: Asha Testpatil, age 36. 36 deep distal caries, pain to cold for 3 days. TTP. Adv RCT. Given ibuprofen 400 mg. Seen on 03/11/2026.'
const check = (letter: string, n = note) => checkFacts(letter, n, lists)
const kinds = (letter: string, n = note) => check(letter, n).map((w) => `${w.level}:${w.kind}:${w.text}`)

describe('T7 fact check, step B', () => {
  it('a letter that only repeats the note has no warnings', () => {
    const letter =
      'Re: Asha Testpatil, 36. Tooth 36 has deep distal caries with pain to cold for 3 days. Tender to percussion. Root canal treatment advised. Ibuprofen 400 mg given. Seen on 03/11/2026.'
    expect(kinds(letter)).toEqual([])
  })

  it('ACCEPTANCE: "tooth 47" not in the note gives the red warning with the exact words', () => {
    const w = check('Tooth 36 has caries. Please also assess tooth 47.')
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ level: 'red', kind: 'tooth', text: '47', message: 'Tooth 47 is not in your note' })
    expect(hasRed(w)).toBe(true)
    expect(hasRed(check('Tooth 36 has caries.'))).toBe(false)
  })

  it('numbers: a changed dose or duration is red', () => {
    expect(kinds('Ibuprofen 600 mg for 5 days.')).toEqual(['red:number:600', 'red:number:5'])
  })

  it('tooth words not in the note are red', () => {
    expect(kinds('The lower first molar has caries.')).toEqual(['red:tooth-word:molar'])
  })

  it('dates, months, weekdays and relative days not in the note are red', () => {
    expect(kinds('Seen on 03/11/2026.')).toEqual([])
    expect(kinds('Seen yesterday.')).toEqual(['red:date:yesterday'])
    expect(kinds('Seen on Monday in October.')).toEqual(['red:date:Monday', 'red:date:October'])
    expect(kinds('Review on 04/11/2026.').some((k) => k.startsWith('red:date'))).toBe(true)
  })

  it('drugs: an invented drug is red; another name of the same drug is fine', () => {
    expect(kinds('Amoxicillin was given.')).toEqual(['red:drug:Amoxicillin'])
    expect(kinds('Brufen was given.')).toEqual([])
    expect(kinds('Lidocaine used.', 'LA with lignocaine. 36 caries.')).toEqual([])
  })

  it('treatments: note shorthand is expanded; an invented treatment is red', () => {
    expect(kinds('Root canal treatment was advised.')).toEqual([])
    expect(kinds('Extraction was advised.')).toEqual(['red:treatment:Extraction'])
    expect(kinds('A crown is planned.')).toEqual(['red:treatment:crown'])
  })

  it('findings not in the note are amber; number words too', () => {
    expect(kinds('There is swelling.')).toEqual(['amber:finding:swelling'])
    expect(kinds('Two episodes reported.')).toEqual(['amber:number-word:Two'])
    expect(kinds('Pain for three days.')).toEqual([]) // the note has the digit 3
  })

  it('template heading lines can be skipped (T11)', () => {
    const letter = 'Root canal history\nTooth 36 has caries.\nExtraction history\nNot recorded.'
    const w = checkFacts(letter, note, lists, { skipLines: ['Extraction history'] })
    expect(w).toEqual([])
  })

  it('never changes the letter: warnings carry the position of the text', () => {
    const letter = 'Tooth 36. Also 47.'
    const w = check(letter)
    expect(letter.slice(w[0].index, w[0].index + 2)).toBe('47')
  })

  it('unknown bracketed text is left to the token check, not reported twice', () => {
    expect(kinds('Seen with [PERSON_9].')).toEqual([])
  })
})
