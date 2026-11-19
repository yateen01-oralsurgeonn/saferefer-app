// T12 the ONE place for every text the dentist reads when something goes wrong (FINISH.md section 1, "Error messages").
// Plain TypeScript: no React, no Firebase. Every failure in the app becomes one of these kinds, and every kind has exactly
// one fixed text. Nothing here ever holds SDK text, an error code, a stack trace or any part of a note: `mapError` reads
// only the machine kind of an error, never its message (CLAUDE.md rule 4, SECURITY A8).

export const MESSAGES = {
  /** Nano missing, failed or timed out (the browser has it, but it did not work). */
  'nano-unavailable': 'The on-device model is not available. Hide every name by hand, then tick the box.',
  'nano-downloading': 'Chrome is still downloading the on-device model. You can wait, or hide the names by hand.',
  /** No Prompt API at all: a phone, Edge, Firefox, an old Chrome. */
  unsupported: 'SafeRefer needs Chrome 139 or newer on a computer to hide names automatically. You can still hide them by hand.',
  blocked: 'A name may still be in the text. Nothing was sent. Please check the highlighted words.',
  'not-approved': 'Approve the hidden note before sending.',
  failed: 'The letter could not be written. Nothing was lost. Please try again.',
  'bad-reply': 'The letter that came back did not pass our checks, so it is not shown. Please try again.',
  quota: 'The free limit has been reached for now. Please try again in a few minutes.',
  'app-check': 'This browser could not be verified. Reload the page and try again.',
  /** Offline and the letter was kept for later (T10). */
  offline: 'You are offline. The letter is queued and will be sent when you are back online.',
  /** Offline and the browser could not keep it (private window, storage blocked). Nothing was queued, so we do not say it was. */
  'offline-not-queued': 'You are offline. Nothing was sent. Connect and try again.',
  'queue-unavailable': 'This browser could not keep the letter for later. Nothing was sent. Connect and try again.',
  /** Tooth list: neither model answered, so each tooth shows its own sentence. Information, not an error. */
  'rules-only': 'The models did not answer, so each tooth is shown with its own sentence from your note.',
  /** Anything else, when the code is SURE nothing left the browser. */
  unknown: 'Something went wrong. Reload the page. Your note was not sent.',
  /** Anything else, when it is not sure (an error boundary cannot know). Never claims "not sent". */
  'unknown-unsure': 'Something went wrong. Reload the page.',
} as const

export type MessageKind = keyof typeof MESSAGES

export const messageFor = (kind: MessageKind): string => MESSAGES[kind]

/**
 * The status line, one text per state (FINISH.md section 1 "States"). The screen picks one; it never builds a sentence
 * from a note, a name or an error.
 */
export const STATUS = {
  empty: 'Type or paste a note to begin.',
  redacting: 'Hiding names in this browser…',
  ready: 'Check the right-hand panel. Is every name hidden?',
  'items-not-placed': 'We found these but could not hide them. Hide them by hand, then tick the box.',
  edited: 'You changed the note. Please check it again.',
  approved: 'Approved. Only the right-hand text will be sent.',
  sending: 'Writing the letter…',
  letter: 'Letter ready. Names were put back in this browser.',
  copied: 'Copied. Paste it into your letter.',
  'profession-changed': 'Profession changed. The note was cleared.',
} as const

export type StatusKind = keyof typeof STATUS

/** Machine kinds of the app's own call errors (core/letter.ts LetterCallError). */
const CALL_KINDS: Readonly<Record<string, MessageKind | 'aborted'>> = {
  quota: 'quota',
  'app-check': 'app-check',
  offline: 'offline-not-queued',
  failed: 'failed',
  aborted: 'aborted',
}

/**
 * Turn ANY thrown value into a message kind. It reads only `kind` (the app's own errors) or `name === 'AbortError'`.
 * It never reads `.message`, so SDK text, a name or a phone number inside an error can never reach the screen.
 * `aborted` means "the dentist moved on": show nothing.
 */
export function mapError(e: unknown): MessageKind | 'aborted' {
  if (typeof e === 'object' && e !== null) {
    const o = e as { name?: unknown; kind?: unknown }
    if (o.name === 'AbortError') return 'aborted'
    // Own property only: a kind that arrives through the prototype chain is not trusted.
    if (Object.prototype.hasOwnProperty.call(e, 'kind') && typeof o.kind === 'string' && Object.prototype.hasOwnProperty.call(CALL_KINDS, o.kind)) {
      return CALL_KINDS[o.kind]
    }
  }
  return 'failed'
}

/** What `LanguageModel.availability()` said, or "absent" when there is no LanguageModel at all. */
export type NanoState = 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'absent'

/**
 * Why Nano redaction went to manual mode, as one message kind. `failure` is the redactor's own failure word
 * (core/nanoRedactor.ts); `state` comes from nanoAvailability() in the adapter.
 */
export function manualKind(state: NanoState): MessageKind {
  if (state === 'absent') return 'unsupported'
  if (state === 'downloading' || state === 'downloadable') return 'nano-downloading'
  return 'nano-unavailable'
}
