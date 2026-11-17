# CONSISTENCY: document check (16 Nov 2026)

Files checked: PLAN, NEXT, DOCS-CHECK, PROMPTS, SECURITY, SUBMISSION, RULES. All fixes below are applied.
SDK name, mode names, cloud model name, token names and task numbers agree across all files.

| # | Issue | Winner | Fix applied |
|---|---|---|---|
| 1 | Send guard: PROMPTS says whole-word match, 3+ characters, cloud calls only. SECURITY A6 says substring for 4+ characters and also on the Firestore write | SECURITY | PROMPTS section 2 send guard rewritten to match A6 |
| 2 | Dropped Nano items: PROMPTS shows only a count. SECURITY A5 wants the text shown and a tick before Approve | SECURITY | PROMPTS section 1 per-item checks changed |
| 3 | Long notes: PROMPTS has no rule for a failed part or a full 40-item reply (SECURITY D1, D5) | SECURITY | PROMPTS "Long notes" line: any part fails = manual mode; 40 items = re-run smaller |
| 4 | Manual mode: PROMPTS lets the dentist approve with no extra step (SECURITY D4) | SECURITY | PROMPTS invalid-output rule: second tick "I hid every name by hand" |
| 5 | No task builds the send guard. PROMPTS lists it under T3/T4/T7, SECURITY under T5, PLAN under none | SECURITY | PLAN T5 now includes the send guard and a done-check for it |
| 6 | PLAN never tells the builder to read PROMPTS.md or SECURITY.md, so 30+ security fixes have a task tag but no task text | PLAN | PLAN section 3: one line making both files part of every task; SECURITY wins a clash |
| 7 | NEXT T1 prompt does not read SECURITY.md, though six rows are tagged T1 | SECURITY | NEXT prompt line 1 names rows A4, A9, A13, C1, C2, C3 |
| 8 | DOCS-CHECK says its open items "must be tested in T1", and SECURITY A4 wants a zero-request proof in T1. NEXT has no such step | DOCS-CHECK | NEXT prompt step 7 added: five tests, results written to DOCS-CHECK |
| 9 | DOCS-CHECK says "three things" are unverified; the list holds five | DOCS-CHECK | Line 4 corrected and pointed at NEXT step 7 |
| 10 | Demo length: SUBMISSION 2:50 since 17 Nov (Enamel shot added; SUBMISSION notes the change) | SUBMISSION | PLAN section 5 marked superseded |
| 11 | SUBMISSION files tooth lines under "on-device" and never states the cloud fallback, which RULES requires and PLAN keeps T9 for | RULES | SUBMISSION bullets rewritten: on-device only / on-device first with fallback / cloud only |
| 12 | SUBMISSION says "identifying details stay on their own machine". SECURITY A1 and A10: Nano can miss names; make no privacy claim for real patients | SECURITY | SUBMISSION "Value" sentence narrowed; limit stated |
| 13 | SUBMISSION left out Auth, Firestore and Remote Config, which RULES encourages and PLAN builds | PLAN | Added to the App Check bullet |
| 14 | PLAN may drop T10 and T11, but SUBMISSION claims offline queue and shows it in the demo | PLAN | PLAN drop rule now says to remove those SUBMISSION claims |
| 15 | PLAN diagram step 1 omits email; T3 and PROMPTS include `[EMAIL]` | PROMPTS | PLAN diagram line fixed |

## Still open (no document can settle these; T1 will)

- Offline tooth lines: if an on-device call needs an App Check token from the network, PLAN "step 6 works offline", the SUBMISSION offline bullet and the 1:45-2:20 demo shot are all wrong. NEXT step 7a tests it.
- reCAPTCHA Enterprise may need a billing account; PLAN assumes the free plan. NEXT step 7c tests it.
- The video never shows the cloud fallback (it needs a Chrome restart). The badge and the description cover it; the README should tell judges how to see it. Check at T13.
- Judges without Gemini Nano get manual redaction only. The T13 README must give the Chrome flag and hardware needs.
- PLAN T2 still lists the 30 notes as work to do; they are committed. Only the banner is left.
