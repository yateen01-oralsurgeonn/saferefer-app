// P2: turn a pack's redaction words into the rules the code redactor takes (redactRules.ts).
// Plain code, no model, no network. Rules only add; the base finders always run.
import { CA_NOT_AN_ID, findAmounts, findCaIds } from './caPatterns'
import type { Pack } from './packs'
import { NO_RULES, type RedactRules } from './redactRules'

export function rulesForPack(pack: Pack): RedactRules {
  const { relations, headers, ids } = pack.redaction
  if (ids === 'none' && !relations.length && !headers.length) return NO_RULES
  return {
    relations,
    headers,
    ...(ids === 'ca' ? { extraIds: [findCaIds], protect: findAmounts, notIdPrefixes: CA_NOT_AN_ID } : {}),
  }
}
