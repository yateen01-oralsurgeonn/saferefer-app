# NEXT: T4 is DONE (18 Nov). Now T5 screen

Read `HANDOVER.md` first. **Newest branch: `t4-nano-redactor`** (not merged). T4 added `app/src/core/nanoRedactor.ts` (`nanoRedact`, `MANUAL_MESSAGE`, `droppedNotice`, `NanoUnavailableError`), `app/src/nanoAdapter.ts` (`createNanoModelFn(ai)`: the `LanguageModel` lock) and a dev-only test panel `app/src/RedactorCheck.tsx` (shows how to call them; T5 replaces it).

T4 results (final, 19 Nov): 196 tests pass, 14 expected fail (unchanged). **Real Gemini Nano was run** in Dr. Yatin's Chrome 157 (`availability()` = `available`, with and without the language options). On a note with no cue words ("Arvind Testwala was brought in by Tanmay. Kavita called twice about the bill. She mentioned Podar and Wadgaon.") Nano found all five (names as `[PERSON_n]`, Podar and Wadgaon as `[ORG]`, `[ORG_2]`); tooth 36, ibuprofen and 400 mg were untouched; the Network tab with the `firebasevertexai` filter stayed empty. Both no-Nano states pass: real Edge (no `LanguageModel`: zero requests, fixed message) and a fresh Chrome profile (`unavailable`: fixed message, no cloud request). Only the App Check `exchangeDebugToken` fires, at page load.

Found and fixed while testing with real Nano: Nano returns label words ("Patient", "Mrs", "husband") and already-hidden tokens ("[ADDRESS]"). Label words are now dropped (`label-word`), and `itemsToReview(result)` gives the list for the "N suggestions were not applied" notice without that noise: **T5 must use `itemsToReview`, not `dropped + notFound`.** Also fixed in the code redactor: the possessive stays outside the token ("Kulkarni's" -> "[PERSON_1]'s"); it was being swallowed.

Not measured: Nano's miss rate over many notes (that is T8). Without a "Patient:" label the code redactor still gives the first titled name `[PATIENT]` and Nano gives the patient `[PERSON_1]`: fine, but T5 should not assume the patient is always `[PATIENT]`.

T5 hints: call `nanoRedact(codeText, map, createNanoModelFn(ai), lists, { signal })` with an AbortController per run; ignore any result with `aborted: true`; show `droppedNotice(dropped.length + notFound.length)` and the item texts; in `manual` state show `MANUAL_MESSAGE` and require the tick "I hid every name by hand".

## Step 4: T5 screen

```
Read CLAUDE.md, HANDOVER.md, PLAN.md row T5, PROMPTS.md section 2, SECURITY.md
rows tagged T5, ACCEPTANCE.md T5, FINISH.md section 1 (layout and states).
Do task T5 and nothing else, on branch t5-screen from the newest branch.

The send guard is already built: core/sendGuard.ts (checkSend, guardedSend).
Do not rewrite it. Build the screen only:
- Left "Your note (stays in this browser)", right "What the cloud will see".
  Typing on the left runs redactByCode at once, then the Nano redactor (abort
  and bump a run counter on every edit: SECURITY D2).
- Approve freezes the right-hand text. Any edit clears approval. Send is grey
  until Approve. Send calls guardedSend with the frozen string; if it blocks,
  show the fixed message and the word that tripped it (on screen only).
- Hand-hide a selection (becomes PERSON) and un-hide a token. Un-hide adds the
  text to the guard's `allowed` list. Pass both word lists as `safeWords`.
- Manual mode needs the tick "I hid every name by hand"; dropped items need a tick.
- Amber underline for capitalised words that are not hidden (PROMPTS 6.4).
- spellcheck off, autocomplete off. Token map in a React ref only.
For T5, Send may call a stub; the real cloud call is T6.
```

## If something fails
T1 test a passed (offline works), so PLAN.md "step 6 works offline", the SUBMISSION.md offline bullet and the offline demo shot stand. Test b failed in one case (no `LanguageModel`); that is handled by the T4 guard above, so T4 must not be marked done without the guard and its zero-fetch test. If the guard cannot be made to work, stop and tell Dr. Yatin: the whole privacy lock depends on it.
