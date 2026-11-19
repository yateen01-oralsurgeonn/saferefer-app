import { describe, expect, it } from 'vitest'
import notes from '../../../../data/notes.json'
import { redactByCode } from '../codeRedactor'
import { hideValues, TokenMap, tokenRegex } from '../tokens'

const note1 = notes[0].text

describe('T3 code redactor', () => {
  it('note 1: name, phone and date become tokens; tooth number stays', () => {
    const { text, map } = redactByCode(note1)
    expect(text).toContain('Patient: [PATIENT].')
    expect(text).toContain('Phone: [PHONE].')
    expect(text).toContain('Seen on [DATE_1].')
    expect(text).toContain('tooth 36')
    expect(text).not.toMatch(/Arvind|Testwala|55501|03\/11/)
    expect(map.get('[PATIENT]')?.value).toBe('Arvind Testwala')
    expect(map.get('[PHONE]')?.value).toBe('00000 55501')
  })

  it('dates are numbered in order; the same date in two spellings shares a token', () => {
    const { text, map } = redactByCode('Seen 12/11/2026. X-ray 01/11/2026. Review of 12 Nov 2026 visit.')
    expect(text).toBe('Seen [DATE_1]. X-ray [DATE_2]. Review of [DATE_1] visit.')
    expect(map.get('[DATE_1]')?.value).toBe('12/11/2026')
  })

  it('age stays, date of birth goes', () => {
    const { text } = redactByCode('Patient: Asha Testpatil, age 36, DOB 12/04/1990. 36 has deep caries.')
    expect(text).toBe('Patient: [PATIENT], age 36, DOB [DATE_1]. 36 has deep caries.')
  })

  it('given name alone shares the patient token; any case; possessive kept', () => {
    const { text, map } = redactByCode("Patient: Asha Testpatil. Asha's pain began at night. ASHA TESTPATIL agrees.")
    expect(text).toBe("Patient: [PATIENT]. [PATIENT]'s pain began at night. [PATIENT] agrees.")
    expect(map.get('[PATIENT]')?.value).toBe('Asha Testpatil')
  })

  it('a surname alone gets its own token, not the patient token', () => {
    const { text } = redactByCode('Patient: Asha Testpatil. Mr Testpatil will pay.')
    expect(text).toContain('Patient: [PATIENT].')
    expect(text).not.toContain('Testpatil')
    expect(text).toMatch(/Mr \[PERSON_1\] will pay/)
  })

  it('second and third items of a type are numbered _2, _3', () => {
    const { text } = redactByCode('Call 00000 55501 or 00000 55502. Mail a@example.com.')
    expect(text).toBe('Call [PHONE] or [PHONE_2]. Mail [EMAIL].')
  })

  it('titled names and relatives are found without a header', () => {
    const { text } = redactByCode('Mrs Asha Testpatil came with her husband Ramesh. Dr Neha Testgupta is aware.')
    expect(text).toBe('Mrs [PATIENT] came with her husband [RELATIVE_1]. Dr [PERSON_1] is aware.')
  })

  it('running twice changes nothing, and tokens are never matched again', () => {
    const first = redactByCode(note1)
    const second = redactByCode(first.text, first.map)
    expect(second.text).toBe(first.text)
  })

  it('every token in the output is in the map and matches the token regex', () => {
    for (const n of notes) {
      const { text, map } = redactByCode(n.text)
      for (const m of text.matchAll(tokenRegex())) expect(map.get(m[0])).toBeDefined()
    }
  })

  // ACCEPTANCE.md T3: no header name, phone, email or date from the identifier list is left.
  // Known gaps are listed by hand below so that a new miss fails this test.
  it('all 30 notes: phones, emails and numeric or named-month dates are all hidden', () => {
    const left: string[] = []
    for (const n of notes) {
      const { text } = redactByCode(n.text)
      for (const id of n.identifiers) {
        if (!['phone', 'email', 'date', 'dob'].includes(id.type)) continue
        if (text.includes(id.value)) left.push(`${n.id} ${id.type} ${id.value}`)
      }
    }
    // Since the Part C hardening, festival dates ("Diwali eve") are found too.
    expect(left).toEqual([])
  })

  it('all 30 notes: every header or titled patient name is hidden', () => {
    const left: string[] = []
    for (const n of notes) {
      const { text } = redactByCode(n.text)
      const first = n.identifiers.find((i) => i.type === 'name')
      if (first && text.includes(first.value)) left.push(`${n.id} ${first.value}`)
    }
    // These three notes give a single name with no header, title, age or cue word. Code cannot know it is a name.
    expect(left).toEqual(["N24 Bunty", "N27 Rose", "N30 Pinky"])
  })
})

describe('hideValues (used by T4 Nano items and T5 hand-hiding)', () => {
  it('longest first, whole word, any case, possessive kept, numbering by first appearance', () => {
    const map = new TokenMap()
    const input = "Lives with Ramesh. Works at Infosys. RAMESH PATIL drives. Ramesh's car. Rameshwar temple."
    const { text, notFound } = hideValues(
      input,
      [
        { text: 'Infosys', type: 'EMPLOYER' },
        { text: 'Ramesh', type: 'RELATIVE' },
        { text: 'Ramesh Patil', type: 'PERSON' },
        { text: 'Not In Note', type: 'ORG' },
      ],
      map,
    )
    expect(text).toBe("Lives with [RELATIVE_1]. Works at [EMPLOYER]. [RELATIVE_1] drives. [RELATIVE_1]'s car. Rameshwar temple.")
    expect(map.get('[RELATIVE_1]')?.value).toBe('RAMESH PATIL')
    expect(notFound).toEqual([{ text: 'Not In Note', type: 'ORG' }])
  })

  it('never matches inside an existing token', () => {
    const map = new TokenMap()
    const { text } = hideValues('[PATIENT] met the patient', [{ text: 'PATIENT', type: 'PERSON' }], map)
    expect(text).toBe('[PATIENT] met the [PERSON_1]')
  })
})

describe('possessive stays outside the token', () => {
  it.each([
    ["Mrs Kulkarni's neighbour drove her.", "Mrs [PATIENT]'s neighbour drove her."],
    ["Husband Ramesh's job is stable.", "Husband [RELATIVE_1]'s job is stable."],
  ])('%s', (note, expected) => {
    expect(redactByCode(note).text).toBe(expected)
  })
})
