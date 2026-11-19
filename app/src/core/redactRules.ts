// P2: the extra rules a profession pack hands to the code redactor.
// Rules only ADD. The base finders in codeRedactor.ts, places.ts and patterns.ts always run, and the send guard,
// the LanguageModel lock and the token scheme are not reachable from here (PACKS.md section 2).
import type { Found } from './tokens'

type Span = { start: number; end: number }

export interface RedactRules {
  /** Extra ID finders. Each gets the text and the spans already taken. Run before dates and phones. */
  extraIds?: ReadonlyArray<(text: string, taken: Span[]) => Found[]>
  /** Spans that must stay as written (money amounts). Nothing may claim or cut them. */
  protect?: (text: string) => Span[]
  /** Extra words for "relation then name": "director Mohan Testlal". Letters, spaces and hyphens only. */
  relations?: readonly string[]
  /** Extra header labels for the main person: "Client: Rajesh Testshah". Letters and spaces only. */
  headers?: readonly string[]
  /**
   * Role labels for OTHER people in the matter ("Accused: ...", "defendant ..."). Their names are hidden as PERSON and
   * never as the main person, so [PATIENT] always means the client. Letters, spaces and hyphens only.
   */
  roles?: readonly string[]
  /** Short forms that look like an ID but are not ("GSTR-3B"). */
  notIdPrefixes?: readonly string[]
}

export const NO_RULES: RedactRules = {}

const SAFE_WORD = /^[A-Za-z][A-Za-z -]{1,24}$/
/** Words from a pack go into a regular expression, so only plain words are allowed. */
export const isSafeWord = (w: unknown): w is string => typeof w === 'string' && SAFE_WORD.test(w)
