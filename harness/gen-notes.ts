// H1: note generator for the leak-test harness (HARNESS_PLAN.md).
// Run from the repo root:  node harness/gen-notes.ts          (writes data/harness/*.json)
//
// Everything here is MADE UP. Names are common Indian first names and surnames put together at random; phones start
// 00000; PAN/GSTIN/account/Aadhaar numbers are shape-valid but fake (Aadhaar only ever starts with 0 or 1); emails use
// the reserved example.com/.org/.net domains. No scraped, social-media or real-patient text is used or may be added.
//
// A note is built from SEGMENTS: plain text and tagged identifiers. Transforms (lower case, dropped punctuation,
// abbreviations, typos) work on segments, so an identifier's value is always exactly what is in the text.
// Generated notes are more regular than real ones: report them separately from hand-written notes, never as "real-world".
//
// Split (H2): per profession, notes 0-199 are TUNE, notes 200-299 are LOCKED. Nobody tunes on the locked set's misses.
// The locked files are sealed with a SHA-256 in data/harness/SEAL.json; this script refuses to overwrite them.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const SEED = 20261121
const PER_PACK = 300
const TUNE = 200

type Tag = { type: string; value: string }
type Seg = string | Tag
const T = (type: string, value: string): Tag => ({ type, value })

// ---------- random ----------
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
class Gen {
  rnd: () => number
  constructor(seed: number) {
    this.rnd = mulberry32(seed)
  }
  int(lo: number, hi: number) {
    return lo + Math.floor(this.rnd() * (hi - lo + 1))
  }
  pick<X>(a: readonly X[]): X {
    return a[Math.floor(this.rnd() * a.length)]
  }
  maybe(p: number) {
    return this.rnd() < p
  }
  digits(n: number) {
    let s = ''
    for (let i = 0; i < n; i++) s += this.int(0, 9)
    return s
  }
  letters(n: number) {
    let s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(65 + this.int(0, 25))
    return s
  }
}

// ---------- pools (the video demo names Sathaye, Vasanti, Meghnad, Bhide, Ratnakar, Waghmare, Lokhande, Ketaki, Hemant, Nandini are NOT used) ----------
const FIRST_M = ['Rohan', 'Amit', 'Sandeep', 'Vikram', 'Sunil', 'Rajesh', 'Anil', 'Prakash', 'Ganesh', 'Nitin', 'Suresh', 'Mahesh', 'Deepak', 'Ashok', 'Santosh', 'Ramesh', 'Kiran', 'Yogesh', 'Pravin', 'Sachin', 'Tushar', 'Omkar', 'Harshad', 'Imran', 'Faisal', 'Arjun', 'Karthik', 'Manoj', 'Vinod', 'Dinesh', 'Aniket', 'Siddharth']
const FIRST_F = ['Sunita', 'Anita', 'Priya', 'Pooja', 'Neha', 'Shweta', 'Kavita', 'Rupali', 'Swati', 'Savita', 'Madhuri', 'Archana', 'Smita', 'Nikita', 'Rekha', 'Sheetal', 'Jyoti', 'Seema', 'Mansi', 'Aarti', 'Sneha', 'Shilpa', 'Pallavi', 'Asha', 'Meera', 'Farida', 'Shabana', 'Lata', 'Usha', 'Manisha', 'Divya', 'Komal']
const SURNAMES = ['Patil', 'Shinde', 'Deshmukh', 'Jadhav', 'Pawar', 'More', 'Gaikwad', 'Joshi', 'Sharma', 'Shaikh', 'Mehta', 'Shah', 'Iyer', 'Nair', 'Reddy', 'Singh', 'Gupta', 'Verma', 'Chavan', 'Bhosale', 'Kale', 'Pande', 'Thorat', 'Kamble', 'Nikam', 'Salunke', 'Mane', 'Kadam', 'Gokhale', 'Phadke', 'Ansari', 'Qureshi', 'Desai', 'Rane', 'Sawant', 'Dalvi', 'Bagade', 'Ghule', 'Dhumal', 'Kulkarni', 'Jagtap', 'Tambe']
const NICK = ['Pappu', 'Bunty', 'Chintu', 'Rinku', 'Guddu', 'Bittu', 'Monu', 'Sonu', 'Raju', 'Babloo', 'Tinku', 'Golu']
const NICK_SUFFIX = ['bhai', 'bhau', 'tai', 'mama', 'kaka', 'anna', '']
const RELATION_WORDS = ['wife', 'husband', 'son', 'daughter', 'mother', 'father', 'brother', 'sister', 'uncle', 'aai', 'baba', 'bhau', 'tai']
const TOWNS = ['Baramati', 'Indapur', 'Satara', 'Pune', 'Karad', 'Solapur', 'Sangamner', 'Nashik', 'Kolhapur', 'Latur', 'Phaltan', 'Daund', 'Jejuri', 'Ahmednagar']
const AREAS = ['Shahu Nagar', 'Gandhi Chowk', 'MIDC Road', 'Station Road', 'Kothrud', 'Hadapsar', 'Camp', 'Sadashiv Peth', 'Tilak Road', 'Market Yard', 'Laxmi Nagar', 'Ram Mandir Road']
const BUILDINGS = ['Shivam Residency', 'Ganesh Apartments', 'Sai Kripa', 'Om Sai Heights', 'Parijat Society', 'Laxmi Niwas', 'Kaveri Towers', 'Gajanan Colony', 'Vaibhav Park', 'Anand Nagar']
const LANDMARKS = ['Ganesh mandir', 'bus stand', 'Zilla Parishad school', 'Shivaji statue', 'water tank', 'petrol pump', 'old post office', 'Hanuman mandir', 'sabzi mandi', 'ST depot']
const SHOP_A = ['Sai', 'Ganesh', 'Shree', 'Gajanan', 'Om', 'Bharat', 'Vijay', 'Laxmi', 'Annapurna', 'Jai Hind', 'Maruti', 'Krishna']
const SHOP_B = ['Traders', 'Medical', 'Agro', 'Textiles', 'Enterprises', 'Electricals', 'Hardware', 'Stores', 'Motors', 'Bakery', 'Dairy', 'Constructions']
const SCHOOLS = ['Vidya Mandir School', 'New English School', 'Zilla Parishad School', 'St. Joseph High School', 'Saraswati Vidyalaya', 'Gyan Prabodhini']
const BANKS = ['Janata Sahakari Bank', 'Nagrik Bank', 'Gramin Bank', 'Mahila Sahakari Bank', 'Shivneri Bank']
const CLINICS = ['Dr. Rao\'s clinic', 'Care Dental Clinic', 'Smile Point', 'City Dental Centre', 'Ortho Plus clinic']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ---------- identifier makers; each returns a Tag ----------
interface Person { first: string; last: string; female: boolean; nick: string }
function person(g: Gen, female?: boolean, last?: string): Person {
  const f = female ?? g.maybe(0.45)
  return { first: g.pick(f ? FIRST_F : FIRST_M), last: last ?? g.pick(SURNAMES), female: f, nick: g.pick(NICK) + ' ' + g.pick(NICK_SUFFIX) }
}
const honorific = (p: Person, g: Gen) => (p.female ? g.pick(['Mrs', 'Ms', 'Smt.', 'Mrs']) : g.pick(['Mr', 'Mr', 'Shri', 'Master'])) as string
type NameForm = 'full' | 'honFull' | 'first' | 'honLast' | 'nick' | 'initials' | 'lastFirst'
function nameTag(g: Gen, p: Person, type: string, form: NameForm): Tag {
  const hon = honorific(p, g)
  const v =
    form === 'full' ? `${p.first} ${p.last}`
    : form === 'honFull' ? `${hon} ${p.first} ${p.last}`
    : form === 'first' ? p.first
    : form === 'honLast' ? `${hon} ${p.last}`
    : form === 'nick' ? p.nick.trim()
    : form === 'initials' ? `${p.first[0]}. ${g.pick(['K', 'S', 'P', 'R', 'D'])}. ${p.last}`
    : `${p.last}, ${p.first}`
  return T(type, v)
}
const anyForm = (g: Gen): NameForm => g.pick(['full', 'full', 'full', 'honFull', 'honLast', 'first', 'nick', 'initials', 'lastFirst'] as NameForm[])
function phone(g: Gen): Tag {
  const d = g.digits(5)
  const f = g.int(0, 6)
  const v = f === 0 ? `00000 ${d}` : f === 1 ? `00000-${d}` : f === 2 ? `00000${d}` : f === 3 ? `+91 00000 ${d}` : f === 4 ? `(00000) ${d}` : f === 5 ? `0000 0${d}` : `+91-00000-${d}`
  return T('phone', v)
}
function email(g: Gen, p: Person): Tag {
  const l = p.first.toLowerCase()
  const v = g.pick([`${l}.${p.last.toLowerCase()}@example.org`, `${l}${g.int(10, 99)}@example.com`, `${p.last.toLowerCase()}.${l[0]}@example.net`])
  return T('email', v)
}
function date(g: Gen, year = 2026, mon0 = 7, mon1 = 11): Tag {
  const m = g.int(mon0, mon1)
  const d = g.int(1, 28)
  const dd = String(d).padStart(2, '0')
  const mm = String(m + 1).padStart(2, '0')
  const f = g.int(0, 8)
  const ord = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'
  const v =
    f === 0 ? `${dd}/${mm}/${year}` : f === 1 ? `${d} ${MONTHS[m].slice(0, 3)} ${year}` : f === 2 ? `${d}${ord} ${MONTHS[m]}` : f === 3 ? `${d}/${m + 1}`
    : f === 4 ? `${dd}-${mm}-${String(year).slice(2)}` : f === 5 ? `${d}.${m + 1}.${year}` : f === 6 ? `${MONTHS[m]} ${d}` : f === 7 ? `${d} ${MONTHS[m]} ${year}` : `${dd}/${mm}/${year}`
  return T('date', v)
}
// A weekday counts as a date only after a cue ("last Tuesday", "on Monday"): the phrase is returned whole with its cue.
function cueWeekday(g: Gen): Tag {
  return T('date', g.pick([`last ${g.pick(WEEKDAYS)}`, `on ${g.pick(WEEKDAYS)}`, `this ${g.pick(WEEKDAYS)}`]))
}
function dob(g: Gen): Tag {
  const y = g.int(1948, 2016)
  const m = g.int(0, 11)
  const d = g.int(1, 28)
  const f = g.int(0, 2)
  return T('dob', f === 0 ? `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}` : f === 1 ? `${d} ${MONTHS[m]} ${y}` : `${d}-${m + 1}-${y}`)
}
function address(g: Gen): Tag {
  const town = g.pick(TOWNS)
  const f = g.int(0, 5)
  const v =
    f === 0 ? `Flat ${g.int(1, 40)}, ${g.pick(BUILDINGS)}, ${town}`
    : f === 1 ? `near ${g.pick(LANDMARKS)}, ${town}`
    : f === 2 ? `behind ${g.pick(LANDMARKS)}, ${town}`
    : f === 3 ? `H.No. ${g.int(1, 99)}, ${g.pick(AREAS)}, ${town}`
    : f === 4 ? `opp. ${g.pick(LANDMARKS)}, ${g.pick(AREAS)}, ${town}`
    : `${g.pick(BUILDINGS)}, ${g.pick(AREAS)}, ${town}`
  return T('address', v)
}
const shop = (g: Gen) => T('organization', `${g.pick(SHOP_A)} ${g.pick(SHOP_B)}`)
const school = (g: Gen) => T('organization', g.pick(SCHOOLS))
const bank = (g: Gen) => T('organization', g.pick(BANKS))
const clinic = (g: Gen) => T('organization', g.pick(CLINICS))
const indian = (n: number) => {
  const s = String(n)
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}
const amount = (g: Gen) => `Rs ${indian(g.int(12, 980) * 500)}`

// CA ids (fake, shape-valid)
const pan = (g: Gen) => T('record_id', `ZZZ${g.pick(['P', 'C', 'F', 'H'])}${g.letters(1)}0${g.digits(3)}${g.letters(1)}`)
const gstin = (g: Gen) => T('record_id', `27ZZZ${g.pick(['P', 'C', 'F'])}${g.letters(1)}0${g.digits(3)}${g.letters(1)}1Z${g.pick(['5', 'A', 'K', '9'])}`)
const aadhaar = (g: Gen) => {
  const d = g.pick(['0', '1']) + g.digits(11)
  return T('record_id', g.maybe(0.7) ? `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}` : d)
}
const account = (g: Gen) => T('record_id', '000' + g.digits(g.int(8, 12)))
const ifsc = (g: Gen) => T('record_id', `TEST0${g.digits(6)}`)
const tan = (g: Gen) => T('record_id', `PUNE${g.digits(5)}${g.letters(1)}`)
const udin = (g: Gen) => T('record_id', `26${g.digits(6)}${g.letters(8)}${g.digits(2)}`)
// Law ids
const caseNo = (g: Gen) => {
  const n = g.int(11, 998)
  return T('record_id', g.pick([`Civil Suit ${n} of 2026`, `Crime No. ${n}/2026`, `SCC ${n}/2026`, `R.C.S. ${n}/2026`, `Bail Application No. ${n}/2026`, `FIR No. 0${n}/2026`, `Cr. Case ${n}/2026`]))
}
const chequeNo = (g: Gen) => T('record_id', `cheque no. 000${g.digits(3)}`)
const cnr = (g: Gen) => T('record_id', `MHPU01${g.digits(6)}2026`)
const enrol = (g: Gen) => T('record_id', `MAH/${g.int(1000, 9999)}/${g.int(2008, 2022)}`)
const opdNo = (g: Gen) => T('record_id', g.pick([`SR-${g.digits(4)}`, `OPD ${g.digits(4)}`, `file no. ${g.int(10, 899)}/2026`, `MRN ${g.digits(7)}`]))

// ---------- notes ----------
interface Built { segs: Seg[]; keep: string[] }
type Template = (g: Gen) => Built
const B = (segs: Seg[], keep: string[] = []): Built => ({ segs, keep })
const join = (...parts: Built[]): Built => ({ segs: parts.flatMap((p) => p.segs), keep: parts.flatMap((p) => p.keep) })
const text = (s: string): Built => B([s])
const age = (g: Gen) => g.int(6, 84)

const teeth = ['11', '16', '21', '26', '36', '37', '46', '47', '25', '14', '24', '45']
const toothFindings = [
  'deep distal caries with lingering pain to cold for one week',
  'vertical fracture, unrestorable by my assessment',
  'swelling and a draining sinus for three days',
  'root filling done elsewhere, dull ache on biting for two weeks',
  'pericoronitis, partly erupted, recurrent episodes',
  'mobile after a fall, tender to percussion',
  'failed crown, recurrent decay at the margin',
  'sensitive to hot and cold, no spontaneous pain',
]
const medical = ['hypertension on amlodipine', 'diabetic, last HbA1c acceptable', 'asthma, uses a reliever inhaler', 'thyroid, on levothyroxine', 'no known allergies', 'on a blood thinner']

// ----- dental fragments -----
const DENTAL_OPEN: Template[] = [
  (g) => { const p = person(g); return B(['Patient: ', nameTag(g, p, 'name', 'full'), '. Phone: ', phone(g), '. Seen on ', date(g), '. ']) },
  (g) => { const p = person(g); return B(['Re: ', nameTag(g, p, 'name', 'honFull'), `, ${age(g)} years. `]) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'full'), ' (', phone(g), ') came on ', date(g), ' with ']) },
  (g) => { const p = person(g); return B(['Dear colleague, thank you for seeing ', nameTag(g, p, 'name', 'honFull'), ` (${age(g)}), who attended on `, date(g), ' with ']) },
  (g) => { const p = person(g); return B(['Kindly see ', nameTag(g, p, 'name', 'honFull'), ', born ', dob(g), ', for ']) },
  (g) => { const p = person(g); return B(['OPD ', opdNo(g), ' - ', nameTag(g, p, 'name', 'full'), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'nick'), ' came today, ', date(g), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'lastFirst'), '; DOB ', dob(g), '; ph ', phone(g), '. ']) },
  (g) => { const p = person(g); return B(['Pt ', nameTag(g, p, 'name', 'initials'), ' seen ', cueWeekday(g), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'first'), ' ', p.last, ' came to the clinic. ']) },
]
const DENTAL_BODY: Template[] = [
  (g) => text(`Tooth ${g.pick(teeth)}: ${g.pick(toothFindings)}. `),
  (g) => text(`Concerns tooth ${g.pick(teeth)}, ${g.pick(toothFindings)}. `),
  (g) => text(`Tooth ${g.pick(teeth)} and ${g.pick(teeth)}: ${g.pick(toothFindings)}. `),
  (g) => text(`IOPA taken, ${g.pick(['periapical radiolucency seen', 'no periapical change', 'widened ligament space'])}. `),
  (g) => text(`Medical: ${g.pick(medical)}. `),
  (g) => { const p = person(g); return B([`The patient's ${g.pick(['wife', 'husband', 'son', 'daughter', 'mother', 'father', 'brother'])} `, nameTag(g, p, 'relative', anyForm(g)), ` ${g.pick(['came with', 'will bring the X-ray for', 'accompanied'])} the patient. `]) },
  (g) => { const p = person(g); return B([`${g.pick(['aai', 'baba', 'bhau', 'tai'])} `, nameTag(g, p, 'relative', 'first'), ' was with the patient. ']) },
  (g) => B(['Lives at ', address(g), '. ']),
  (g) => B([g.pick(['Works at ', 'Employed at ', 'Runs ']), shop(g), '. ']),
  (g) => B(['School: ', school(g), '. ']),
  (g) => { const p = person(g); return B(['Reach by email ', email(g, p), '. ']) },
  (g) => B(['Previously treated at ', clinic(g), '. ']),
  (g) => B(['Next visit ', date(g), '. ']),
  (g) => B(['Appointment ', cueWeekday(g), ' if free. ']),
]
const DENTAL_CLOSE: Template[] = [
  () => text('Please evaluate and manage.'),
  () => text('Kindly advise.'),
  () => text('Regards'),
  () => text('Thanks for your opinion.'),
  () => text('Please see and report back.'),
]

// ----- CA fragments -----
const CA_OPEN: Template[] = [
  (g) => { const p = person(g); return B(['Client: ', nameTag(g, p, 'name', 'full'), '. ']) },
  (g) => { const p = person(g); return B(['Assessee ', nameTag(g, p, 'name', 'honFull'), ' (PAN ', pan(g), '). ']) },
  (g) => B([shop(g), ' (GSTIN ', gstin(g), '). ']),
  (g) => { const p = person(g); return B(['Re: ', nameTag(g, p, 'name', 'honLast'), ', proprietor of ', shop(g), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'full'), ' called on ', date(g), ' (', phone(g), '). ']) },
  (g) => { const p = person(g); return B(['File: ', nameTag(g, p, 'name', 'lastFirst'), ', PAN ', pan(g), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'nick'), ' dropped his papers on ', date(g), '. ']) },
]
const CA_BODY: Template[] = [
  (g) => { const a = amount(g); const sec = g.pick(['143(1)', '148', '139(9)', '156']); return B([`Notice under section ${sec} for AY 2025-26 shows a mismatch of ${a} in turnover. `], [a, sec]) },
  (g) => { const a = amount(g); const b = amount(g); return B([`Interest income of ${a} on fixed deposits; TDS under section 194A of ${b} was deducted. Form 26AS differs. `], [a, '194A', b, '26AS']) },
  (g) => B(['Response due ', date(g, 2026, 10, 11), '. ']),
  (g) => { const a = amount(g); return B([`GSTR-3B for the quarter shows tax of ${a}. `], [a, 'GSTR-3B']) },
  (g) => B(['Savings account ', account(g), ' at ', bank(g), ', IFSC ', ifsc(g), '. ']),
  (g) => B(['Aadhaar ', aadhaar(g), ' on file. ']),
  (g) => B(['TAN ', tan(g), ' for the deductor. ']),
  (g) => B(['UDIN ', udin(g), ' pending. ']),
  (g) => { const p = person(g); return B([`The client's ${g.pick(['son', 'brother', 'wife', 'husband', 'partner'])} `, nameTag(g, p, 'relative', anyForm(g)), ' is a joint holder. ']) },
  (g) => B(['Office at ', address(g), '. ']),
  (g) => { const p = person(g); return B(['Send the working to ', email(g, p), ' or call ', phone(g), '. ']) },
  (g) => { const a = amount(g); return B([`Advance tax paid ${a} on `, date(g), '. '], [a]) },
  (g) => { const p = person(g); return B(['Accountant ', nameTag(g, p, 'relative', 'honFull'), ' sent the books. ']) },
  (g) => B(['Born ', dob(g), '. ']),
]
const CA_CLOSE: Template[] = [
  () => text('Please review the working and prepare a summary.'),
  () => text('Please summarise what is pending.'),
  () => text('Prepare a short note of the figures.'),
  () => text('Regards'),
  () => text('Please list the documents still needed.'),
]

// ----- law fragments -----
const LAW_OPEN: Template[] = [
  (g) => { const p = person(g); return B(['Client: ', nameTag(g, p, 'name', 'full'), '. Phone: ', phone(g), '. ']) },
  (g) => { const p = person(g); const q = person(g); return B(['Matter: ', nameTag(g, p, 'name', 'full'), ' v/s ', nameTag(g, q, 'relative', 'full'), '. ']) },
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'nick'), ' (client) called on ', date(g), '. ']) },
  (g) => { const p = person(g); return B(['Re: ', nameTag(g, p, 'name', 'honFull'), ', ', caseNo(g), '. ']) },
  (g) => B([shop(g), ' (client) has a dispute. ']),
  (g) => { const p = person(g); return B([nameTag(g, p, 'name', 'lastFirst'), ' (', phone(g), ') met me on ', date(g), '. ']) },
]
const LAW_BODY: Template[] = [
  (g) => { const a = amount(g); return B([`Complaint under section 138 of the Negotiable Instruments Act, `, chequeNo(g), `, ${a}. `], [a, 'section 138']) },
  (g) => B([caseNo(g), ' is pending before the court at ', g.pick(TOWNS), '. ']),
  (g) => B(['Next hearing ', date(g, 2026, 10, 11), '. ']),
  (g) => { const a = amount(g); return B([`Settlement discussed at `, T('amount', a), '. '], []) },
  (g) => { const p = person(g); return B([`The ${g.pick(['accused', 'defendant', 'opposite party', 'complainant'])} `, nameTag(g, p, 'relative', anyForm(g)), ' denies the claim. ']) },
  (g) => { const p = person(g); return B(['Witness ', nameTag(g, p, 'relative', 'honFull'), ' saw it. ']) },
  (g) => { const p = person(g); return B([`The client's ${g.pick(['brother', 'wife', 'husband', 'father', 'son'])} `, nameTag(g, p, 'relative', 'first'), ' was with the client. ']) },
  (g) => B(['Incident at ', address(g), ', ', g.pick(['Baramati', 'Satara', 'Pune', 'Karad']), ' police station. ']),
  (g) => B(['FIR registered on ', date(g), '. ']),
  (g) => B(['CNR ', cnr(g), '. ']),
  (g) => { const p = person(g); return B(['Opposite counsel ', nameTag(g, p, 'relative', 'honFull'), ' (enrolment ', enrol(g), ') asked for time. ']) },
  (g) => { const p = person(g); return B(['Client email ', email(g, p), '. ']) },
  (g) => { const a = amount(g); return B([`Claim is for ${a} with interest. `], [a]) },
  (g) => B(['Cheque dishonoured on ', date(g), '. ']),
  (g) => B(['Notice served at ', address(g), '. ']),
  (g) => B(['Born ', dob(g), '. ']),
]
const LAW_CLOSE: Template[] = [
  () => text('Please summarise the position for the senior.'),
  () => text('Prepare a short chronology.'),
  () => text('Kindly list the pending steps.'),
  () => text('Regards'),
  () => text('Please note the dates.'),
]

const PACKS: Record<string, { open: Template[]; body: Template[]; close: Template[] }> = {
  dental: { open: DENTAL_OPEN, body: DENTAL_BODY, close: DENTAL_CLOSE },
  ca: { open: CA_OPEN, body: CA_BODY, close: CA_CLOSE },
  law: { open: LAW_OPEN, body: LAW_BODY, close: LAW_CLOSE },
}

// ---------- mess transforms ----------
const ABBREV: [RegExp, string][] = [[/\bPlease\b/g, 'Pls'], [/\bpatient\b/gi, 'pt'], [/\btooth\b/g, 'tth'], [/\bnumber\b/g, 'no.'], [/\bregarding\b/g, 're'], [/\bbecause\b/g, 'coz'], [/\band\b/g, '&']]
function typo(s: string, g: Gen): string {
  // swap two adjacent letters inside one longer ordinary word; never touches tagged identifiers (plain segments only)
  const words = s.split(' ')
  const i = g.int(0, words.length - 1)
  const w = words[i]
  if (/^[a-z]{6,}$/.test(w)) {
    const k = g.int(1, w.length - 3)
    words[i] = w.slice(0, k) + w[k + 1] + w[k] + w.slice(k + 2)
  }
  return words.join(' ')
}
function mess(segs: Seg[], g: Gen): { segs: Seg[]; style: string[] } {
  const style: string[] = []
  let out = segs
  if (g.maybe(0.35)) {
    out = out.map((s) => (typeof s === 'string' ? s.replace(/\. /g, ' ').replace(/[;]/g, '') : s))
    style.push('no-punct')
  }
  if (g.maybe(0.3)) {
    out = out.map((s) => (typeof s === 'string' ? ABBREV.reduce((acc, [re, r]) => acc.replace(re, r), s) : s))
    style.push('abbrev')
  }
  if (g.maybe(0.25)) {
    out = out.map((s) => (typeof s === 'string' ? typo(s, g) : s))
    style.push('typo')
  }
  if (g.maybe(0.3)) {
    out = out.map((s) => (typeof s === 'string' ? s.toLowerCase() : { ...s, value: s.value.toLowerCase() }))
    style.push('lower')
  }
  return { segs: out, style }
}

function buildNote(pack: string, idx: number, g: Gen) {
  const P = PACKS[pack]
  const open = g.pick(P.open)(g)
  const nBody = g.int(2, 5)
  const bodies: Built[] = []
  const used = new Set<number>()
  while (bodies.length < nBody) {
    const k = g.int(0, P.body.length - 1)
    if (used.has(k)) continue
    used.add(k)
    bodies.push(P.body[k](g))
  }
  const close = g.pick(P.close)(g)
  const built = join(open, ...bodies, close)
  const m = g.maybe(0.6) ? mess(built.segs, g) : { segs: built.segs, style: [] as string[] }
  const textOut = m.segs.map((s) => (typeof s === 'string' ? s : s.value)).join('')
  const identifiers = m.segs.filter((s): s is Tag => typeof s !== 'string').map((t) => ({ type: t.type, value: t.value }))
  const note: Record<string, unknown> = { id: `${pack.toUpperCase()}-${String(idx).padStart(3, '0')}`, text: textOut, identifiers, style: m.style }
  if (pack !== 'dental') note.keep = built.keep.filter((k) => textOut.toLowerCase().includes(k.toLowerCase()))
  return note
}

// ---------- main ----------
const root = new URL('..', import.meta.url)
const dataDir = new URL('data/harness/', root)
mkdirSync(dataDir, { recursive: true })
const sealPath = new URL('SEAL.json', dataDir)
const sealed = existsSync(sealPath)
const force = process.argv.includes('--force-locked')
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const seal: Record<string, string> = sealed ? JSON.parse(readFileSync(sealPath, 'utf8')) : {}

for (const [pi, pack] of ['dental', 'ca', 'law'].entries()) {
  const g = new Gen(SEED + pi * 7919)
  const notes = Array.from({ length: PER_PACK }, (_, i) => buildNote(pack, i, g))
  for (const n of notes) {
    const t = n.text as string
    for (const id of n.identifiers as { value: string }[]) if (!t.includes(id.value)) throw new Error(`${n.id}: value not in text: ${id.value}`)
  }
  const tune = JSON.stringify(notes.slice(0, TUNE), null, 1) + '\n'
  const locked = JSON.stringify(notes.slice(TUNE), null, 1) + '\n'
  writeFileSync(new URL(`tune-${pack}.json`, dataDir), tune)
  const lockedName = `locked-${pack}.json`
  if (sealed && seal[lockedName] && !force) {
    if (seal[lockedName] !== sha(locked)) throw new Error(`${lockedName} would change but is sealed. Not overwritten. (--force-locked only with Dr. Yatin's say-so)`)
  } else {
    writeFileSync(new URL(lockedName, dataDir), locked)
    seal[lockedName] = sha(locked)
  }
  const ids = notes.flatMap((n) => n.identifiers as { type: string }[])
  const by: Record<string, number> = {}
  for (const i of ids) by[i.type] = (by[i.type] ?? 0) + 1
  console.log(pack, notes.length, 'notes', ids.length, 'identifiers', JSON.stringify(by))
}
writeFileSync(sealPath, JSON.stringify({ note: 'SHA-256 of each sealed locked file. Do not tune on the locked set. Regenerating must reproduce these exactly.', seed: SEED, ...seal }, null, 1) + '\n')
console.log('sealed:', Object.keys(seal).join(', '))
