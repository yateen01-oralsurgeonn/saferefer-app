import { describe, expect, it } from 'vitest'
import clinical from '../../../../data/clinical-terms.json'
import drugs from '../../../../data/drugs.json'
import notes from '../../../../data/notes.json'
import tuneCa from '../../../../data/harness/tune-ca.json'
import tuneDental from '../../../../data/harness/tune-dental.json'
import tuneLaw from '../../../../data/harness/tune-law.json'
import lockedDental from '../../../../data/harness/locked-dental.json'
import {
  buildTermSet,
  checkSend,
  dedupeTerms,
  deriveIdFormat,
  isNewNote,
  isProblem,
  MAX_TERMS,
  redactFirst,
  rulesForPack,
  PACKS,
  sanitiseTerms,
  termsToHideItems,
  termsToRules,
  validateIdFormat,
  validateTerm,
  type Problem,
  type SavedTerm,
} from '../index'

const termSet = buildTermSet({ drugs, clinicalTerms: clinical })
const place = (text: string) => validateTerm({ kind: 'place', text }, termSet)
const reason = (x: SavedTerm | Problem) => (isProblem(x) ? x.problem : 'ok')

describe('T16 validateTerm', () => {
  it('accepts a place and a lab', () => {
    expect(place('behind bus stand')).toEqual({ kind: 'place', text: 'behind bus stand' })
    expect(validateTerm({ kind: 'org', text: 'Sai  Dental   Lab' }, termSet)).toEqual({ kind: 'org', text: 'Sai Dental Lab' })
  })

  it.each([
    ['ab', 'too-short'],
    ['x'.repeat(61), 'too-long'],
    ['near <ganesh>', 'bad-characters'],
    ['Plot 123456', 'long-number'],
    ['00000 55501', 'phone'],
    ['Plot 4521789', 'long-number'],
    ['asha@example.com', 'email'],
    ['visit 03/11/2026', 'date'],
    ['Rs 4500', 'amount'],
    ['45 lakh', 'amount'],
    ['36', 'tooth-number'],
    ['tooth 46', 'tooth-number'],
    ['Dr Testpatil', 'looks-like-name'],
    ['Mr Arvind', 'looks-like-name'],
    ['husband Ramesh', 'looks-like-name'],
    ['Rameshbhai', 'looks-like-name'],
  ])('refuses %s (%s)', (text, why) => {
    expect(reason(place(text))).toBe(why)
  })

  it('refuses a drug or clinical word', () => {
    const word = [...termSet].find((t) => t.length > 5 && !t.includes(' '))!
    expect(reason(place(word))).toBe('clinical-term')
    expect(reason(place('amoxicillin'))).toBe('clinical-term')
  })

  it('refuses a new term when 200 are saved, but not a duplicate of one that is', () => {
    const full: SavedTerm[] = Array.from({ length: MAX_TERMS }, (_, i) => ({ kind: 'place', text: `Mock Road ${String.fromCharCode(97 + (i % 26))}${i}` }))
    expect(reason(validateTerm({ kind: 'place', text: 'New Colony' }, termSet, full))).toBe('full')
    expect(reason(validateTerm({ kind: 'place', text: full[3].kind === 'place' ? full[3].text.toUpperCase() : '' }, termSet, full))).toBe('ok')
  })

  it('folds duplicates (case, spacing, NFKC)', () => {
    const t = dedupeTerms([
      { kind: 'place', text: 'Ganesh Mandir' },
      { kind: 'place', text: 'ganesh   mandir' },
      { kind: 'org', text: 'ganesh mandir' },
      { kind: 'idFormat', prefix: 'OP' },
      { kind: 'idFormat', prefix: 'op' },
    ])
    expect(t).toHaveLength(3)
  })

  it('sanitiseTerms drops anything read back that no longer passes', () => {
    const raw = [{ kind: 'place', text: 'Ganesh Mandir' }, { kind: 'place', text: '00000 55501' }, { kind: 'name', text: 'Asha' }, 5, null, { kind: 'idFormat', prefix: 'rct' }, { kind: 'idFormat', prefix: 'op' }]
    expect(sanitiseTerms(raw, termSet)).toEqual([{ kind: 'place', text: 'Ganesh Mandir' }, { kind: 'idFormat', prefix: 'op' }])
    expect(sanitiseTerms('nope', termSet)).toEqual([])
  })
})

describe('T16 ID formats keep the shape, never the number', () => {
  it.each([
    ['op-731', 'op'],
    ['OP 4471', 'op'],
    ['ort/48', 'ort'],
  ])('%s -> prefix %s', (text, prefix) => {
    expect(deriveIdFormat(text, termSet)).toEqual({ kind: 'idFormat', prefix })
  })

  it('refuses clinical and pack prefixes and non-ID shapes', () => {
    expect(deriveIdFormat('rct-2', termSet)).toBeNull()
    expect(deriveIdFormat('GSTR-3B', termSet)).toBeNull()
    expect(deriveIdFormat('gstr-3', termSet, rulesForPack(PACKS.ca).notIdPrefixes)).toBeNull()
    expect(deriveIdFormat('ganesh mandir', termSet)).toBeNull()
    expect(deriveIdFormat('op-1234567', termSet)).toBeNull()
    expect(reason(validateIdFormat('rct-2', termSet))).toBe('not-an-id-format')
  })

  it('a saved prefix hides other numbers with it, any case and separator', () => {
    const rules = termsToRules([{ kind: 'idFormat', prefix: 'op' }])
    const r = redactFirst('Seen op-12, then OP 4471 and op/9. Tooth 36. Group opal 12.', [], rules)
    expect(r.text).toContain('Seen [ID], then [ID_2] and [ID_3].')
    expect(r.text).toContain('Tooth 36')
    expect(r.text).toContain('opal 12')
  })

  it('review fix: an ID prefix never eats post-op / pre-op wording or a duration', () => {
    const rules = termsToRules([{ kind: 'idFormat', prefix: 'op' }])
    for (const n of ['Post-op 3 days pain free.', 'Review post op 2 weeks.', 'Pre-op 1 dose given.', 'op 3 times a day', 'POST-OP 10 days'])
      expect(redactFirst(n, [], rules).text).toBe(n)
    // Real IDs are still hidden, including one followed by a word that is not a time unit.
    expect(redactFirst('File op-731 attached. OP 4471 seen.', [], rules).text).toBe('File [ID] attached. [ID_2] seen.')
  })

  it('termsToRules only adds: no ID format gives the same object, base finders stay', () => {
    const base = rulesForPack(PACKS.ca)
    expect(termsToRules([{ kind: 'place', text: 'Mock Road' }], base)).toBe(base)
    const merged = termsToRules([{ kind: 'idFormat', prefix: 'op' }], base)
    expect(merged.extraIds!.length).toBe((base.extraIds?.length ?? 0) + 1)
    expect(merged.notIdPrefixes).toBe(base.notIdPrefixes)
  })
})

describe('review fix: isNewNote (hand hides and un-hides belong to one note)', () => {
  it.each([
    ['Asha came today.', '', true],
    ['Asha came today.', '   ', true],
    ['', 'Asha', false],
    ['Asha came today.', 'Asha came today. Pain.', false],
    ['Asha came today.', 'Ash came today.', false],
    ['Asha came today.', 'Mohan, 40, toothache', true],
    ['Asha came today.', 'Asha', false],
  ])('%j -> %j is new: %s', (prev, next, want) => {
    expect(isNewNote(prev, next)).toBe(want)
  })
})

describe('T16 saved terms in redactFirst', () => {
  const saved = termsToHideItems([
    { kind: 'place', text: 'behind bus stand' },
    { kind: 'org', text: 'sunrise ortho lab' },
  ])

  it('hides a saved place as ADDRESS and a lab as ORG, any case and spacing', () => {
    const r = redactFirst('Lives BEHIND  Bus   Stand. Crown sent to Sunrise  Ortho Lab.', [], undefined, saved)
    expect(r.text).toBe('Lives [ADDRESS]. Crown sent to [ORG].')
  })

  it('saved terms, hand hides and code finds share one map', () => {
    const r = redactFirst('Patient: Asha Testpatil. Phone 00000 55501. Behind Bus Stand, met Gopal.', ['Gopal'], undefined, saved)
    expect(r.text).toBe('Patient: [PATIENT]. Phone [PHONE]. [ADDRESS], met [PERSON_1].')
    expect(r.map.entries().map((e) => e.token).sort()).toEqual(['[ADDRESS]', '[PATIENT]', '[PERSON_1]', '[PHONE]'].sort())
  })

  it('the send guard blocks a saved term left in the text like any map value', () => {
    const r = redactFirst('Lives behind bus stand.', [], undefined, saved)
    const leaked = r.text.replace('[ADDRESS]', 'behind bus stand')
    expect(checkSend(leaked, r.map).ok).toBe(false)
    expect(checkSend(r.text, r.map).ok).toBe(true)
  })

  it('saved = [] gives byte-identical output on the 30 builder notes and the harness sets', () => {
    const sets: Array<{ text: string }[]> = [notes, tuneDental, tuneCa, tuneLaw, lockedDental]
    const packs = [PACKS.dental, PACKS.dental, PACKS.ca, PACKS.law, PACKS.dental]
    sets.forEach((set, i) => {
      const rules = rulesForPack(packs[i])
      for (const n of set) {
        const a = redactFirst(n.text, [], rules)
        const b = redactFirst(n.text, [], rules, [])
        const c = redactFirst(n.text, [], termsToRules([], rules), termsToHideItems([]))
        expect(b.text).toBe(a.text)
        expect(c.text).toBe(a.text)
      }
    })
  })

  it('applying terms makes no request', async () => {
    const original = globalThis.fetch
    let calls = 0
    globalThis.fetch = (() => {
      calls++
      return Promise.reject(new Error('no network'))
    }) as typeof fetch
    try {
      redactFirst('Lives behind bus stand, op-12.', [], termsToRules([{ kind: 'idFormat', prefix: 'op' }]), saved)
      validateTerm({ kind: 'place', text: 'Mock Road' }, termSet)
    } finally {
      globalThis.fetch = original
    }
    expect(calls).toBe(0)
  })
})
