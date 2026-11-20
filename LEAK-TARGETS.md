# LEAK-TARGETS: written BEFORE the first run on the locked set

Written 20 Nov 2026, committed together with the sealed locked data and before any locked-set score was computed. **These targets are not edited after the runs.** A miss is reported as a miss; a new row may be added below with its own date, never an old row rewritten.

Status: **proposed by the builder, to be confirmed by Dr. Yatin.** If he changes a number, he does it before the first locked run, and the commit date shows it.

## What is measured
- **Sets** (`data/harness/`): per profession (dental, CA, law) 200 notes TUNE and 100 notes LOCKED, built by `harness/gen-notes.ts` from made-up parts. Counts: about 1,300 / 1,640 / 1,640 identifiers per profession over the 300 notes.
- **Code-only runs** are exactly repeatable (`npm run harness`, and the gate in `npm test`).
- **Nano runs** are done by hand on the leak page (`/?leak&pack=<dental|ca|law>&set=<tune|locked>`) in Dr. Yatin's Chrome. They are NOT exactly repeatable, so each set is run 3 times when time allows and the spread is reported.
- **Hand-written notes** (his, his staff's, other professionals') are a **separate locked set** (`data/harness/hand/`), reported separately. Generated notes are more regular than real ones and are never quoted as "real-world".
- A partial leak (one word of a name, the last 5 digits of a phone) counts as a leak. "Over-redaction" counts the `keep` strings (amounts, sections, form names) that disappeared from the text sent to the cloud.

## Targets

### A. Code rules only (deterministic), on the LOCKED sets
| Target | Value |
|---|---|
| Structured types (phone, email, record_id, date, dob, amount) | each type **at most 2%** leaked, and **0** for phone and email |
| Names, relatives, organisations, addresses | **no target.** The code rules are not meant to find free names; that is Nano's job. Reported anyway |
| Over-redaction (`keep` strings lost) | **at most 2%** |
| Gate (every `npm test`) | no set may get worse than its saved baseline: overall rate by more than 1 point, any structured type by even 1 identifier, over-redaction by more than 1 point |

### B. Code + Gemini Nano (his Chrome), on the LOCKED sets
| Target | Value |
|---|---|
| Names, phones, emails, ID numbers left | **0** |
| All identifiers left, overall | **at most 3%** |
| Zero-request checks (redaction makes 0 network requests; with the model removed, 0 requests and manual mode) | **PASS on every run** |
| "Never send text the dentist did not approve" | stays a unit test (`sendGuard`), must pass |

### C. Honesty rules for the README and the video
- Numbers quoted publicly: LOCKED set results first, TUNE set results only as "after tuning".
- Always give the set size. 0 leaks in n identifiers only shows "under about 3 in n" (95% confidence).
- If a target is missed, the README and video say which one and by how much.
- Never the words "private", "safe", "secure" or "compliant".

## Process
1. `node harness/gen-notes.ts` regenerates the data and **refuses to overwrite a sealed locked file** (`data/harness/SEAL.json`). The gate checks the hashes on every test run.
2. Fixes to the code rules are made looking at **TUNE** misses only (`harness/out/misses-tune-*.json`, not committed). The locked runner prints counts, never misses.
3. After a fix: `npm run harness` shows the new numbers against the baseline; the gate must still pass; then re-baseline deliberately (delete the baseline file, run again, commit with a message that says why).
4. A fix looked at on the locked set is no longer tested by it; say so in `LEAK-RESULTS.md` and add new locked notes (a new sealed file, new hash).

## Results
(filled in after the runs, in `LEAK-RESULTS.md`; this file keeps only the targets)

## Amendments (each dated; targets above are never rewritten)
- **20 Nov 2026, review:** the date in line 3 said "21 Nov"; the real date is 20 Nov (commit 96a38a1 is dated 20 Nov 18:36). Date corrected, no target changed.
- **20 Nov 2026, review:** the first locked run happened two minutes after this file was committed, **before Dr. Yatin confirmed the numbers**. So the targets above stand as written. Any change he makes now is post-hoc and must be added here as a new row with the reason, never by editing the table.
