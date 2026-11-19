import { describe, expect, it } from 'vitest'
import notes from '../../../../data/notes.json'
import {
  buildSystemInstruction,
  draftLetter,
  LetterCallError,
  LETTER_MESSAGES,
  parseLetterReply,
  redactByCode,
  stripMarkdown,
  type LetterModelFn,
} from '../index'

const reply = (letter: string, not_recorded: string[] = []) => JSON.stringify({ letter, not_recorded })
const GOOD = 'Dear Colleague,\nRe: [PATIENT]\nReason for referral\nTooth 36 deep distal caries.\nThank you for seeing this patient.'

function fake(replies: Array<string | Error | 'hang'>) {
  const state = { calls: 0, systems: [] as string[], users: [] as string[] }
  const fn: LetterModelFn = (system, user, _schema, signal) => {
    const r = replies[Math.min(state.calls, replies.length - 1)]
    state.calls++
    state.systems.push(system)
    state.users.push(user)
    if (r === 'hang') return new Promise<string>((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))))
    if (r instanceof Error) return Promise.reject(r)
    return Promise.resolve(r)
  }
  return { fn, state }
}

const map = () => redactByCode('Patient: Asha Testpatil. Phone 00000 55501.').map
const APPROVED = 'Patient: [PATIENT]. Phone [PHONE]. Tooth 36 deep distal caries.'

describe('T6 letter: prompt and reply', () => {
  it('the system instruction is PROMPTS.md section 3 with the section list at the end', () => {
    const s = buildSystemInstruction()
    expect(s).toContain('You draft a referral letter from a general dentist to an endodontist.')
    expect(s).toContain('11. If the NOTE is empty or is not a dental clinical note, return letter "" and not_recorded ["ALL"].')
    expect(s.endsWith('Closing line: Thank you for seeing this patient.')).toBe(true)
    expect(buildSystemInstruction(['A', 'B']).endsWith('in this order:\nA\nB')).toBe(true)
  })

  it('a good reply is accepted, and markdown marks are stripped', () => {
    expect(parseLetterReply(reply(GOOD, ['Investigations']))).toEqual({ letter: GOOD, notRecorded: ['Investigations'] })
    const md = parseLetterReply(reply('## Reason for referral\n**Tooth 36** caries\n* Pain on cold\n`ok`'))
    expect(md?.letter).toBe('Reason for referral\nTooth 36 caries\nPain on cold\nok')
    expect(stripMarkdown('```json\nA\n```')).toBe('A')
  })

  it.each([
    ['not json', 'nope'],
    ['an array', '[]'],
    ['no not_recorded', '{"letter":"x"}'],
    ['letter is a number', '{"letter":5,"not_recorded":[]}'],
    ['not_recorded holds a number', '{"letter":"x","not_recorded":[1]}'],
    ['an empty letter', reply('')],
    ['a blank letter', reply('   \n ')],
    ['ALL (not a dental note)', reply('', ['ALL'])],
    ['ALL with a letter', reply(GOOD, ['all'])],
    ['over 400 words', reply('word '.repeat(401))],
  ])('%s is a bad reply', (_name, raw) => {
    expect(parseLetterReply(raw)).toBeNull()
  })

  it('exactly 400 words is accepted', () => {
    expect(parseLetterReply(reply('word '.repeat(400)))).not.toBeNull()
  })
})

describe('T6 letter: the call', () => {
  it('sends exactly the approved text as the user message, with the system instruction', async () => {
    const { fn, state } = fake([reply(GOOD)])
    const r = await draftLetter(APPROVED, map(), fn)
    expect(r).toEqual({ ok: true, letter: GOOD, notRecorded: [] })
    expect(state.users).toEqual([APPROVED])
    expect(state.systems[0]).toBe(buildSystemInstruction())
  })

  it('bad reply once, good on the retry: ok, two calls, same text both times', async () => {
    const { fn, state } = fake(['garbage', reply(GOOD)])
    const r = await draftLetter(APPROVED, map(), fn)
    expect(r.ok).toBe(true)
    expect(state.calls).toBe(2)
    expect(state.users[0]).toBe(state.users[1])
  })

  it('bad reply twice: fixed message, no reply text shown', async () => {
    const { fn, state } = fake(['garbage Asha', reply('')])
    const r = await draftLetter(APPROVED, map(), fn)
    expect(r).toEqual({ ok: false, failure: 'bad-reply', message: LETTER_MESSAGES['bad-reply'] })
    expect(state.calls).toBe(2)
    expect(JSON.stringify(r)).not.toContain('garbage')
  })

  it('timeout is retried once, then fails with the fixed message', async () => {
    const { fn, state } = fake(['hang'])
    const r = await draftLetter(APPROVED, map(), fn, { timeoutMs: 15 })
    expect(r).toMatchObject({ ok: false, failure: 'timeout', message: LETTER_MESSAGES.timeout })
    expect(state.calls).toBe(2)
  })

  it('a reply that arrives after the timeout is ignored', async () => {
    let n = 0
    const slow: LetterModelFn = () => {
      n++
      return new Promise((resolve) => setTimeout(() => resolve(reply(GOOD)), 80))
    }
    const r = await draftLetter(APPROVED, map(), slow, { timeoutMs: 15 })
    expect(r.ok).toBe(false)
    expect(n).toBe(2)
  })

  it.each(['quota', 'app-check', 'offline'] as const)('%s is not retried and has its own fixed message', async (kind) => {
    const { fn, state } = fake([new LetterCallError(kind)])
    const r = await draftLetter(APPROVED, map(), fn)
    expect(r).toEqual({ ok: false, failure: kind, message: LETTER_MESSAGES[kind] })
    expect(state.calls).toBe(1)
  })

  it('any other error is retried once, and its text never appears in the result', async () => {
    const { fn, state } = fake([new Error('boom Asha 00000 55501')])
    const r = await draftLetter(APPROVED, map(), fn)
    expect(r).toMatchObject({ ok: false, failure: 'failed', message: LETTER_MESSAGES.failed })
    expect(JSON.stringify(r)).not.toMatch(/boom|Asha|55501/)
    expect(state.calls).toBe(2)
  })

  it('nothing approved: not-approved, model never called', async () => {
    const { fn, state } = fake([reply(GOOD)])
    expect(await draftLetter(null, map(), fn)).toMatchObject({ ok: false, failure: 'not-approved' })
    expect(await draftLetter('  ', map(), fn)).toMatchObject({ ok: false, failure: 'not-approved' })
    expect(state.calls).toBe(0)
  })

  it('a name still in the text: blocked with the hit, model never called', async () => {
    const { fn, state } = fake([reply(GOOD)])
    const r = await draftLetter('Referred. Asha waited. Phone [PHONE].', map(), fn)
    expect(r).toMatchObject({ ok: false, failure: 'blocked', message: 'Blocked: an identifier is still in the note.' })
    expect(r.ok === false && r.hit).toBeTruthy()
    expect(state.calls).toBe(0)
  })

  it('the retry goes through the guard again: a value added between attempts blocks it', async () => {
    const m = map()
    let calls = 0
    const fn: LetterModelFn = async () => {
      calls++
      m.assign('PERSON', 'Zorblax')
      throw new Error('first attempt fails')
    }
    const r = await draftLetter('Tooth 36 caries. Zorblax waited.', m, fn)
    expect(calls).toBe(1)
    expect(r).toMatchObject({ ok: false, failure: 'blocked', hit: expect.stringMatching(/zorblax/i) })
  })

  it('an edit (abort) stops the call and returns aborted with no message', async () => {
    const ctrl = new AbortController()
    const { fn } = fake(['hang'])
    const p = draftLetter(APPROVED, map(), fn, { timeoutMs: 1000, signal: ctrl.signal })
    setTimeout(() => ctrl.abort(), 10)
    expect(await p).toEqual({ ok: false, failure: 'aborted', message: '' })
  })

  it('ACCEPTANCE T6 (note 1): the request holds the approved text only, no name, phone or date', async () => {
    const note = notes[0]
    const code = redactByCode(note.text)
    const { fn, state } = fake([reply(GOOD)])
    const r = await draftLetter(code.text, code.map, fn)
    expect(r.ok).toBe(true)
    const body = state.systems[0] + '\n' + state.users[0]
    for (const id of note.identifiers) {
      for (const part of id.value.split(/\s+/)) expect(body.toLowerCase()).not.toContain(part.toLowerCase())
    }
    expect(state.users[0]).toBe(code.text)
  })

  it('the raw note is blocked before any call', async () => {
    const note = notes[0]
    const code = redactByCode(note.text)
    const { fn, state } = fake([reply(GOOD)])
    const r = await draftLetter(note.text, code.map, fn)
    expect(r).toMatchObject({ ok: false, failure: 'blocked' })
    expect(state.calls).toBe(0)
  })
})

describe('T6 letter: core stays pure', () => {
  it('core/letter.ts imports no SDK or React and makes no network call', () => {
    const files = import.meta.glob('../letter.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const src = Object.values(files)[0]
    expect(src.length).toBeGreaterThan(1000)
    expect(src).not.toMatch(/from\s+['"](firebase|react)/)
    expect(src).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|console\.|localStorage|sessionStorage/)
    expect(src).not.toMatch(/gemini-/)
  })
})
