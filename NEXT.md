# NEXT: T9 is DONE (19 Nov). Now P1 pack layer

Read `HANDOVER.md`, `CLAUDE.md` and **`PACKS.md`** first. Newest branch: **`t9-tooth-lines`** (built on `t8-leak-test`). Nothing is merged to master.

## What T9 built
- `app/src/core/toothLines.ts`: the prompt and schema of PROMPTS.md section 5; `noteToothSet` (code finds the note's FDI teeth; ranges expanded; ages, doses, durations, decimals, times, dates and tokens are not teeth, including "[PATIENT] (36)" and "[PATIENT], 27, was"); `checkTeeth` (drops teeth not in the note, merges duplicates, swaps a finding with an added word or number for the note's own sentence, lists any tooth the model missed with its sentence, keeps only "unnumbered" phrases written in the note); `listTeeth` (every attempt through `guardedSend`, one retry, then rules only).
- `app/src/toothAdapter.ts`: the only tooth-line model call. `PREFER_ON_DEVICE`, same prompt and schema for Nano and cloud, reports `inferenceSource` as "on-device" or "cloud".
- Screen: after Approve, "Teeth in this note" appears with a badge: On-device, Cloud or Rules only. Any edit clears it.
- Tests: 271 pass, 14 expected fail; tsc, build clean; one oxlint warning (unchanged).
- **Browser check, 19 Nov, Playwright Chromium (`LanguageModel` present, `unavailable`):** badge "Cloud"; 36 and 37 listed, "36 years" not listed, "Upper left first molar" under "No tooth number given". The request body held only the prompt around the `[PATIENT]`, `[PHONE]`, `[DATE_1]` text: no name, phone or date. Editing after Approve removed the list and locked Send.
- **Still to do by Dr. Yatin (2 min):** in his own Chrome with Nano on, Approve a note: the badge should say **On-device**. Also still open from T8: the `/?leak` score with Nano.

## Step: P1 pack layer
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md (all of it). Do task P1 and nothing else, on branch
p1-pack-layer from t9-tooth-lines.

Goal: one engine, profession packs as data. Dental behaviour must not change at all.
1. core/packs.ts (no React, no Firebase): a Pack type with id, label, noteLabel, placeholder,
   person cue words, extra ID patterns (added on top of the base patterns, never replacing them),
   letter (system instruction body + section template), item-list kind ('teeth' for dental,
   'citations' for CA and Lawyer, built in P2), safe words, fact lists, test-notes file.
   A function mergePack(base, pack) that can only ADD rules and words: a test proves a pack
   cannot remove a base pattern, turn off the send guard, or the LanguageModel lock.
2. data/packs/dental.json holds today's dental values; DENTAL is the default pack. Move nothing
   that would change dental output: all 271 tests must still pass without edits.
3. Screen: a small dropdown "Profession" at the top with Dentist only for now (CA and Advocate
   come in P2 and P3). Changing it clears the note, the map and any approval.
4. The letter call and tooth lines read the pack. The leak-test page takes ?pack=dental.
Do not change files listed in HANDOVER.md "do not change". Synthetic data only. Commit, then
rewrite NEXT.md for P2 (CA pack) with its prompt, using PACKS.md sections 3, 4 and 7.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
