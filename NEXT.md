# NEXT: finish T1, then T2 banner, T4, T5 screen

Read `HANDOVER.md` first. The privacy core (T3, T5 guard logic, T7 logic, T8 scorer logic) is built and tested in `app/src/core/`. T1 is half done. Newest branch: `partc-hardening`.

## Step 1: finish T1 (needs Dr. Yatin at the keyboard, about 40 minutes)

Before you start: in Chrome set `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` to Enabled, relaunch, press F12, Console, run `await LanguageModel.availability()`. `available` is good. `downloadable`: run `await LanguageModel.create()` and wait. `unavailable`: stop and tell Claude.

Paste into Sonnet 5.5:

```
Read CLAUDE.md, HANDOVER.md, DOCS-CHECK.md and the SECURITY.md rows tagged T1.
Finish task T1. The app in app/ is already scaffolded and the page is written;
do not rebuild it. Work on a new branch t1-finish made from partc-hardening.

1. Walk me through the Firebase console one step at a time and wait after each:
   register a web app in project "saferefer" and give me the config to put in
   app/.env.local; enable Firebase AI Logic with the Gemini Developer API;
   App Check with reCAPTCHA Enterprise, enforcement on for AI Logic; register the
   debug token that is already in app/.env.local (copy it to my clipboard for me,
   do not print it).
2. Run npm run dev in app/ and check the page yourself in my Chrome before you
   say it works: "Say hello" gives a reply and an "on-device" badge.
3. Run the five tests a to e from DOCS-CHECK.md "Not verified" and write each
   result into DOCS-CHECK.md. The page has a dev-only "Test mode" box for
   on-device only and cloud only. If a or b fails, stop and tell me what in
   PLAN.md and SUBMISSION.md must change.
4. Build, then check the debug token value is not in app/dist. Commit.

Rules: no real patient data, no secrets in the repo, report failed tests as failed.
```

Done-check by eye: "Say hello" shows a reply with an "on-device" badge. With the flag off and Chrome relaunched, the same page shows a "cloud" badge.

## Step 2: T2 banner (10 minutes, same or next session)

The 30 notes are done. The "Synthetic data only: not for real patients" banner is already on the test page. T2 is finished once the real screen (step 4) keeps that banner on every page. No separate work.

## Step 3: T4 Nano redactor

```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T4 and section 7, PROMPTS.md
sections 1, 2 and 6, SECURITY.md rows tagged T4, ACCEPTANCE.md T4.
Do task T4 and nothing else, on branch t4-nano-redactor from the newest branch.

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
Do not change the files listed in HANDOVER.md "do not change".
Run the ACCEPTANCE.md T4 test yourself (Nano off: fixed message, zero requests).
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
If T1 test a or b fails, do not go on to T4. Tell Dr. Yatin: PLAN.md "step 6 works offline", the SUBMISSION.md offline bullet and the offline demo shot depend on test a; the whole privacy lock depends on test b.
