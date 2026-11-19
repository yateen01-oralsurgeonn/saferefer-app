# NEXT: P2 is DONE (19 Nov). Now P3 Lawyer pack (first thing cut if time runs short)

Read `HANDOVER.md`, `CLAUDE.md` and **`PACKS.md`** first. Newest branch: **`p2-ca-pack`** (built on `p1-pack-layer` > `t9-tooth-lines` > `t8-leak-test`). T9 and P1 are pushed; P2 is committed locally. Nothing is merged to master.

## What P2 built (19 Nov)
- **`core/caPatterns.ts`:** GSTIN (shape match, wrong check character still hidden), TAN, IFSC, CIN, UDIN (with its cue), Aadhaar (Verhoeff check, any spacing), bank account (cue + 9 to 18 digits); `findAmounts` returns the money spans that stay. PAN was already in the base finder.
- **`core/redactRules.ts` + `packRules.ts`:** `RedactRules` (extra ID finders, protected spans, extra relation words, extra header labels, extra not-an-ID prefixes). `redactByCode(note, map, rules)` and `redactFirst(note, hides, rules)` take them; with no rules the output is exactly the old output (all dental tests pass unedited). Pack words are checked by `isSafeWord` (letters, spaces, hyphen only) because they go into regular expressions.
- **Amounts are not hidden:** `Rs 1,85,00,000`, `₹ 7,350`, `Rs 3.4 lakh`, `45 lakh`, `12,50,000/-`, `Rs 12500000` stay; so do section numbers, assessment years and form names (`GSTR-3B`, `ITR-3`, `26AS`, `15CA`). A bare 10-digit number starting 6 to 9 after "Rs" is still hidden as a phone. The send guard takes a `protect` option so a protected amount is not blocked as a phone (hidden phone digits are still searched everywhere).
- **Pack `ca`:** label "Chartered Accountant"; headers `client`, `assessee`, `party`, `client name` (also without a colon: "Salaried client Dinesh ..."); relation words director, proprietor, karta, accountant, auditor, promoter, trustee; letter = case summary for a specialist CA (Re / Matter / Facts recorded / Documents on file / Figures recorded / Question for the specialist), no tax or legal opinion; `facts: 'generic'` (no tooth checks); `items: 'none'`. `LetterText` has a new `writer` field (rule 7); dental text is unchanged.
- **`splitSections`:** the cloud model sometimes returns the letter on one line. When the reply has no line break at all, a space before a section heading becomes a line break. No word changes. Applies to every pack.
- **`data/packs/ca-notes.json`:** 10 synthetic notes (+ a `keep` list of figures that must survive). Leak page: `/?leak&pack=ca`.
- **Production build:** `App.tsx` now loads the leak page with a dynamic import under `import.meta.env.DEV`, so the synthetic test notes (dental AND CA) are no longer in `dist/` (before P2 the dental notes shipped in the bundle; checked: 0 hits for a test name).
- Tests: 342 pass, 14 expected fail; tsc and build clean; one oxlint warning (unchanged).
- **CA leak score, code only (Playwright Chromium, no Nano): 2 of 55 identifiers leaked (3.6%).** Misses: CA06 "Bunty" (a nickname alone), CA09 a lower-case address. Zero requests; 10 of 10 go to manual mode with the model removed. **Do not quote 3.6%:** the CA notes were written by the same session that wrote the rules, so the number flatters the code (same caveat as the dental 3.2%). He needs 10 fresh CA notes he writes himself, and the Nano score.
- **Real cloud run (CA pack, Playwright, two notes):** request body held only tokens (`[PATIENT]`, `[PHONE]`, `[ID]`, `[DATE_1]`...) and the amounts; the letter came back with names restored, figures copied as written, "Not recorded." for gaps, no opinion, no warnings.
- **Still to do by Dr. Yatin:** (1) a CA he knows reads one synthetic letter and says "usable" or not (PACKS.md decision 6); (2) Nano On-device badge and `/?leak` score in his Chrome; (3) 10 fresh CA notes.

## Step: P3 Lawyer pack
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md (all of it). Do task P3 and nothing else, on branch
p3-lawyer-pack from p2-ca-pack. Synthetic data only. STOP if P2 shows a problem you cannot fix by
end of 22 Nov: PACKS.md section 6 says P3 is dropped first.

Copy the P2 pattern exactly (it is the template for any pack):
1. Patterns in core/lawPatterns.ts (plain code, tests, attack cases): case numbers ("Criminal Appeal
   No. 123/2026", "CC 45/2026", "WP 1234 of 2026", "S.C.C. No. 12/2026"), FIR numbers ("FIR No.
   88/2026"), CNR (16 characters: 2 letters, 2 letters, 2 digits, 6 digits, 4 digits year), police
   station names after "P.S." / "police station", Aadhaar and PAN (reuse), bar council enrolment
   numbers ("MH/1234/2015"). All become [ID] tokens. Passed to redactByCode through RedactRules.
2. Pack `law`: label "Advocate", note label "Your case note (stays in this browser)", Nano note kind
   "an advocate's case note", headers client, litigant, petitioner, respondent, accused, complainant,
   witness, plaintiff, defendant; relation words (before a name): opposite party, accused, witness,
   complainant, petitioner, respondent, plaintiff, defendant, advocate, counsel, judge, magistrate.
   Letter = brief to senior counsel (Re: [PATIENT], the client / Forum and stage / Facts recorded /
   Documents on file / Issue for counsel / Thank you line). writer "the advocate".
   noAdviceRule: "No legal opinion, no prediction of outcome, no recommendation, no advice to the
   client." facts: 'generic'; items: 'none'. Add 'law' to PackId, PACKS, validatePack ids.
3. WHAT STAYS (PACKS.md section 3): Act names and section numbers ("Section 138 of the Negotiable
   Instruments Act"), court names ("Bombay High Court", "Sessions Court"), hearing stage ("framing of
   charges"), dates of hearing are HIDDEN as dates (base rule). Claim and cheque amounts stay
   (protect via findAmounts, reuse from caPatterns). Decision for this pack: a sum written near
   "settlement", "settled" or "compromise" is hidden as [ID] (confidential settlement sums,
   PACKS.md section 3 table). Tests for each.
4. data/packs/law-notes.json: 10 synthetic notes + `keep` lists (made-up names with Test/Mock/Fake/
   Sample, 00000 phones, fake case numbers). Add `law` to NOTES_BY_PACK in LeakTest.tsx. Report the
   code-only score and every miss.
5. Same checks as P2: tests for the pack, validatePack, letter instruction keeps the fixed rules and
   has no "dentist/tooth", fact check generic, one real cloud run in Playwright (body anonymous,
   letter has no opinion), production build has 0 hits for a test name.
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T10
(offline queue) with its prompt from this file's earlier version (PLAN.md row T10, SECURITY A7/A12,
ACCEPTANCE T10). If P3 is dropped, say so in PACKS.md and go straight to T10.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
