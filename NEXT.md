# NEXT: T8 is DONE (19 Nov). Now T9 tooth lines

Read `HANDOVER.md` and `CLAUDE.md` first. **Newest branch: `t8-leak-test`** (built on `t7-restore-copy` > `t6-cloud-letter` > `t5-screen` > `t4-nano-redactor` > `t1-finish`; t7 is pushed, t8 is committed locally, nothing is merged to master).

## What T8 built
- `app/src/LeakTest.tsx`, open **`/?leak`** (DEV only, removed from the production build): "Run the test" runs the 30 notes in `data/notes.json` through the same path as the screen (`redactFirst`, then `nanoRedact` if `nanoIsReady()`), scores with the existing `core/leakScorer.ts` (`runLeakTest`), and shows the headline "Identifiers leaked: X of Y", the percent, a by-type table and EVERY miss with note id, kind and context. The mode line says whether Nano was in the run.
- `app/src/leakRun.ts`: `makeRedact`, `withFetchCount` (counts `fetch` calls), `withoutLanguageModel`, `checkNoModel`. A Nano run that goes manual is listed as a failed note and scored on the code-only text.
- Two PASS/FAIL lines: zero requests during the whole run; and with `LanguageModel` removed, zero requests and 30 of 30 notes go to manual mode (D3, A4, real adapter).
- Tests: 244 pass, 14 expected fail; tsc and build clean; one oxlint warning (unchanged).
- **Result in Playwright Chromium (no Nano, so code only): Identifiers leaked: 4 of 124 (3.2%)**, misses N24 Bunty, N27 Rose, N30 Pinky (names), N25 an organisation (partial); both checks PASS.
- **Still to do by Dr. Yatin: open `http://localhost:5199/?leak` in his Chrome (Nano on) and press Run.** That score (with Nano) is the number for README and video. Nano needs about 30 calls, so it takes a while. Write the score here and in the memory file.

## Step: T9 tooth lines
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T9, PROMPTS.md section 5 (tooth-line prompt and
its code checks), SECURITY.md row A3, ACCEPTANCE.md T9, FINISH.md section 1.
Do task T9 and nothing else, on branch t9-tooth-lines from t8-leak-test.

Plain logic goes in core/toothLines.ts (no React, no SDK): the prompt builder, the schema, the
code checks from PROMPTS.md section 5 (build the note's FDI tooth set in code, drop entries
outside it, merge duplicates, drop findings that hold a numeral or a 4+ letter word not in the
note, ages and doses are not teeth), and a function that takes the model call as an argument.
The adapter (app/src/toothAdapter.ts) is the only file that calls a model: mode PREFER_ON_DEVICE
(Nano first, cloud fallback), same prompt and schema for both, and it reports which one ran
(inferenceSource). The input is ONLY the approved anonymous string after Approve, and every
attempt goes through guardedSend, including the cloud fallback. Never run it while the dentist
types. After Approve, show the tooth list with a badge "on-device" or "cloud". Every tooth
listed must be in the note; "36 years" is not a tooth. Failure shows a fixed message, no SDK text.
Test: with Nano off (LanguageModel undefined) the badge says "cloud" and the request body holds
only the approved anonymous note. Synthetic notes only. Do not change files listed in
HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T10 with its prompt.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
