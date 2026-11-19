// Part C: attacks on the redactor and the guard. Each case here failed, or was
// expected to be risky, when first written. Cases we could not fix are in
// `it.fails(...)` blocks at the bottom, so they stay visible.
import { describe, expect, it } from 'vitest'
import { redactByCode } from '../codeRedactor'
import { checkSend } from '../sendGuard'
import { TokenMap } from '../tokens'

/** After code redaction, none of `secrets` may be left in the text. */
function hidden(note: string, ...secrets: string[]) {
  const { text } = redactByCode(note)
  const left = secrets.filter((s) => text.toLowerCase().includes(s.toLowerCase()))
  return left.length === 0 ? 'hidden' : `LEFT: ${left.join(' | ')} IN: ${text}`
}
/** Text that must survive redaction untouched (no clinical damage). */
function kept(note: string) {
  const { text } = redactByCode(note)
  return text === note ? 'kept' : `CHANGED: ${text}`
}

describe('attack: phone formats', () => {
  const cases: Array<[string, string[]]> = [
    ['Call +91 00000 55501 today.', ['55501', '00000']],
    ['Call +91-00000-55501 today.', ['55501']],
    ['Call +91 (0) 00000 55501 today.', ['55501']],
    ['Call 0091 00000 55501 today.', ['55501']],
    ['Call 000 0055 501 today.', ['501', '0055']],
    ['Call 00000.55501 today.', ['55501']],
    ['Call 0 0 0 0 0 5 5 5 0 1 today.', ['5 5 5']],
    ['Call 00000  55501 today.', ['55501']],
    ['Call 00000-55-501 today.', ['501']],
    ['mob:0000055501', ['0000055501']],
    ['Mob0000055501 and ph0000055502x', ['0000055501', '0000055502']],
    ['Landline 020-5550-1234 or (020) 55501234.', ['5550', '55501234']],
    ['Seen 03/11/2026 00000 55501', ['55501', '03/11']],
    ['Tooth 36. 00000 55501 is the number.', ['55501']],
    ['Ring nine eight seven six five four three two one zero.', ['seven six five']],
    ['Ring double nine, eight seven six, five four three two one.', ['eight seven']],
    ['Ring 00000 five five five zero one.', ['five five', '00000']],
    ['Ring zero zero zero zero zero 55501.', ['55501']],
  ]
  for (const [note, secrets] of cases) it(note, () => expect(hidden(note, ...secrets)).toBe('hidden'))
  it('keeps tooth 36 when a phone follows a full stop', () => {
    expect(redactByCode('Tooth 36. 00000 55501 is the number.').text).toContain('Tooth 36.')
  })
})

describe('attack: emails', () => {
  const cases: Array<[string, string[]]> = [
    ['Mail ASHA.T@EXAMPLE.COM now.', ['asha.t', 'example']],
    ['Mail asha.t at example dot com now.', ['asha.t', 'example']],
    ['Mail asha.t[at]example[dot]com now.', ['asha.t']],
    ['Mail asha.t (at) example (dot) co (dot) in now.', ['asha.t']],
    ['Mail asha.t @ example.com now.', ['asha.t']],
    ['Mail asha@example now.', ['asha@']],
    ['Insta @asha_testpatil is hers.', ['asha_testpatil']],
  ]
  for (const [note, secrets] of cases) it(note, () => expect(hidden(note, ...secrets)).toBe('hidden'))
})

describe('attack: dates', () => {
  const cases: Array<[string, string[]]> = [
    ['Seen 3rd Nov.', ['3rd Nov']],
    ['Seen Nov 3rd, 2026.', ['Nov 3']],
    ['Seen 03-11-26.', ['03-11']],
    ['Seen 2026/11/03.', ['11/03']],
    ['Seen 3.11.2026.', ['3.11']],
    ['Seen 12/Apr/1971.', ['Apr']],
    ['Seen third November.', ['third November']],
    ['Seen on November the third.', ['November']],
    ['Seen on the twenty-first of October.', ['twenty-first', 'October']],
    ['Born first of January nineteen sixty.', ['January', 'nineteen sixty']],
    ['Born 1st Jan two thousand and four.', ['Jan']],
    ['Came on Diwali eve.', ['Diwali']],
    ['Seen just after Holi and before Eid.', ['Holi', 'Eid']],
    ['Review in June 2026.', ['June 2026']],
    ['DOB: 12 04 1971.', ['1971']],
  ]
  for (const [note, secrets] of cases) it(note, () => expect(hidden(note, ...secrets)).toBe('hidden'))
})

describe('attack: short dates and weekdays (T12c, 20 Nov 2026, after the fresh-note runs)', () => {
  const hiddenCases: Array<[string, string[]]> = [
    ['Seen 3/11 and again on 17/11.', ['3/11', '17/11']],
    ['Seen on 17/11 for pain.', ['17/11']],
    ['Bail hearing 5/1 before the court.', ['5/1']],
    ['Came alone 3-11 for swelling.', ['3-11']],
    ['Follow up 12/3.', ['12/3']],
    ['Review on 1/2 at the clinic.', ['1/2']],
    ['Seen last Tuesday for pain.', ['last Tuesday']],
    ['Patient came on Monday for extraction.', ['Monday']],
    ['Phone 00000 22113, hearing Monday.', ['Monday']],
    ['Next Friday appointment confirmed.', ['Next Friday']],
    ['Date of payment was last Tuesday.', ['last Tuesday']],
  ]
  for (const [note, secrets] of hiddenCases) it(`hides: ${note}`, () => expect(hidden(note, ...secrets)).toBe('hidden'))

  const keptCases = [
    'Advised 1/2 tablet twice daily.',
    'Place a 3/4 crown on 36.',
    'About 2/3 of the root is exposed.',
    'Take 1/4 of the dose for 3 days.',
    'Teeth 11/12 are mobile.',
    'Teeth 17/11 are restored.',
    'Mobility 21/22 grade 2.',
    'She is free on any Friday. Seen in the morning.',
    'Monday clinic is closed for the festival.',
    'Pain every Monday after chewing.',
    'Ratio 1:2 and 3.5/4 mm.',
  ]
  for (const note of keptCases) it(`keeps: ${note}`, () => expect(kept(note)).toBe('kept'))
})

describe('attack: landmark addresses (T12c, 20 Nov 2026, after the fresh-note runs)', () => {
  const hiddenCases: Array<[string, string[]]> = [
    ['Works at the shop, near Ganesh mandir, Baramati.', ['Ganesh mandir', 'Baramati']],
    ['He stays behind bus stand, Loni.', ['bus stand', 'Loni']],
    ['Property at opp. Hanuman mandir, Sangamner.', ['Hanuman mandir', 'Sangamner']],
    ['Defendant address near water tank, Rahata, phone below.', ['water tank', 'Rahata']],
    ['Lives behind ZP school, near canal, Sangamner.', ['ZP school', 'canal', 'Sangamner']],
    ['Police station Shirdi road, near Sai baba chowk.', ['Sai baba chowk']],
    ['She stays Flat 4, near railway crossing, Kopargaon with parents.', ['Flat 4', 'railway crossing', 'Kopargaon']],
    ['Plot 5, next to petrol pump.', ['Plot 5', 'petrol pump']],
    ['Clinic is beside City Hospital.', ['City Hospital']],
    ['Her office is in front of the bus stand.', ['bus stand']],
  ]
  for (const [note, secrets] of hiddenCases) it(`hides: ${note}`, () => expect(hidden(note, ...secrets)).toBe('hidden'))

  // Clinical phrases with the same cue words must not be damaged.
  const keptCases = [
    'Swelling near 36 since 3 days.',
    'Pain near the ear on chewing.',
    'Tenderness near the temple joint.',
    'Radiolucency behind the lower molar.',
    'Caries next to the bridge abutment.',
    'Calculus beside the crown margin.',
    'Sinus tract opposite the extraction site.',
    'Gingival recession close to the nerve exit.',
    'Fracture line near the stand-alone implant.',
    'Nerve block 2 ml given.',
    'Resorption near signal intensity change on CBCT.',
  ]
  for (const note of keptCases) it(`keeps: ${note}`, () => expect(kept(note)).toBe('kept'))
})

describe('attack: names', () => {
  const cases: Array<[string, string[]]> = [
    ['Patient: Arvind  Testwala. Pain in 36.', ['Arvind', 'Testwala']],
    ['Pt. Arvind Testwala c/o pain in 36.', ['Arvind', 'Testwala']],
    ['Patient Arvind Testwala came with pain.', ['Arvind', 'Testwala']],
    ['Name - Arvind Testwala, 45/M.', ['Arvind', 'Testwala']],
    ['NAME: ARVIND TESTWALA. PAIN IN 36.', ['ARVIND', 'TESTWALA']],
    ['patient name: arvind testwala, pain in 36.', ['arvind', 'testwala']],
    ['Mr.Ramesh Testpatil has pain.', ['Ramesh', 'Testpatil']],
    ['Patient: R.K. Testpatil. Pain.', ['Testpatil']],
    ['Patient: A. K. Testsharma. Pain.', ['Testsharma']],
    ['Smt. Asha Testpatil and Shri Ramesh Testpatil came.', ['Asha', 'Ramesh', 'Testpatil']],
    ['Shrimati Asha Testpatil came. Sau. Lata Testmore also.', ['Asha', 'Testpatil', 'Lata', 'Testmore']],
    ['Patient: Ramesh Testpatil. Rameshbhai says pain. Rameshji agrees.', ['Ramesh']],
    ['Patient: Asha Testpatil, s/o Ganpat Testpatil.', ['Ganpat', 'Testpatil']],
    ['Patient: Asha Testpatil. Her pati Ramesh and beti Meena came.', ['Ramesh', 'Meena']],
    ['Patient: Asha Testpatil. Aai Sunanda brought her. Mavshi Lata paid.', ['Sunanda', 'Lata']],
    ['Asha Testpatil, 36, has pain in 46.', ['Asha', 'Testpatil']],
    ['Asha Testpatil 36/F. Pain in 46.', ['Asha', 'Testpatil']],
    ['Patient: Sunita Testdeshpande. Thank you for seeing Sunitha Testdeshpande.', ['Sunitha', 'Testdeshpande']],
    ['Mr Sunny Testgill. Our system has him as Suny Testgil.', ['Suny', 'Testgil']],
    ['Mrs Priyanka Testchatterjee, though the old card reads Priyanka Testchaterji.', ['Testchaterji']],
    ['Patient: Asha Testpatil. Seen with Asha-Testpatil and ASHA\nTESTPATIL.', ['Asha', 'TESTPATIL']],
    ['Patient name: रमेश पाटील. Pain in 36. रमेश पाटील came.', ['रमेश', 'पाटील']],
  ]
  for (const [note, secrets] of cases) it(note, () => expect(hidden(note, ...secrets)).toBe('hidden'))
})

describe('attack: IDs, addresses, organisations', () => {
  const cases: Array<[string, string[]]> = [
    ['Patient ID: SR-0006. Pain.', ['SR-0006']],
    ['record no. SR-0012 on file.', ['0012']],
    ['Police report number MOCK/0019/26 filed.', ['0019']],
    ['Insurance member number TEST-000021.', ['000021']],
    ['Aadhaar 0000 0000 0012 given.', ['0012']],
    ['PAN ABCDE1234F given.', ['ABCDE1234F']],
    ['Address: 12 Placeholder Road, Testnagar 000008. Phone later.', ['Placeholder', 'Testnagar', '000008']],
    ['She lives at Flat 4, Sample Towers, Mockville 000013 and would like early slots.', ['Sample', 'Mockville', '000013']],
    ['Address: 17 Dummy Lane, Samplepur.', ['Dummy', 'Samplepur']],
    ['She travels from Testnagar weekly.', ['Testnagar']],
    ['He attends Example Public School, Fakepur.', ['Example', 'Fakepur']],
    ['Husband works at Dummy Steel Works in Fakepur.', ['Dummy', 'Fakepur']],
    ['Her obstetrician is at Placeholder Maternity Home.', ['Placeholder']],
    ['Son is with Example Courier Services now.', ['Example']],
    ['They stay on Sample Chowk, Mockabad.', ['Sample Chowk', 'Mockabad']],
    ['Fell at 26 Mock Mill Road in Old Testnagar.', ['Mock Mill', 'Testnagar']],
  ]
  for (const [note, secrets] of cases) it(note, () => expect(hidden(note, ...secrets)).toBe('hidden'))
})

describe('attack: clinical text must not be damaged', () => {
  const cases = [
    'Pockets of 6 mm at 16, 17, 26 and 27 with bleeding on probing.',
    'Teeth 31 32 41 42 are mobile. 36 37 46 47 restored.',
    '11 may need a crown. 21 may need RCT in March if pain persists.',
    'Files 15, 20, 25 used. Working length 21 mm. BP 120/80.',
    'Class II caries on 36. Grade III mobility. Ellis Class II fracture of 11.',
    'Age 36 years. 14 weeks pregnant. Pain for 3 days. Ibuprofen 400 mg.',
    'Placed in 2021. Under my care since 2019. Stent in 2022.',
    'IOPA and OPG attached. CBCT taken. RCT advised. Master cone fitted.',
    'Sinus tract over 46. Lingual nerve close. Palatal swelling. Panoramic view taken.',
    'Missing 11 following extraction last year. Third time this year.',
    'She is free on any Friday. Seen in the morning.',
  ]
  for (const note of cases) it(note, () => expect(kept(note)).toBe('kept'))
})

describe('attack: send guard', () => {
  const map = () => {
    const m = new TokenMap()
    m.assign('PATIENT', 'Lata Testmore')
    m.assign('RELATIVE', 'Amit')
    m.assign('PHONE', '+91 00000 55501')
    return m
  }
  const blocked = (text: string, options = {}) => !checkSend(text, map(), options).ok
  it('blocks glued and odd forms of a hidden name', () => {
    for (const t of ['Latas tooth', 'LataTestmore came', 'MrsLata came', 'L a t a T e s t m o r e', 'lata-testmore', 'Amitbhai came', 'AMIT']) {
      expect(blocked(t), t).toBe(true)
    }
  })
  it('blocks the hidden phone in other shapes', () => {
    for (const t of ['0000055501', '00000-55501', '0 0 0 0 0 5 5 5 0 1', '91 00000 55501', 'ph00000 55501']) expect(blocked(t), t).toBe(true)
  })
  it('blocks a phone in words and an obfuscated email', () => {
    expect(blocked('ring nine eight seven six five four three two one zero')).toBe(true)
    expect(blocked('mail asha at example dot com')).toBe(true)
  })
  it('known clinical words that contain a short name do not block, when the word list is passed in', () => {
    const safeWords = ['palatal', 'amitriptyline']
    expect(blocked('Palatal swelling. On amitriptyline.', { safeWords })).toBe(false)
    expect(blocked('Palatal swelling. Lata is here.', { safeWords })).toBe(true)
    expect(blocked('Lata', { safeWords: ['lata'] })).toBe(true) // the value itself can never be a safe word
  })
  it('a word the dentist marked "not an identifier" stops blocking; the name itself still blocks', () => {
    expect(blocked('On amitriptyline 10 mg.')).toBe(true) // "Amit" is hidden, and amit-riptyline holds it
    expect(blocked('On amitriptyline 10 mg.', { allowed: ['amitriptyline'] })).toBe(false)
    expect(blocked('On amitriptyline 10 mg. Amit agrees.', { allowed: ['amitriptyline'] })).toBe(true)
  })
  it('a lower-case given name left alone is blocked; an everyday word is not', () => {
    expect(blocked('lata says it hurts')).toBe(true)
    expect(blocked('testmore family')).toBe(true)
    const m = new TokenMap()
    m.assign('PERSON', 'Hope Sampledas')
    expect(checkSend('We hope to save 33. No hopes for 31.', m).ok).toBe(true)
    expect(checkSend('Mrs Hope rang.', m).ok).toBe(false)
    expect(checkSend('mrs sampledas rang.', m).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// NOT FIXED. `it.fails` means: this check fails today, on purpose and in the open.
// If one of these starts passing, Vitest reports it, and it can move up.
// Gemini Nano (T4), the amber underline (T5) and the dentist's own check are the cover for these.
// ---------------------------------------------------------------------------
describe('known gaps: the code redactor misses these', () => {
  it.fails('a single nickname with no title, header or cue word', () => {
    expect(hidden('Bunty came in again with pain in 48.', 'Bunty')).toBe('hidden')
  })
  it.fails('a name typed without capitals after "Patient:" (it works after "Patient name:")', () => {
    expect(hidden('patient: arvind testwala, pain in 36.', 'arvind', 'testwala')).toBe('hidden')
  })
  it.fails('a name in Devanagari with no "name:" label', () => {
    expect(hidden('रमेश पाटील came with pain in 36.', 'रमेश')).toBe('hidden')
  })
  it.fails('a month and a day that could be a tooth number, with no year', () => {
    expect(hidden('Seen Nov 26 for review.', 'Nov 26')).toBe('hidden')
  })
  it.fails('"the 3rd" used as a date (the weekday half was fixed on 20 Nov 2026)', () => {
    expect(hidden('Review on the 3rd.', 'the 3rd')).toBe('hidden')
  })
  it.fails('a 7-digit landline number', () => {
    expect(hidden('Landline 555 0142.', '555 0142')).toBe('hidden')
  })
  it.fails('a place named with no cue word', () => {
    expect(hidden('The Testnagar bus hit him.', 'Testnagar')).toBe('hidden')
  })
})

describe('known gaps: the send guard lets these through', () => {
  const map = () => {
    const m = new TokenMap()
    m.assign('RELATIVE', 'Ramesh')
    m.assign('PERSON', 'Rose Testbaker')
    return m
  }
  it.fails('look-alike letters from another alphabet (Cyrillic "а" inside Ramesh)', () => {
    expect(checkSend('Rаmesh is here.', map()).ok).toBe(false)
  })
  it.fails('an everyday-word name alone in lower case ("rose")', () => {
    expect(checkSend('rose says it hurts.', map()).ok).toBe(false)
  })
  it.fails('a name the redactor never saw (the guard only knows hidden values and patterns)', () => {
    expect(checkSend('Bunty came in again.', map()).ok).toBe(false)
  })
})

describe('known side effects: clinical text hidden by mistake (safe side; the dentist can un-hide)', () => {
  it.fails('a row of single-digit probing depths looks like a phone number', () => {
    expect(kept('Probing depths 3 2 3 4 3 3 2 3 4.')).toBe('kept')
  })
  it.fails('four file sizes with no commas look like a phone number', () => {
    expect(kept('Files 15 20 25 30 used.')).toBe('kept')
  })
  it.fails('a capitalised word after "Patient:" is taken as the name', () => {
    expect(kept('Patient: Nervous, needs short visits.')).toBe('kept')
  })
})
