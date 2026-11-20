// The four code-rule fixes made on 20 Nov 2026 from the harness TUNE-set misses (never the locked ones).
// Each fix has cases it must catch AND cases it must leave alone, so it cannot quietly start over-hiding.
import { describe, expect, it } from 'vitest'
import { CA_PACK, DENTAL_PACK, LAW_PACK, redactByCode, rulesForPack, TokenMap, type Pack } from '..'

const run = (pack: Pack, text: string) => redactByCode(text, new TokenMap(), rulesForPack(pack)).text
const hidden = (pack: Pack, text: string, piece: string) => !run(pack, text).toLowerCase().includes(piece.toLowerCase())

describe('fix 1: a month written in full is a date even when the day looks like a tooth number', () => {
  it.each(['Next visit December 16.', 'next visit october 14.', 'Seen on September 26 for review.', 'Hearing August 22.'])('%s', (t) => {
    const day = t.match(/\d+/)![0]
    expect(hidden(DENTAL_PACK, t, day)).toBe(true)
  })
  it('a short month next to a tooth-like number still needs a year or a date word', () => {
    // "Dec 16" with no cue stays (could be "Dec" in a list, then tooth 16); the old behaviour is kept for short forms.
    expect(run(DENTAL_PACK, 'Items Dec 16 crown')).toContain('16')
  })
  it('a short month with a date word in front is a date', () => {
    expect(hidden(DENTAL_PACK, 'Review on Oct 14 please.', '14')).toBe(true)
  })
  it('the old known gap "Seen Nov 26 for review." is now hidden (moved up from attack.test.ts)', () => {
    expect(hidden(DENTAL_PACK, 'Seen Nov 26 for review.', 'Nov 26')).toBe(true)
  })
  it('"may" in lower case is still not a month', () => {
    expect(run(DENTAL_PACK, 'tooth 26 may 16 need a crown')).toContain('16')
  })
  it('tooth numbers with no month are untouched', () => {
    const out = run(DENTAL_PACK, 'Caries in 16 and 26, tender 36.')
    expect(out).toContain('16')
    expect(out).toContain('26')
    expect(out).toContain('36')
  })
})

describe('fix 2: a bare OPD / IPD number is an ID', () => {
  it.each(['OPD 2090 - review', 'opd 6731 seen', 'IPD 44512 discharged'])('%s', (t) => {
    expect(hidden(DENTAL_PACK, t, t.match(/\d+/)![0])).toBe(true)
  })
  it('"OPD no." keeps working', () => {
    expect(hidden(DENTAL_PACK, 'OPD no. 4521 today', '4521')).toBe(true)
  })
  it('the word OPD alone, or a tiny number after it, is left', () => {
    expect(run(DENTAL_PACK, 'Seen in OPD today')).toContain('OPD')
    expect(run(DENTAL_PACK, 'OPD 2 is busy')).toContain('2 is busy')
  })
})

describe('fix 3: PAN, TAN and IFSC typed in lower case', () => {
  it.each([
    ['pan', 'pan zzzcq0438x on file', 'zzzcq0438x'],
    ['tan', 'tan pune79703h for the deductor', 'pune79703h'],
    ['ifsc', 'ifsc test0291793 branch', 'test0291793'],
    ['upper case still works', 'PAN ZZZPK0123F', 'ZZZPK0123F'],
  ])('%s', (_n, t, id) => {
    expect(hidden(CA_PACK, t, id)).toBe(true)
  })
  it('ordinary words and amounts are left', () => {
    const t = 'Interest of Rs 62,000 under section 194A; form 26AS differs; GSTR-3B filed.'
    const out = run(CA_PACK, t)
    for (const keep of ['Rs 62,000', '194A', '26AS', 'GSTR-3B', 'Interest']) expect(out).toContain(keep)
  })
})

describe('fix 4: bar enrolment number in lower case', () => {
  it.each(['enrolment mah/1754/2018 on file', 'Enrolment MAH/1754/2018', 'enrolment d/567/2019'])('%s', (t) => {
    expect(hidden(LAW_PACK, t, t.match(/[a-z]{1,3}\/\d+\/\d{4}/i)![0])).toBe(true)
  })
  it('section numbers and a claim amount stay', () => {
    const out = run(LAW_PACK, 'Complaint under section 138 for Rs 6,50,000.')
    expect(out).toContain('section 138')
    expect(out).toContain('Rs 6,50,000')
  })
})
