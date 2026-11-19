import { describe, expect, it } from 'vitest'
import {
  BLOCKED_MESSAGE,
  LETTER_MESSAGES,
  LetterCallError,
  MANUAL_MESSAGE,
  manualKind,
  mapError,
  MESSAGES,
  messageFor,
  NOT_APPROVED_MESSAGE,
  QUEUE_UNAVAILABLE_MESSAGE,
  QUEUED_MESSAGE,
  RULES_ONLY_MESSAGE,
  type MessageKind,
} from '..'

// The table of FINISH.md section 1 "Error messages", word for word.
const FINISH_TABLE: Array<[MessageKind, string]> = [
  ['nano-unavailable', 'The on-device model is not available. Hide every name by hand, then tick the box.'],
  ['nano-downloading', 'Chrome is still downloading the on-device model. You can wait, or hide the names by hand.'],
  ['blocked', 'A name may still be in the text. Nothing was sent. Please check the highlighted words.'],
  ['failed', 'The letter could not be written. Nothing was lost. Please try again.'],
  ['bad-reply', 'The letter that came back did not pass our checks, so it is not shown. Please try again.'],
  ['quota', 'The free limit has been reached for now. Please try again in a few minutes.'],
  ['app-check', 'This browser could not be verified. Reload the page and try again.'],
  ['offline', 'You are offline. The letter is queued and will be sent when you are back online.'],
  ['unsupported', 'SafeRefer needs Chrome 139 or newer on a computer to hide names automatically. You can still hide them by hand.'],
  ['unknown', 'Something went wrong. Reload the page. Your note was not sent.'],
]

describe('T12 the fixed message table', () => {
  it.each(FINISH_TABLE)('%s says exactly the FINISH.md text', (kind, text) => {
    expect(messageFor(kind)).toBe(text)
  })

  it('every kind has one non-empty text, and no two kinds share a text', () => {
    const texts = Object.values(MESSAGES)
    expect(texts.every((t) => t.trim().length > 10)).toBe(true)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('the unsure fallback never claims the note was not sent', () => {
    expect(MESSAGES['unknown-unsure']).not.toMatch(/not sent|nothing was sent/i)
    expect(MESSAGES['unknown-unsure']).toBe('Something went wrong. Reload the page.')
  })

  it('no text holds a bracket, a code, a stack word or a placeholder', () => {
    for (const t of Object.values(MESSAGES)) {
      expect(t).not.toMatch(/[[\]{}<>]|undefined|null|Error:|at \w+\(|\bHTTP\b|\b[45]\d\d\b|TypeError|stack/i)
    }
  })

  it('every constant the rest of the app uses is one of the table texts', () => {
    const all = new Set<string>(Object.values(MESSAGES))
    for (const t of [BLOCKED_MESSAGE, NOT_APPROVED_MESSAGE, MANUAL_MESSAGE, QUEUED_MESSAGE, QUEUE_UNAVAILABLE_MESSAGE, RULES_ONLY_MESSAGE]) {
      expect(all.has(t), t).toBe(true)
    }
    for (const t of Object.values(LETTER_MESSAGES)) if (t !== '') expect(all.has(t), t).toBe(true)
  })
})

describe('T12 mapError: any failure becomes one kind, from its machine kind only', () => {
  it('maps the app\'s own call errors', () => {
    expect(mapError(new LetterCallError('quota'))).toBe('quota')
    expect(mapError(new LetterCallError('app-check'))).toBe('app-check')
    expect(mapError(new LetterCallError('offline'))).toBe('offline-not-queued')
    expect(mapError(new LetterCallError('failed'))).toBe('failed')
    expect(mapError(new LetterCallError('aborted'))).toBe('aborted')
  })

  it('an AbortError means the dentist moved on: show nothing', () => {
    expect(mapError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe('aborted')
  })

  it.each([
    ['an Error with a name and a phone in its message', new Error('Asha Testpatil 00000 55501 failed')],
    ['an SDK-shaped error', Object.assign(new Error('Firebase: Error (AI/fetch-error)'), { code: 'fetch-error', customErrorData: { status: 500, errorDetails: [{ note: 'Asha' }] } })],
    ['a string', 'Asha Testpatil'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an object with a made-up kind', { kind: 'Asha' }],
    ['an object with an inherited kind', Object.create({ kind: 'quota' })],
  ])('%s is just "failed", and its text is never used', (_name, e) => {
    const kind = mapError(e)
    expect(kind).toBe('failed')
    expect(messageFor(kind as MessageKind)).not.toMatch(/Asha|00000|Firebase|fetch-error/)
  })
})

describe('T12 why Nano went manual', () => {
  it('maps each browser state to the right message', () => {
    expect(manualKind('absent')).toBe('unsupported')
    expect(manualKind('downloading')).toBe('nano-downloading')
    expect(manualKind('downloadable')).toBe('nano-downloading')
    expect(manualKind('unavailable')).toBe('nano-unavailable')
    expect(manualKind('available')).toBe('nano-unavailable') // present but it failed or timed out
  })
})

describe('T12 no source file reads an error\'s text', () => {
  const sources = import.meta.glob(['../../**/*.{ts,tsx}', '!../../**/__tests__/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('no `.message` of a caught error, no String(error), no error.stack in the app', () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /\b(?:e|err|error|ex)\.(?:message|stack)\b|String\((?:e|err|error)\)|\$\{(?:e|err|error)\}/.test(text))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

describe('T12 the error boundary and the banner (FINISH.md done-check)', () => {
  const raw = import.meta.glob(['../../ErrorBoundary.tsx', '../../main.tsx', '../../NoteScreen.tsx', '../../LeakTest.tsx', '../../SetupCheck.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
  const file = (name: string) => Object.entries(raw).find(([k]) => k.endsWith(name))?.[1] ?? ''

  it('the boundary keeps no error: no parameter, no componentDidCatch, no console', () => {
    const t = file('ErrorBoundary.tsx')
    expect(t).toContain('static getDerivedStateFromError(): State')
    expect(t).not.toMatch(/componentDidCatch|console\./)
    expect(t).toContain("messageFor('unknown-unsure')")
  })

  it('React is told not to print caught errors (they could hold anything)', () => {
    const t = file('main.tsx')
    for (const hook of ['onCaughtError', 'onUncaughtError', 'onRecoverableError']) expect(t).toContain(hook)
    expect(t).toContain('<ErrorBoundary>')
  })

  it('the synthetic-data banner is on every page, including the crash page', () => {
    for (const name of ['NoteScreen.tsx', 'LeakTest.tsx', 'SetupCheck.tsx', 'ErrorBoundary.tsx']) {
      expect(file(name), name).toContain('Synthetic data only')
    }
  })

  it('the status line is built only from the central STATUS and MESSAGES tables', () => {
    const t = file('NoteScreen.tsx')
    expect(t).toContain('STATUS.empty')
    expect(t).toContain("messageFor('offline')")
    // no hand-written sentence is assigned to the status
    expect(t).not.toMatch(/status = '[A-Z]/)
  })
})
