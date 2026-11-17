import { describe, expect, it } from 'vitest'
import { redactByCode } from '../codeRedactor'
import { restoreLetter } from '../restore'
import { TokenMap } from '../tokens'

function sampleMap() {
  const map = new TokenMap()
  map.assign('PATIENT', 'Asha Testpatil')
  map.assign('RELATIVE', 'Ramesh')
  map.assign('PHONE', '00000 55501')
  map.assign('DATE', '03/11/2026', '2026-11-03')
  return map
}

describe('T7 restore (ACCEPTANCE.md)', () => {
  it('puts names back in one pass', () => {
    const r = restoreLetter('Re: [PATIENT]. Husband [RELATIVE_1], phone [PHONE], seen [DATE_1].', sampleMap())
    expect(r.text).toBe('Re: Asha Testpatil. Husband Ramesh, phone 00000 55501, seen 03/11/2026.')
    expect(r.warnings).toEqual([])
    expect(r.repaired).toBe(0)
  })

  it('repairs [Patient], [ PATIENT ], [RELATIVE 1], [PATIENT_1], [relative-1], [RELATIVE]', () => {
    const r = restoreLetter('[Patient] / [ PATIENT ] / [RELATIVE 1] / [PATIENT_1] / [relative-1] / [RELATIVE]', sampleMap())
    expect(r.text).toBe('Asha Testpatil / Asha Testpatil / Ramesh / Asha Testpatil / Ramesh / Ramesh')
    expect(r.repaired).toBe(6)
    expect(r.warnings).toEqual([])
  })

  it('an unknown token stays as it is and raises a red warning', () => {
    const r = restoreLetter('Re: [PATIENT]. Seen with [PERSON_9] and [RELATIVE_2].', sampleMap())
    expect(r.text).toBe('Re: Asha Testpatil. Seen with [PERSON_9] and [RELATIVE_2].')
    expect(r.warnings.map((w) => [w.level, w.kind, w.text])).toEqual([
      ['red', 'unknown-token', '[PERSON_9]'],
      ['red', 'unknown-token', '[RELATIVE_2]'],
    ])
    expect(r.text.slice(r.warnings[0].index, r.warnings[0].index + 10)).toBe('[PERSON_9]')
  })

  it('does not guess when a bare type could mean two tokens', () => {
    const map = sampleMap()
    map.assign('RELATIVE', 'Sunita')
    const r = restoreLetter('[PATIENT] came with [RELATIVE].', map)
    expect(r.text).toBe('Asha Testpatil came with [RELATIVE].')
    expect(r.warnings[0].level).toBe('red')
  })

  it('any other bracketed text raises a red warning and is left alone', () => {
    const r = restoreLetter('[PATIENT] [see chart] [DOCTOR]', sampleMap())
    expect(r.text).toBe('Asha Testpatil [see chart] [DOCTOR]')
    expect(r.warnings.filter((w) => w.level === 'red')).toHaveLength(2)
  })

  it('amber when the patient token is absent; red when a token lost its brackets', () => {
    const r = restoreLetter('Dear Colleague, RELATIVE_1 brought the patient.', sampleMap())
    expect(r.warnings.map((w) => [w.level, w.kind])).toEqual([
      ['red', 'bare-token'],
      ['amber', 'patient-missing'],
    ])
  })

  it('never chains replaces: a value that looks like a token is not replaced again', () => {
    const map = new TokenMap()
    map.assign('PATIENT', '[PHONE]')
    map.assign('PHONE', '00000 55501')
    expect(restoreLetter('[PATIENT] rang from [PHONE]', map).text).toBe('[PHONE] rang from 00000 55501')
  })

  it('values with $ signs are restored literally', () => {
    const map = new TokenMap()
    map.assign('PATIENT', 'A$1 $& Test')
    expect(restoreLetter('Re: [PATIENT]', map).text).toBe('Re: A$1 $& Test')
  })

  it('round trip: redact then restore gives back the note', () => {
    const note = 'Patient: Asha Testpatil. Phone: 00000 55501. Seen on 03/11/2026 and 12 Nov 2026. Asha has pain in 36.'
    const { text, map } = redactByCode(note)
    const back = restoreLetter(text, map).text
    // The given name alone restores to the full name (PROMPTS.md section 2: the longer value is kept).
    expect(back).toBe('Patient: Asha Testpatil. Phone: 00000 55501. Seen on 03/11/2026 and 12 Nov 2026. Asha Testpatil has pain in 36.')
  })
})
