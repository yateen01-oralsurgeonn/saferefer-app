import { describe, expect, it } from 'vitest'
import { makeReceipt, sha256Hex } from '../receipt'

describe('makeReceipt', () => {
  it('counts bytes and labels of the approved text', () => {
    const r = makeReceipt('[PERSON_1], 34 F, phone [PHONE]. Sent to [ORG]. Then [PERSON_1] again.')
    expect(r.labelCount).toBe(4)
    expect(r.distinctLabels).toBe(3)
    expect(r.bytes).toBe(r.text.length)
  })
  it('counts UTF-8 bytes, not characters', () => {
    expect(makeReceipt('दात [PERSON_1]').bytes).toBeGreaterThan('दात [PERSON_1]'.length)
  })
  it('handles text with no labels', () => {
    const r = makeReceipt('RCT 36 done.')
    expect([r.labelCount, r.distinctLabels]).toEqual([0, 0])
  })
  it('returns the text untouched', () => {
    expect(makeReceipt('abc [ID]').text).toBe('abc [ID]')
  })
})

describe('sha256Hex', () => {
  it('matches the known SHA-256 of "abc"', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
