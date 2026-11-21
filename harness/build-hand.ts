// Turns Dr. Yatin's hand-written notes (data/harness/hand/hand-<pack>.md, numbered, [[type:text]] markers) into
// data/harness/hand/hand-<pack>.json for the leak page (?leak&pack=..&set=hand).
// Run from the repo root:  node harness/build-hand.ts <dental|ca|law>
// Prints COUNTS and note NUMBERS only, never note text: the builder must not read these notes' contents or misses.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const pack = process.argv[2]
if (!['dental', 'ca', 'law'].includes(pack)) throw new Error('usage: node harness/build-hand.ts <dental|ca|law>')
const src = `data/harness/hand/hand-${pack}.md`
if (!existsSync(src)) throw new Error(`${src} not found`)

const TYPES = new Set(['name', 'relative', 'phone', 'email', 'date', 'dob', 'address', 'organization', 'record_id', 'amount', 'id'])
const raw = readFileSync(src, 'utf8').replace(/\r\n/g, '\n')
// Notes start at a line beginning "N." or "N)"; a note may continue on following lines until the next number.
const chunks: string[] = []
for (const line of raw.split('\n')) {
  if (/^\s*\d{1,3}[.)]\s/.test(line)) chunks.push(line.replace(/^\s*\d{1,3}[.)]\s+/, ''))
  else if (chunks.length && line.trim() && !/^#/.test(line)) chunks[chunks.length - 1] += ' ' + line.trim()
}

const problems: string[] = []
const out = chunks.map((chunk, i) => {
  const n = i + 1
  const identifiers: { type: string; value: string }[] = []
  const text = chunk.replace(/\[\[([a-z_]+):([^\]]*)\]\]/g, (_m, type: string, value: string) => {
    if (!TYPES.has(type)) problems.push(`note ${n}: unknown type "${type}"`)
    if (!value.trim()) problems.push(`note ${n}: empty marker`)
    identifiers.push({ type, value })
    return value
  })
  if (/\[\[|\]\]/.test(text)) problems.push(`note ${n}: a [[ or ]] is left over (unbalanced marker)`)
  for (const id of identifiers) {
    if (id.type === 'phone' && !/^\D*0{5}/.test(id.value.replace(/^\+?91[\s-]*/, ''))) problems.push(`note ${n}: a phone does not start with five zeros`)
  }
  // Unmarked long digit runs: possible phone / PAN / account number left unmarked (or a real number).
  const marked = identifiers.map((x) => x.value).join(' ')
  const digitRuns = (text.replace(/[\s-]/g, '').match(/\d{9,}/g) ?? []).filter((d) => !marked.replace(/[\s-]/g, '').includes(d))
  if (digitRuns.length) problems.push(`note ${n}: ${digitRuns.length} long number(s) not marked as an identifier`)
  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text.replace(/[-]/g, '')) && !/\b[01]\d{3}\s?\d{4}\s?\d{4}\b/.test(text)) problems.push(`note ${n}: a 12-digit number not starting 0 or 1 (Aadhaar shape): use a made-up one starting 0 or 1`)
  return { id: `HAND-${pack.toUpperCase()}-${String(n).padStart(3, '0')}`, text, identifiers }
})

const byType: Record<string, number> = {}
for (const note of out) for (const id of note.identifiers) byType[id.type] = (byType[id.type] ?? 0) + 1
const total = out.reduce((s, x) => s + x.identifiers.length, 0)
console.log(`${pack}: ${out.length} notes, ${total} marked identifiers`, byType)
console.log('notes with no identifiers:', out.filter((x) => x.identifiers.length === 0).map((x) => x.id.slice(-3)).join(', ') || 'none')
if (out.length !== 10) problems.push(`expected 10 notes, found ${out.length}`)
if (problems.length) {
  console.log('PROBLEMS (fix in the .md, then run again):')
  for (const p of problems) console.log(' -', p)
  process.exit(1)
}
const json = JSON.stringify(out, null, 1)
writeFileSync(`data/harness/hand/hand-${pack}.json`, json)
console.log(`wrote data/harness/hand/hand-${pack}.json  sha256 ${createHash('sha256').update(json).digest('hex')}`)
