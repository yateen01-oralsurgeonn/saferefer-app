# HANDOVER: Fable session, 17 Nov 2026

Written for Sonnet 5.5 and Dr. Yatin. Newest branch: `partc-hardening`. Nothing is pushed or merged.

## Branches (each built on the one before)
| Branch | What it holds |
|---|---|
| `t1-setup` | Vite + React + TypeScript app in `app/`, LICENSE, `.gitignore`, `.env.example`, the one-page test (`App.tsx`, `firebase.ts`). **T1 is NOT finished.** |
| `t3-code-redactor` | `core/tokens.ts`, `core/patterns.ts`, `core/codeRedactor.ts` |
| `t5-send-guard` | `core/sendGuard.ts` (logic only, no screen) |
| `t7-restore-factcheck` | `core/restore.ts`, `core/factCheck.ts`, `core/leakScorer.ts`, and the word lists `data/drugs.json`, `data/clinical-terms.json`, `data/shorthand.json` |
| `partc-hardening` | `core/places.ts`, stronger redactor and guard, `core/__tests__/attack.test.ts` |

Run the tests: `cd app`, then `npm test`. Result at hand-over: **161 passed, 14 expected fail** (the 14 are the known gaps below). `npm run build` passes.

## T1: what is done and what is open
Done: scaffold, page with text box, Ask button, reply and badge from `result.response.inferenceSource`, App Check started before the AI call, debug token only under `import.meta.env.DEV`. Live Firebase docs were read on 17 Nov and agree with DOCS-CHECK.md. Node is v24, Chrome is 157.

**T1 status, 18 Nov 2026 (branch t1-finish):** items 1 to 3 are done. Chrome `availability()` is `available`; the console is set up (web app `saferefer-web` registered with reCAPTCHA Enterprise, AI Logic on, debug token registered); the page ran against Firebase: on-device badge in Chrome, cloud badge in Edge. Build passes and the debug token is NOT in `app/dist` (0 hits). Test results are in DOCS-CHECK.md "T1 test results": a passed, c passed, b and d FAILED, e still open (needs the rate limits of the project behind `saferefer-d5175`, read while signed in as the Firebase owner account).

**Two things T4 must act on (from tests b and d):**
1. `InferenceMode.ONLY_ON_DEVICE` alone is NOT a privacy lock. In a browser with no `window.LanguageModel` the SDK builds no adapter and sends the call to the cloud (firebase 13.4.0, `index.esm.js` lines ~1228 and 2562). Before every redaction call the app must check `typeof LanguageModel !== 'undefined'` and `await LanguageModel.availability() === 'available'`, refuse with no network call otherwise, and a unit test must prove zero fetches when `LanguageModel` is undefined. Where `LanguageModel` exists but is `unavailable`, the SDK does throw and send nothing (tested in a fresh Chrome profile).
2. The Chrome flag does NOT disable Nano on Chrome 157. Do not write "turn the flag off" in PLAN.md, SUBMISSION.md or the README. To show the cloud fallback use Edge, a Chrome profile without the model, or the dev "cloud only" mode.

Also unchecked: whether the App Check `exchangeDebugToken` request fires at page load or only when Ask is pressed. It carries the token, not the note, but SECURITY A4 says "zero requests".

One bug was caught and fixed here: writing `const env = import.meta.env` made Vite put the debug token into the production build. Always write `import.meta.env.VITE_...` in full (comment in `firebase.ts`). Check with: build, then search `dist/` for the token value: 0 hits.

## What each test file proved
- `codeRedactor.test.ts`: note 1 gives `[PATIENT]`, `[PHONE]`, `[DATE_1]`; age and tooth numbers stay; the same date in two spellings shares a token; given name alone shares the patient token; surname alone gets its own token; running twice changes nothing. Over the 30 notes: every phone, email and date is hidden; every patient name is hidden except three single nicknames.
- `sendGuard.test.ts`: blocks "Rameshs", "RameshPatil", "RAMESH", a 3-letter name as a whole word, a phone, an email (ACCEPTANCE T5). Blocks every raw note; passes every note after redaction. `guardedSend` never calls `send` when nothing is approved or the guard blocks, and passes exactly the approved text.
- `restore.test.ts`: `[Patient]`, `[ PATIENT ]`, `[RELATIVE 1]`, `[PATIENT_1]` are repaired; `[PERSON_9]` stays and is red (ACCEPTANCE T7); one pass, no chained replaces.
- `factCheck.test.ts`: "tooth 47" gives the red warning "Tooth 47 is not in your note"; changed doses, invented drugs, treatments, dates and tooth words are red; findings and number words are amber.
- `leakScorer.test.ts`: one text per kind (exact, case, split, partial, clean); a note with redaction skipped reports every identifier as leaked (ACCEPTANCE T8); a hand-redacted note scores 0; a broken data value stops the run; a failed note stays in Y.
- `attack.test.ts`: about 110 attack cases (phone formats, +91, spaced digits, digits in words, odd emails, dates in words, festivals, Hindi/Marathi titles and relation words, misspelt names, IDs, addresses), plus the 14 open gaps.

## Leak score (code redactor only: no Nano, no dentist check)
- First version (Part B): **24 of 124 leaked (19.4%)**.
- After Part C: **4 of 124 leaked (3.2%)**: Bunty (N24), Rose (N27), Pinky (N30), and one false alarm (N25: the verb "works" in "works at [EMPLOYER]" counts as a piece of "Dummy Steel Works" under the SPECS.md rule; the scorer was left as written).
- **Do not quote 3.2% as the app's score.** The Part C rules were written after reading these same 30 notes, so the number flatters the code. Dr. Yatin should write 10 new synthetic notes that I have not seen and run the scorer on them. The README and video number must come from the T8 page (code + Nano), first full run on the final build.

## Known gaps (all are `it.fails` tests in `attack.test.ts`)
Redactor misses: a single nickname with no cue; a name without capitals after "Patient:" (works after "Patient name:"); Devanagari names with no label; numeric dates with no year ("3/11"); "Nov 26" with no year; weekdays and "the 3rd"; 7-digit landlines; a place name with no cue word.
Guard misses: look-alike letters from other alphabets; an everyday-word name alone in lower case ("rose"); any name the redactor never saw. **The guard cannot find a name nobody hid.** Nano, the amber underline and the dentist's check cover that.
Hidden by mistake (safe side): a row of probing depths or four file sizes without commas look like a phone; a capitalised word after "Patient:" is taken as the name. T5 needs the un-hide button for these.

## CLAUDE.md privacy rules against the code today
| Rule | Result | Note |
|---|---|---|
| 1 Redaction never calls the cloud | Pass | `core/` imports nothing but its own files. No Firebase, no fetch. T4 must keep this |
| 2 Only the approved string leaves | Logic passes, screen not built | `guardedSend` is the one door. T5/T6/T9/T10 must use it |
| 3 Map in memory only | Pass | No storage use anywhere. `TokenMap.toJSON()` prints "[token map hidden]" |
| 4 No console.log of notes | Pass | No console calls outside tests. Test logs print synthetic text only |
| 5 Model replies untrusted | Partly | `restoreLetter` and `checkFacts` exist. Schema validation is T4/T6/T9. Page renders text only |
| 6 Synthetic only | Pass | Banner on the page; all test names are made up |
| 7 No secrets in repo | Pass | `.env.local` is ignored; only `.env.example` is tracked; token not in `dist/` |

## Sonnet: do not change these in `app/src/core/`
- Do not add any import of Firebase, React, a model or `fetch` to `core/`. Model calls come in as function arguments.
- Do not weaken `checkSend`, and do not call the cloud or Firestore except through `guardedSend`. Fill `allowed` only from an explicit un-hide click by the dentist; fill `safeWords` from the two word lists.
- Do not loosen a test to make it pass. Do not delete an `it.fails` test; if one starts passing, move it up.
- Do not change `TOKEN_SOURCE`, the numbering rules, or `restoreLetter` to chained replaces.
- Do not add words to the leak scorer's stop list to improve the score.
- New rules are welcome if they come with tests and the 30-note tests still pass.

## Additions beyond the documents (tell Dr. Yatin if you disagree)
- The code redactor does more than PROMPTS.md section 2 asks: titled names, relation and cue words, misspelt names, IDs, and patterned addresses and organisations. Nano (T4) is still needed for the rest.
- Given name alone matches in any case, except everyday-word names (Hope, Rose, Joy...), which need a capital.
- The guard also checks single words of hidden names, hidden phone digits in any grouping, and squashed spellings. It takes `allowed` and `safeWords` options.
- Three word lists in `data/` are starter lists written by Fable. Dr. Yatin should read them once as a dentist.

## Documents changed
- New: `HANDOVER.md`. Rewritten: `NEXT.md`. `DOCS-CHECK.md`: one dated line added. PLAN.md and ACCEPTANCE.md: not changed (no doc forced a change).
