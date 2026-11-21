// T17: "What was sent to the cloud". Shown under a finished letter. It displays the exact approved hidden text, its size and
// its SHA-256, so the user (or a judge) can check that no name left the browser. It reads only the approved string.
import { useEffect, useMemo, useState } from 'react'
import { makeReceipt, sha256Hex } from './core/receipt'

export default function SentReceipt({ approved }: { approved: string }) {
  const receipt = useMemo(() => makeReceipt(approved), [approved])
  const [hash, setHash] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void sha256Hex(approved).then((h) => alive && setHash(h))
    return () => {
      alive = false
    }
  }, [approved])
  return (
    <details className="receipt" data-testid="receipt">
      <summary>What was sent to the cloud</summary>
      <p className="small">
        The note part of the request was exactly this text. {receipt.bytes} bytes, {receipt.labelCount} hidden items (
        {receipt.distinctLabels} different labels).
        {hash && (
          <>
            {' '}
            SHA-256 <code data-testid="receipt-hash">{hash.slice(0, 16)}&hellip;</code>
          </>
        )}
      </p>
      <pre className="receipt-text" data-testid="receipt-text">
        {receipt.text}
      </pre>
      <p className="small grey">
        The app also sends its own fixed letter instructions (the same for every note). The names in your note, and the label
        map that puts them back, stayed in this browser.
      </p>
    </details>
  )
}
