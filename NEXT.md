# NEXT: P1 is DONE (19 Nov). Now P2 CA pack

Read `HANDOVER.md`, `CLAUDE.md` and **`PACKS.md`** first. Newest branch: **`p1-pack-layer`** (built on `t9-tooth-lines` > `t8-leak-test`). Nothing is merged to master.

## What T9 and P1 built (19 Nov)
- **T9:** `core/toothLines.ts` + `toothAdapter.ts` (`PREFER_ON_DEVICE`, every attempt through `guardedSend`, code checks decide what is shown, rules-only fallback). After Approve the screen shows "Teeth in this note" with an On-device / Cloud / Rules only badge. Browser check: Cloud badge in Playwright Chromium; the body held only the anonymous prompt; "36 years" not a tooth.
- **P1:** `core/packs.ts`: a `Pack` holds words only (labels, Nano note kind, the variable lines of the letter instruction, the section template, `items: 'teeth' | 'none'`). There is no field that can turn off a lock, and `validatePack()` rejects unknown fields, brackets other than `[PATIENT]`, braces, `<<<` and override words. `buildSystemInstruction(template, letterText)` and `buildPrompt(note, noteKind)` default to dental and give **byte-for-byte the same text as before** (checked). The screen has a Profession dropdown (Dentist only); changing it clears everything. The leak page takes `?leak&pack=dental`.
- Tests: 282 pass, 14 expected fail; tsc and build clean; one oxlint warning (unchanged).
- **Still to do by Dr. Yatin:** (1) in his own Chrome with Nano on, Approve a note: the tooth badge should say **On-device**; (2) the `/?leak` score with Nano.

## Step: P2 CA pack
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md (all of it). Do task P2 and nothing else, on branch
p2-ca-pack from p1-pack-layer. Synthetic data only.

1. Patterns (core/, plain code, with tests and attack cases): PAN (5 letters, 4 digits, 1 letter;
   4th letter one of P C H F A T B L J G), GSTIN (15 chars: 2-digit state code 01-38, a PAN, an
   entity digit, Z, a check character; verify the check character), TAN, Aadhaar (12 digits,
   Verhoeff check, any spacing), bank account (9-18 digits after a cue word: a/c, account,
   acct), IFSC (4 letters, 0, 6 characters), UDIN, CIN. All become [ID] tokens. They are added
   to redactByCode through an option (extra finders), so the dental output does not change:
   the dental tests must still pass without edits.
2. Pack text: label "Chartered Accountant", note label "Your client note (stays in this
   browser)", Nano note kind "a chartered accountant's client note", letter = "case summary for
   a specialist chartered accountant" with sections (Re: [PATIENT]; Matter; Facts recorded;
   Documents on file; Figures recorded; Question for the specialist; Thank you line). personRule:
   "[PATIENT] stands for the client. Refer to them as [PATIENT] or "the client"."
   noAdviceRule: "No tax or legal opinion, no recommendation, no advice to the client."
   items: 'none' for now. Add 'ca' to PackId, PACKS and the dropdown.
3. AMOUNTS ARE NOT HIDDEN (PACKS.md decision 1). Section numbers (143(1), 194C), assessment
   years (AY 2025-26), form names (ITR-3, GSTR-3B) stay. Add tests that prove each one stays.
4. Person words for Nano and the redactor's relation list: client, director, partner,
   proprietor, karta, accountant, auditor (added, never replacing the dental list).
5. data/packs/ca-notes.json: 10 synthetic notes, each with its identifier list, in the same
   shape as data/notes.json. Made-up names with "Test"/"Mock"/"Fake"/"Sample", 00000 phones,
   PANs and GSTINs that are valid in shape but clearly fake (e.g. AAAPT0000T style).
6. Leak page ?leak&pack=ca runs those 10 notes. Report the code-only score and every miss.
7. Fact check: generic number/date/word checks only for CA (no tooth checks).
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for
P3 (Lawyer pack) with its prompt. If P2 is not passing by end of 21 Nov, stop and tell Dr. Yatin:
P3 is dropped first (PACKS.md section 6).
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
