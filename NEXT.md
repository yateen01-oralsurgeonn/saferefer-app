# NEXT: T5 is DONE (19 Nov). Now T6 cloud letter

Read `HANDOVER.md` and `CLAUDE.md` first. **Newest branch: `t5-screen`** (built on `t4-nano-redactor`, which is on `t1-finish`; nothing is pushed or merged).

## What T5 built
- `app/src/NoteScreen.tsx`: the screen. Left "Your note (stays in this browser)", right "What the cloud will see". The right side shows tokens as clickable chips (click = show that text again, added to the guard's `allowed` list), and capitalised words that are not hidden in amber. "Hide selected words" turns a selection into `[PERSON_n]`.
- Every edit (note, hand-hide, un-hide) starts a new run: `redactFirst` at once (code redactor + hand-hidden words), then Nano after 600 ms, with an `AbortController` and a run counter (SECURITY D2). Approve is off while running.
- Approve needs: Nano finished; the tick "I hid every name by hand" when Nano failed or is not available (D4); the tick "I checked the items listed above" when `itemsToReview` or a failed hand-hide is non-empty (A5). Approval only counts while it equals the right-hand text, so any edit or un-ticked box greys Send again.
- **Send goes through `guardedSend(approved, map, send, { allowed, safeWords })`** with the frozen string. For T5 `send` is `sendStub` in `NoteScreen.tsx` (waits 300 ms, returns true, sends nothing). **T6 replaces `sendStub` with the real letter call. Do not add a second route to the cloud.**
- New core files: `core/screenLogic.ts` (`redactFirst`, `unhideTokens`, `segmentPreview`), tests in `core/__tests__/screenLogic.test.ts`. `App.tsx` shows `NoteScreen`; the old T1 page is `SetupCheck.tsx`, shown only in dev at `/?setup`. The T4 test panel `RedactorCheck.tsx` was removed (the screen does its job).

## T5 test results (19 Nov)
206 tests pass, 14 expected fail (unchanged); build and `tsc` clean; `dist` has 0 hits for the debug token, the setup page or the old test panel. In the browser (Playwright Chrome, no Nano, so manual mode): typing updates the right side; Approve and Send grey until the tick; after Approve, changing one character greys both again; a note with "gopalbhaiya" left in shows "Blocked: an identifier is still in the note. Check: gopalbhaiya"; hand-hide turned it into `[PERSON_1]`; clicking `[PATIENT]` showed "Asha Testpatil" again. No `localStorage` or `sessionStorage` keys, no map or note on `window`, no request to `firebasevertexai`. At 1280x720 the screen fits with no scroll; at 360 px there is no sideways scroll and the Approve/Send bar is fixed at the bottom.

**Not yet checked:** the screen with real Nano on (Dr. Yatin's normal Chrome, `http://localhost:5199/`), in Edge, and by his eye. Known small things: after an un-hide the status line says "You changed the note. Please check it again." (correct, it is an edit); un-hiding a token that had two written forms puts back the longest form; two oxlint warnings remain (`set-state-in-effect` on the effect that starts a run).

## Step: T6 cloud letter
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T6 and section 7, PROMPTS.md
sections 3 and 6 (letter part), SECURITY.md rows tagged T6, ACCEPTANCE.md T6,
FINISH.md section 1 (states and the fixed error messages).
Do task T6 and nothing else, on branch t6-cloud-letter from t5-screen.

Build the letter call:
- app/src/core/letter.ts: plain TypeScript, no Firebase import. It builds the system
  instruction from PROMPTS.md section 3 (default {{TEMPLATE}}), takes the model call as a
  function argument (system, userText, schema, signal) => Promise<string>, validates the
  reply against the schema (letter string, not_recorded string array), strips markdown
  marks, retries once, then returns a fixed failure. Rule 11 of the prompt: an empty
  letter or ["ALL"] is a failure, not a letter. Over 400 words is a failure (PROMPTS 6).
- Outside core/: the adapter that calls Firebase AI Logic with InferenceMode.ONLY_IN_CLOUD,
  inCloudParams.model = CLOUD_MODEL (firebase.ts), generationConfig.responseSchema and
  responseMimeType "application/json". Use the SDK's AbortSignal. The cloud model is named
  only here, never in the redaction files.
- In NoteScreen.tsx replace sendStub with this call. It must still go through guardedSend
  with the frozen approved string, and a retry goes through guardedSend again.
  Show the letter (tokens still in it, text only, no dangerouslySetInnerHTML) and a badge
  "Cloud". Use the fixed messages from FINISH.md for failures. No raw SDK text, no note text.
- T7 (restore names, fact check, copy) is NOT part of this task.
Run the ACCEPTANCE.md T6 test yourself: open the request body in the Network panel (or log
it in a unit test with a fake fetch) and search it for the note's name and phone: zero hits.
Use synthetic notes from data/notes.json only. Do not change files listed in HANDOVER.md
"do not change". Commit, then rewrite NEXT.md for T7 with its prompt.
```

## If something fails
If the cloud model returns the note's own words in a way the guard cannot see, or App Check blocks the call, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
