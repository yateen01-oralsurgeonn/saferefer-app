import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SentReceipt from '../SentReceipt'

describe('SentReceipt', () => {
  it('shows the exact approved text, its size and its label counts, and nothing else of the note', () => {
    const html = renderToString(<SentReceipt approved="[PERSON_1], 34 F, phone [PHONE]." />).replace(/<!-- -->/g, '')
    expect(html).toContain('What was sent to the cloud')
    expect(html).toContain('[PERSON_1], 34 F, phone [PHONE].')
    expect(html).toContain('2 hidden items')
    expect(html).not.toMatch(/Asha|00000/)
  })
})
