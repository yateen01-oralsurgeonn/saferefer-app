# NEXT: T1 is DONE (18 Nov). Now T4, then T5 screen

Read `HANDOVER.md` first. The privacy core (T3, T5 guard logic, T7 logic, T8 scorer logic) is built and tested in `app/src/core/`. T1 finished on 18 Nov 2026. **Newest branch: `t1-finish`** (not yet merged). Read the "T1 test results" in `DOCS-CHECK.md` and the two T4 warnings in `HANDOVER.md` before anything else.

## Step 1: T1 is DONE (18 Nov 2026)

Firebase project `saferefer-d5175`, web app `saferefer-web`, App Check (reCAPTCHA Enterprise), AI Logic and the debug token all work. "Say hello" shows an on-device badge in Chrome and a cloud badge in Edge. Build is clean and the debug token is not in `app/dist`. Results of tests a to e are in `DOCS-CHECK.md`:

- a (offline, on-device first): passed. c (no billing needed): passed. e (free limits 15 RPM, 250K TPM, 500 RPD): recorded.
- **b failed:** `ONLY_ON_DEVICE` sends to the cloud when `window.LanguageModel` does not exist. The app must guard (SECURITY A4). **d failed:** the Chrome flag does not turn Nano off.

How to get a no-Nano browser for tests: Edge (no `LanguageModel`), or a fresh Chrome profile through Playwright (`LanguageModel` present, `unavailable`). Never the flag.

## Step 2: T2 banner (10 minutes, same or next session)

The 30 notes are done. The "Synthetic data only: not for real patients" banner is already on the test page. T2 is finished once the real screen (step 4) keeps that banner on every page. No separate work.

## Step 3: T4 Nano redactor

```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T4 and section 7, PROMPTS.md
sections 1, 2 and 6, SECURITY.md rows tagged T4, ACCEPTANCE.md T4.
Do task T4 and nothing else, on branch t4-nano-redactor from t1-finish.

Build app/src/core/nanoRedactor.ts: plain TypeScript, no Firebase import.
It takes the model call as a function argument: (prompt, schema, signal) => Promise<string>.
- Input: the text after redactByCode, and its TokenMap.
- Prompt and JSON schema exactly as PROMPTS.md section 1.
- Validate the reply against the schema. Apply the per-item checks, using
  data/clinical-terms.json and data/drugs.json. Hide the kept items with
  hideValues() from core/tokens.ts. Return the dropped items and notFound items
  so the screen can list them (SECURITY A5).
- Retry once, 20 s timeout, then return state "manual". State is "ok" or "manual",
  never a default. Never call the cloud. Long notes and the 40-item rule as in
  PROMPTS.md section 1 (SECURITY D1, D5).
- Unit tests with a fake model function: good reply, bad JSON twice, timeout,
  an item not in the note, a tooth number returned by mistake, exactly 40 items.
Outside core/, write the small adapter that calls Firebase AI Logic with
InferenceMode.ONLY_ON_DEVICE and responseConstraint, and pass it in.
THE LOCK IS THE ADAPTER, NOT THE SDK (SECURITY A4, tested 18 Nov): in a browser with
no window.LanguageModel the SDK sends ONLY_ON_DEVICE calls to the cloud. So before
every redaction call the adapter must check typeof LanguageModel !== 'undefined' and
await LanguageModel.availability() === 'available'; otherwise throw a fixed error
before any SDK call, so the redactor returns state "manual" and nothing is sent.
Unit-test it: with LanguageModel undefined, fetch is never called.
Do not change the files listed in HANDOVER.md "do not change".
Run the ACCEPTANCE.md T4 test yourself in BOTH no-Nano states (Edge, and a fresh
Chrome profile through Playwright): fixed message, no request to
firebasevertexai.googleapis.com. Do not use the Chrome flag to turn Nano off: it does
not work on Chrome 157.
```

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
