import { describe, expect, it, vi } from 'vitest'
import notes from '../../../../data/notes.json'
import { redactByCode } from '../codeRedactor'
import { BLOCKED_MESSAGE, checkSend, guardedSend } from '../sendGuard'
import { TokenMap } from '../tokens'

function mapWith(...items: Array<[Parameters<TokenMap['assign']>[0], string]>) {
  const map = new TokenMap()
  for (const [type, value] of items) map.assign(type, value)
  return map
}
const ramesh = () => mapWith(['PATIENT', 'Asha Patil'], ['RELATIVE', 'Ramesh'])
const blocked = (text: string, map = ramesh()) => {
  const r = checkSend(text, map)
  return !r.ok
}

describe('T5 send guard (ACCEPTANCE.md)', () => {
  it('passes a clean anonymous note', () => {
    expect(checkSend('[PATIENT] came with husband [RELATIVE_1]. 36 deep caries, pain 3 days.', ramesh())).toEqual({ ok: true })
  })
  it('blocks "Rameshs"', () => expect(blocked('Rameshs car was outside.')).toBe(true))
  it('blocks "RameshPatil"', () => expect(blocked('Signed RameshPatil.')).toBe(true))
  it('blocks "RAMESH"', () => expect(blocked('HUSBAND RAMESH PRESENT.')).toBe(true))
  it('blocks a 3-letter name as a whole word, but not inside another word', () => {
    const map = mapWith(['RELATIVE', 'Joy'])
    expect(blocked('His wife joy answers.', map)).toBe(true)
    expect(blocked('His wife JOY answers.', map)).toBe(true)
    expect(blocked('Patient did not enjoy the visit.', map)).toBe(false)
  })
  it('blocks a phone number, even one that is not in the map', () => {
    expect(blocked('Call 00000 55501 after six.')).toBe(true)
    expect(blocked('Call +91 00000 55501.')).toBe(true)
  })
  it('blocks an email address, even one that is not in the map', () => {
    expect(blocked('Write to someone@example.com please.')).toBe(true)
  })
  it('shows the fixed message and never an Error object', () => {
    const r = checkSend('Ramesh is here', ramesh())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe(BLOCKED_MESSAGE)
  })
})

describe('send guard, harder cases', () => {
  it('blocks a name with changed spacing or punctuation', () => {
    const map = mapWith(['PATIENT', 'Arvind Testwala'])
    expect(blocked('Arvind-Testwala attended.', map)).toBe(true)
    expect(blocked('Arvind\nTestwala attended.', map)).toBe(true)
    expect(blocked('A r v i n d T e s t w a l a attended.', map)).toBe(true)
    expect(blocked('ARVIND   TESTWALA attended.', map)).toBe(true)
  })
  it('blocks a surname or given name left alone', () => {
    const map = mapWith(['PATIENT', 'Arvind Testwala'])
    expect(blocked('[PATIENT] Testwala attended.', map)).toBe(true)
    expect(blocked('Mrs Testwala will pay.', map)).toBe(true)
    expect(blocked('Arvind says it hurts.', map)).toBe(true)
  })
  it('blocks a hidden phone written in another grouping', () => {
    const map = mapWith(['PHONE', '00000 55501'])
    expect(blocked('Ring 0 0 0 0 0 5 5 5 0 1.', map)).toBe(true)
    expect(blocked('Ring 000-005-5501.', map)).toBe(true)
    expect(blocked('Ring 0000055501.', map)).toBe(true)
  })
  it('blocks full-width and zero-width tricks', () => {
    expect(blocked('Ｒａｍｅｓｈ is here.')).toBe(true)
    expect(blocked('Ra​mesh is here.')).toBe(true)
  })
  it('does not block the word inside a token, or clinical numbers', () => {
    const map = mapWith(['PERSON', 'Patient'], ['PERSON', 'Date'])
    expect(checkSend('[PATIENT] seen on [DATE_1].', map).ok).toBe(true)
    expect(checkSend('Pockets 6 mm at 16, 17, 26 and 27. Teeth 31 32 41 42 mobile. BP 120/80.', ramesh()).ok).toBe(true)
  })
  it('a common word that is part of a longer hidden name does not block', () => {
    // "Hope Sampledas" is hidden; "hopeless" in the note must not block.
    const map = mapWith(['PERSON', 'Hope Sampledas'])
    expect(checkSend('She has hopeless 31 and 32. We hope to save 33.', map).ok).toBe(true)
    expect(blocked('Mrs Hope takes messages.', map)).toBe(true)
  })
  it('lets through only what the dentist un-hid on purpose', () => {
    const text = 'Probing depths 3 2 3 4 3 3 2 3 4.'
    expect(blocked(text)).toBe(true)
    expect(checkSend(text, ramesh(), { allowed: ['3 2 3 4 3 3 2 3 4'] }).ok).toBe(true)
    expect(checkSend(text + ' Call 00000 55501.', ramesh(), { allowed: ['3 2 3 4 3 3 2 3 4'] }).ok).toBe(false)
  })
})

describe('guard over the 30 synthetic notes', () => {
  it('blocks every raw note (each one holds at least one identifier the code redactor finds)', () => {
    for (const n of notes) {
      const { map } = redactByCode(n.text)
      expect(checkSend(n.text, map).ok, n.id).toBe(false)
    }
  })
  it('passes every note after code redaction (no false block)', () => {
    for (const n of notes) {
      const { text, map } = redactByCode(n.text)
      const r = checkSend(text, map)
      expect(r.ok ? 'ok' : `${n.id} blocked by ${r.reason}`, n.id).toBe('ok')
    }
  })
})

describe('guardedSend: the one door to the cloud', () => {
  it('does not call send when nothing is approved', async () => {
    const send = vi.fn(async (t: string) => t)
    const r = await guardedSend(null, ramesh(), send)
    expect(r.ok).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })
  it('does not call send when the guard blocks', async () => {
    const send = vi.fn(async (t: string) => t)
    const r = await guardedSend('Ramesh is here', ramesh(), send)
    expect(r.ok).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })
  it('passes exactly the approved text to send', async () => {
    const send = vi.fn(async (t: string) => `letter for ${t}`)
    const r = await guardedSend('[PATIENT] has pain in 36.', ramesh(), send)
    expect(send).toHaveBeenCalledExactlyOnceWith('[PATIENT] has pain in 36.')
    expect(r).toEqual({ ok: true, value: 'letter for [PATIENT] has pain in 36.' })
  })
})

describe('T12 a long hidden name word inside a longer word (found while forcing failures in the browser)', () => {
  const kiran = () => mapWith(['PATIENT', 'Kiran Mockpatil'])
  it.each([
    ['glued in front and behind', 'Referred via clinicMockpatilx today.'],
    ['with a family ending', 'The Mockpatilkar family has caries.'],
    ['with a digit', 'File Mockpatil2 is in the archive.'],
    ['in capitals inside a word', 'SEEN BY DRMOCKPATILX.'],
    ['in front of a letter', 'xMockpatil came.'],
  ])('blocks the surname %s', (_name, text) => {
    expect(blocked(text, kiran())).toBe(true)
  })

  it('shows the whole word that tripped it, for the dentist to hide by hand', () => {
    const r = checkSend('Referred via clinicMockpatilx today.', kiran())
    expect(!r.ok && r.hit).toBe('clinicmockpatilx')
  })

  it('a word the dentist cleared by hand, or a known clinical word, still passes', () => {
    expect(checkSend('Referred via clinicMockpatilx today.', kiran(), { allowed: ['clinicMockpatilx'] })).toEqual({ ok: true })
    expect(checkSend('Referred via clinicMockpatilx today.', kiran(), { safeWords: ['clinicmockpatilx'] })).toEqual({ ok: true })
  })

  it('words shorter than 6 letters are not searched inside other words (too many ordinary words contain them)', () => {
    expect(blocked('Palatal swelling, no amitriptyline.', mapWith(['PATIENT', 'Lata Amit']))).toBe(false)
    expect(blocked('Marked mobility of 36.', mapWith(['PATIENT', 'Asha Mark']))).toBe(false)
  })

  it('a clean anonymous note and every synthetic note after redaction still pass', () => {
    expect(checkSend('[PATIENT] referred via clinic. Tooth 36.', kiran())).toEqual({ ok: true })
    for (const n of notes) {
      const r = redactByCode(n.text)
      expect(checkSend(r.text, r.map).ok, n.id).toBe(true)
    }
  })
})
