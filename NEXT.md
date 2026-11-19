# NEXT: T6 is DONE (19 Nov). Now T7 restore, fact check, edit box, Copy

Read `HANDOVER.md` and `CLAUDE.md` first. **Newest branch: `t6-cloud-letter`** (built on `t5-screen` > `t4-nano-redactor` > `t1-finish`; nothing is pushed or merged).

## What T6 built
- `app/src/core/letter.ts` (plain TypeScript, no SDK): the PROMPTS.md section 3 system instruction (`buildSystemInstruction`, `DEFAULT_TEMPLATE`), `parseLetterReply` (schema check, markdown stripped, empty letter, `["ALL"]` and over 400 words are bad), and `draftLetter(approved, map, modelFn, { signal, guard })`. **Every attempt, including the one retry, goes through `guardedSend`** with the frozen approved string. Quota, App Check and offline errors are not retried. All failures return fixed messages (`LETTER_MESSAGES`); no SDK text, no note text.
- `app/src/letterAdapter.ts`: the only file that calls the cloud letter model (`ONLY_IN_CLOUD`, `inCloudParams` with the model passed in from `firebase.ts`, `responseMimeType` JSON, `responseSchema` built with the SDK's `Schema`). `mapLetterError` reads the HTTP status and error code only.
- `NoteScreen.tsx`: Send now calls `draftLetter`. The right-hand panel then shows the letter as plain text with a "Cloud" badge and a button to flip back to the hidden note. Any edit aborts the call and clears the letter. Failures show the fixed message; a non-blocked failure turns Send into "Try again". `sendStub` is gone.
- **The offline message is "You are offline. Nothing was sent. Connect and try again."** The FINISH.md text says "queued", but the queue is T10. T10 must change that one string in `LETTER_MESSAGES.offline` when it builds the queue.

## T6 test results (19 Nov)
239 tests pass, 14 expected fail (unchanged); `tsc` and build clean; one oxlint warning (`set-state-in-effect`, the effect that starts a run). **ACCEPTANCE T6, real cloud model (Playwright Chrome, project `saferefer-d5175`, note 1 from `data/notes.json`):** one request to `firebasevertexai.googleapis.com/.../gemini-3.5-flash-lite:generateContent`; the body holds `systemInstruction`, `generationConfig`, `safetySettings` and `contents`; the only user text was the approved note (`Patient: [PATIENT]. Phone: [PHONE]. Seen on [DATE_1]. ...`); **zero hits** for Arvind, Testwala, 00000, 55501, 03/11/2026. A letter came back with `[PATIENT]` in it and the "Cloud" badge. A unit test with the real SDK and a fake `fetch` checks the same body; a raw note is blocked before any request. After a letter, one extra space in the note cleared it. No `localStorage` or `sessionStorage` keys.

**Two things about the real letter that T7 or Dr. Yatin should decide (the prompt is "implement as written", so T6 did not change PROMPTS.md):**
1. The letter came back as one run-on paragraph ("Dear Colleague, Re: [PATIENT], Reason for referral: ..."), because the prompt never says one section per line. A one-line addition to PROMPTS.md section 3 ("Put each section on its own line.") would fix it.
2. The model wrote the template line "Closing line: Thank you for seeing this patient." with the words "Closing line:" in it, and it wrote the section headings as "Reason for referral:" labels. The `DEFAULT_TEMPLATE` closing entry should probably be just "Thank you for seeing this patient." with an instruction to write it as the last line.
Also not yet seen: the letter with real Nano on, and a failure screen (offline, quota) by eye. Unit tests cover those messages.

## Step: T7 restore, fact check, edit box, Copy
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T7 and section 7, PROMPTS.md
sections 2 (Restore) and 4, SECURITY.md rows tagged T7 (B1, B4, B5), ACCEPTANCE.md T7,
FINISH.md section 1 (states, colours).
Do task T7 and nothing else, on branch t7-restore-copy from t6-cloud-letter.

The logic already exists and is tested: core/restore.ts (restoreLetter(letter, map) with
near-miss repair and warnings) and core/factCheck.ts (checkFacts(letter, note, lists),
hasRed). Do not rewrite them. Build the screen part:
- After the letter arrives, run restoreLetter with the token map (the ref in NoteScreen).
  Show the restored letter in an EDIT box on the right (plain textarea, spellcheck off).
  The restored letter and the map live in React state/ref only (SECURITY B1).
- Step A warnings (unknown or malformed token: red; [PATIENT] absent: amber) on the raw
  letter; Step B (checkFacts against the dentist's ORIGINAL note, 300 ms debounce, rerun on
  every edit, skipLines = the template headings). Show a banner that lists each warning in
  plain words. Code never deletes or rewrites letter text.
- Copy button: copies the plain letter text only, never the map. Disabled while any red
  warning remains, unless the dentist ticks "I have checked each warning". Sections named
  in not_recorded are shown in grey (not_recorded is on the ParsedLetter already).
- Render as text only, no dangerouslySetInnerHTML (SECURITY B5).
- A note: the fact check needs the ORIGINAL note and the word lists; pass `terms`, `drugs`,
  `shorthand` like NoteScreen does for the amber underline.
Run the ACCEPTANCE.md T7 test yourself in the browser: names snap back; type "tooth 47"
into the letter (not in the note): red warning "Tooth 47 is not in your note" and Copy is
off; delete it: Copy works. Synthetic notes only. Do not change files listed in HANDOVER.md
"do not change". Commit, then rewrite NEXT.md for T8 with its prompt.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
