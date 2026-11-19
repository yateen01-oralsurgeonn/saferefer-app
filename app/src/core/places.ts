// ID numbers, addresses and organisations that plain rules can find.
// These are the "easy" ones. Free-text ones are still left to Gemini Nano (T4) and the dentist.
// Plain code, no model, no network.
import type { Found, TokenType } from './tokens'

type Span = { start: number; end: number }
const hit = (list: Span[], s: Span) => list.some((t) => t.start < s.end && s.start < t.end)

// ---------- IDs ----------

/** Clinical short forms that look like an ID ("BP-120/80", "COVID-19") and must stay. */
const NOT_AN_ID = new Set([
  'BP', 'ASA', 'COVID', 'HIV', 'INR', 'PT', 'RBS', 'FBS', 'HB', 'IOPA', 'OPG', 'CBCT', 'RCT', 'FDI', 'GIC', 'MTA',
  'PFM', 'RPD', 'FPD', 'CD', 'LA', 'TMJ', 'SPO', 'HR', 'RR', 'PR', 'RVG', 'TTP', 'BOP', 'SRP', 'CAL', 'PD',
])
// "SR-0006", "MOCK/0019/26", "TEST-000021"
const CODE_ID_RE = /(?<![\p{L}\p{N}/-])([A-Z]{2,10})[-/]\d[\dA-Z]*(?:[-/][\dA-Z]+)*(?![\p{L}\p{N}])/gu
// Indian PAN: ABCDE1234F
const PAN_RE = /(?<![\p{L}\p{N}])[A-Z]{5}\d{4}[A-Z](?![\p{L}\p{N}])/gu
// "Patient ID: 4521A", "UHID 123456", "file no. 77/2026"
const LABELLED_ID_RE =
  /(?<![\p{L}])(?:patient\s+id|uhid|mrn|aadhaar|aadhar|(?:record|file|case|reg(?:istration)?\.?|policy|member(?:ship)?|opd|ipd|card|report|ref(?:erence)?\.?|id)\s*(?:no\.?|number|id|#))\s*[:#-]?\s*((?=[A-Za-z0-9/-]*\d)[A-Za-z0-9][A-Za-z0-9/-]{3,})/giu

export function findIds(text: string, taken: Span[] = [], extraNotId: readonly string[] = []): Found[] {
  const notId = extraNotId.length ? new Set([...NOT_AN_ID, ...extraNotId.map((w) => w.toUpperCase())]) : NOT_AN_ID
  const out: Found[] = []
  const add = (start: number, value: string) => {
    const f: Found = { start, end: start + value.length, type: 'ID', value }
    if (!hit(taken, f) && !hit(out, f)) out.push(f)
  }
  for (const m of text.matchAll(CODE_ID_RE)) if (!notId.has(m[1])) add(m.index, m[0])
  for (const m of text.matchAll(PAN_RE)) add(m.index, m[0])
  for (const m of text.matchAll(LABELLED_ID_RE)) add(m.index + m[0].length - m[1].length, m[1])
  return out
}

// ---------- organisations and addresses ----------

const CAP = String.raw`\p{Lu}[\p{L}\p{M}'\u2019-]*`
/** Capitalised words that are never a place or an organisation name by themselves. */
const NOT_A_PLACE = new Set(
  [
    'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'master', 'baby', 'shri', 'smt', 'sister', 'the', 'he', 'she', 'they', 'his',
    'her', 'i', 'we', 'you', 'please', 'kindly', 'patient', 'tooth', 'teeth', 'class', 'grade', 'phone', 'mobile', 'email',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'iopa', 'opg', 'cbct', 'rct', 'ellis', 'angle', 'miller', 'la', 'ga', 'opd', 'platelets', 'platelet', 'count', 'wbc', 'rbc', 'seen', 'on', 'in', 'at',
  ],
)
const ORG_WORD =
  '(?:School|College|University|Institute|Academy|Hospital|Clinic|Home|Works|Services|Bank|Ltd|Limited|Pvt|Company|Industries|Enterprises|Corporation|Corp|Inc|Centre|Center|Labs?|Laboratory|Laboratories|Pharmacy|Chemists?|Couriers?|Motors|Stores?|Society|Temple|Church|Mosque|Mandir|Masjid|Station|Mills?|Factory|Agency|Associates|Solutions|Technologies|Systems|Foundation|Trust|Office|Insurance|Infotech|Software|Traders|Hotel|Restaurant|Garage|Dairy|Bakery|Jewellers)'
// "Placeholder High School", "Dummy Steel Works", "Example Courier Services Pvt Ltd"
const ORG_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${CAP}\s+){1,5}?${ORG_WORD}(?:\s+${ORG_WORD})*(?![\p{L}])`, 'gu')
// "works at Infosys", "employed with Tata Motors"
const EMPLOYER_CUE_RE = new RegExp(
  String.raw`(?<![\p{L}])(?:works?|working|worked|employed|job|posted|serving|serves?)\s+(?:at|for|with|in|as\s+\p{L}+\s+(?:at|for|with|in))\s+(${CAP}(?:\s+${CAP}){0,3})`,
  'gu',
)
// "attends Sunrise Academy", "studies at ...", "student of ...", "teacher at ...", "retired from ..."
const ORG_CUE_RE = new RegExp(
  String.raw`(?<![\p{L}])(?:attends?|attending|stud(?:y|ies|ying|ent)\s+(?:at|in|of)|teach(?:er|es)\s+(?:at|in)|retired\s+from|insured\s+(?:with|by))\s+(${CAP}(?:\s+${CAP}){0,3})`,
  'gu',
)
const STREET_WORD =
  '(?:Road|Rd|Street|Lane|Marg|Chowk|Nagar|Colony|Society|Apartments?|Towers?|Gali|Galli|Peth|Wadi|Layout|Enclave|Vihar|Residency|Heights|Gardens?|Bazaar|Market|Avenue|Villa|Niwas|Sadan|Bhavan|Building|Bldg|Plaza|Arcade|Estate)'
// "12 Placeholder Road", "Flat 4, Sample Towers", "26 Mock Mill Road", "Sample Chowk"
const STREET_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:(?:Flat|House|Plot|Shop|Room|Bungalow|Block|Door|H\.?\s?No\.?|No\.?)\s*(?:No\.?\s*)?)?(?:\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)?,?\s+)?(?:${CAP}\s+){1,4}?${STREET_WORD}(?![\p{L}])`,
  'gu',
)
// "Address: ...", "resident of ...", "r/o ..." up to the end of the sentence
const ADDRESS_LABEL_RE = /(?<![\p{L}])(?:(?:address|addr|residence)\s*[:-]|residing\s+at|resident\s+of|r\/o\s*[:-]?)\s*([^\n.;]{3,90}?)(?=\.(?:\s|$)|;|\n|$)/giu
// "lives in Testnagar", "travels from Mockabad", "native of ..."
const PLACE_CUE_RE = new RegExp(
  String.raw`(?<![\p{L}])(?:lives?|living|stays?|staying|resides?|residing|travels?|travell?ing|comes?|coming|came|hails?|based|moved|shifted|native(?:\s+place)?|belongs?)\s+(?:in|at|from|to|near|of|is)\s+(${CAP}(?:\s+${CAP}){0,2})`,
  'gu',
)
// "Testnagar 000008", "PIN 000013"
const PIN_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${CAP}|PIN|Pin|pin)(?:\s+code)?[\s,:-]+\d{6}(?!\d)`, 'gu')
// What may follow a place or organisation: ", Fakepur", " in Old Testnagar", ", behind the post office", " 000013"
const TAIL_RE = new RegExp(
  String.raw`(?:,\s*|\s+(?:in|at|near|of)\s+)(${CAP}(?:\s+${CAP}){0,2})(?:[\s,-]+\d{6}(?!\d))?|,\s*(?:behind|near|opp(?:osite)?\.?|next\s+to|above|beside|off)\s+[^,.;\n]{2,40}|[\s,-]+\d{6}(?!\d)`,
  'yu',
)

// T12c (20 Nov 2026, after the fresh-note runs): landmark phrases written as part of an address, with no street word:
// "near Ganesh mandir", "behind bus stand", "opp. Hanuman mandir", "near water tank", "behind ZP school", "near Sai baba chowk",
// "near railway crossing". A cue word, up to three words, then a landmark noun. The place name that often follows
// (", Sangamner") is taken by the tail rule below.
// Words that are also clinical are NOT in the list, so "pain near the temple", "next to the bridge" and "near signal" stay.
const LANDMARK_NOUN =
  '(?:mandir|masjid|mosque|church|gurudwara|dargah|chowk|chauk|stand|station|tank|canal|school|vidyalaya|college|hospital|petrol\\s+pump|pump|road|market|bazaar|naka|nagar|colony|society|wadi|galli|gali|crossing|dairy|bank|office|mall|plaza|hotel|depot|talav|bakery)'
const LANDMARK_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:near|behind|opp(?:osite)?\.?|beside|next\s+to|in\s+front\s+of|adjacent\s+to|close\s+to)\s+(?:the\s+)?(?:[\p{L}'-]+\s+){0,3}?${LANDMARK_NOUN}(?![\p{L}-])`,
  'giu',
)
// "Flat 4", "plot 5", "shop 12", "House No. 8": a house number in front of a landmark or a place. "block" and "room" are left out
// ("nerve block 2 ml").
const HOUSE_NO_RE = /(?<![\p{L}\p{N}])(?:flat|plot|shop|house|bungalow)\s*(?:no\.?\s*)?\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)?(?![\p{L}\p{N}])/giu

const badWords = (s: string) => s.split(/\s+/).every((w) => NOT_A_PLACE.has(w.toLowerCase()))
const firstBad = (s: string) => NOT_A_PLACE.has(s.split(/\s+/)[0].toLowerCase())

/** Organisations, employers and addresses found by plain rules. `taken` spans are never touched. */
export function findPlaces(text: string, taken: Span[] = []): Found[] {
  const out: Found[] = []
  const add = (start: number, value: string, type: TokenType): Found | null => {
    const f: Found = { start, end: start + value.length, type, value }
    if (value.trim().length < 3 || hit(taken, f) || hit(out, f)) return null
    out.push(f)
    return f
  }
  const cueBefore = (index: number) => /(?:works?|working|worked|employed|job)\s+(?:at|for|with|in)\s+$/u.test(text.slice(Math.max(0, index - 24), index))

  for (const m of text.matchAll(ADDRESS_LABEL_RE)) add(m.index + m[0].length - m[1].length, m[1].trimEnd(), 'ADDRESS')
  for (const m of text.matchAll(STREET_RE)) add(m.index, m[0], 'ADDRESS')
  for (const m of text.matchAll(ORG_RE)) {
    // drop a leading word that cannot be part of the name ("The", "Mr", "She")
    let value = m[0]
    let start = m.index
    while (firstBad(value) && value.includes(' ')) {
      const cut = value.indexOf(' ') + 1
      start += cut
      value = value.slice(cut)
    }
    if (!value.includes(' ')) continue // a lone "Clinic" or "Hospital" is not a name
    add(start, value, cueBefore(start) ? 'EMPLOYER' : 'ORG')
  }
  for (const m of text.matchAll(EMPLOYER_CUE_RE)) {
    if (!badWords(m[1])) add(m.index + m[0].length - m[1].length, m[1], 'EMPLOYER')
  }
  for (const m of text.matchAll(ORG_CUE_RE)) {
    if (!badWords(m[1])) add(m.index + m[0].length - m[1].length, m[1], 'ORG')
  }
  for (const m of text.matchAll(PLACE_CUE_RE)) {
    if (!firstBad(m[1])) add(m.index + m[0].length - m[1].length, m[1], 'ADDRESS')
  }
  for (const m of text.matchAll(LANDMARK_RE)) add(m.index, m[0], 'ADDRESS')
  for (const m of text.matchAll(HOUSE_NO_RE)) add(m.index, m[0], 'ADDRESS')
  for (const m of text.matchAll(PIN_RE)) {
    const first = m[0].split(/[\s,:-]+/)[0]
    if (NOT_A_PLACE.has(first.toLowerCase())) add(m.index + m[0].length - 6, m[0].slice(-6), 'ADDRESS')
    else add(m.index, m[0], 'ADDRESS')
  }

  // Follow each hit to the right: ", Fakepur", " in Old Testnagar", ", behind the post office", " 000013".
  for (let i = 0; i < out.length; i++) {
    let end = out[i].end
    for (let guard = 0; guard < 4; guard++) {
      TAIL_RE.lastIndex = end
      const m = TAIL_RE.exec(text)
      if (!m) break
      if (m[1] && firstBad(m[1])) break
      // keep the comma or the joining word outside the token
      const lead = /^(?:,\s*|\s+(?:in|at|near|of)\s+|[\s,-]+)/u.exec(m[0])?.[0].length ?? 0
      const f = add(m.index + lead, m[0].slice(lead), 'ADDRESS')
      if (!f) break
      end = f.end
    }
  }
  return out
}
