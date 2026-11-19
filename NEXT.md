# NEXT: P3 is DONE (19 Nov). Now T10 offline queue

Read `HANDOVER.md`, `CLAUDE.md` and **`PACKS.md`** first. Newest branch: **`p3-lawyer-pack`** (built on `p2-ca-pack` > `p1-pack-layer` > `t9-tooth-lines` > `t8-leak-test`). T9 and P1 are pushed; P2 and P3 are committed locally. Nothing is merged to master. All three packs (Dentist, Chartered Accountant, Advocate) are done: the profession work is finished, so from here it is the old plan, T10 to T15.

## What P3 built (19 Nov)
- **`core/lawPatterns.ts`:** case and FIR numbers by label ("Crime No. 88/2026", "CC 412/2026", "Civil Suit 55 of 2026", "RCS 77/2024", "sessions case no 19 of 2026"), cheque numbers, CNR, bar enrolment numbers, police stations (both orders; `P.S.` needs its dots so "PS" is not matched), Aadhaar (shared finder `findAadhaarIds` now exported from `caPatterns.ts`). **Settlement sums are hidden** (a sum within 50 characters of "settlement / settled / compromise" in the same sentence, before or after). Claim and cheque amounts stay (`findLawProtect` = `findAmounts` minus settlement sums). Act names, sections, court names, hearing stage stay. A date is never taken for a case number.
- **Pack `law`:** label "Advocate"; letter = a short brief to senior counsel (Re / Forum and stage / Facts recorded / Documents on file / Issue for counsel), no opinion, no prediction, **never cite or recall case law**. **Design fix found while building:** other people's role labels ("Accused:", "defendant ...", "witness ...", "petitioner ...") are `roles`: hidden as PERSON and **never as `[PATIENT]`**, so `[PATIENT]` always means the client (before the fix a note that opened with the other side made them `[PATIENT]` and the letter could mix them up). New `RedactRules.roles`, `Pack.redaction.roles` (CA and dental have `[]`). Client labels: client, litigant, client name. Relation words: opposite party, advocate, counsel, arbitrator, mediator, director, surety, victim.
- **`data/packs/law-notes.json`:** 10 synthetic notes + `keep` lists. `/?leak&pack=law`.
- Tests: 392 pass, 14 expected fail; tsc and build clean; one oxlint warning (unchanged). Production build: 0 hits for any test name.
- **Law leak score, code only (Playwright Chromium, no Nano): 4 of 70 identifiers leaked (5.7%).** All four are known limits: "Pappu" (a nickname alone), "suresh fakeghodke" (lower case), "plot 5, example nagar, fakewadi" (lower case), "village Samplewadi, Taluka Example, District Pune" (no street words). Zero requests; 10 of 10 go to manual mode with the model removed. **Do not quote 5.7%**: same session wrote the notes and the rules (same caveat as dental 3.2% and CA 3.6%). Nano score and fresh notes by Dr. Yatin or the reviewers are the honest numbers.
- **Real cloud run (Advocate, Playwright):** request body held only `[PATIENT]`, `[PERSON_1]`, `[PHONE]`, `[ID]` (cheque no., CC number, **settlement sum**), `[ORG]`, `[DATE_n]`, plus the Act, court and `Rs 3,75,000`; the letter came back with names restored, "Not recorded." for the missing sections, no opinion, no warnings.

## Still to do by Dr. Yatin (small, can wait until after T10)
1. A CA and an advocate he knows each read one synthetic letter (REVIEW.md has their questions). If nobody is free, the video says "reviewed by the builder only".
2. In his own Chrome with Nano: the tooth badge says On-device; `/?leak` for dental, `/?leak&pack=ca`, `/?leak&pack=law` give the Nano scores (about 30 Nano calls for dental, 10 each for the others).
3. 10 fresh notes per profession written by him or the reviewers.

## Step: T10 offline queue
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md, PLAN.md row T10, SECURITY.md rows A6, A7, A12, B1,
ACCEPTANCE.md T10. Do task T10 and nothing else, on branch t10-offline from p3-lawyer-pack.

Goal: Wi-Fi off: redaction still works (it is on-device), tooth lines work (Nano, or rules only),
Send shows "Queued"; Wi-Fi on: the letter arrives by itself.
1. Service worker: precache the app shell only. No runtime caching of POST or Google API calls (A12).
2. Queue: the approved anonymous string and the pack id ONLY (the pack id is needed so the right
   letter words are used when it is sent later). Never the note, the map, the restored letter or a
   name (A7, B1). Storage APIs are used in the queue module alone; grep for them in T13. Choose the
   simplest design that satisfies A7: if Firestore is used, rules are owner uid only, create and
   delete only, size cap, the approved string only, deleted when the letter arrives; a second uid
   cannot read it. If a local-only queue (IndexedDB) satisfies the done-check with no cloud copy,
   prefer it and say so: a smaller privacy surface is better. Decide, tell Dr. Yatin in one line.
3. The retry goes through draftLetter -> guardedSend with the SAME frozen approved string, the guard
   run again (A6 includes the queue write if there is a cloud copy). Any edit to the note clears the
   queued item (A2).
4. Change LETTER_MESSAGES.offline in core/letter.ts to the queued wording from FINISH.md section 1
   only when the queue really exists. Add the "Queued" state to the status line table.
5. The restored letter is built in the browser when the reply arrives, from the map in memory. If the
   page was closed while queued, the names cannot be restored: show the letter with its tokens and
   say so in one fixed sentence. Do not persist the map to avoid this.
Tests: queue unit tests (stores only approved text and pack id; guard blocks a queued text with a
name), offline path with navigator.onLine false, service worker does not cache POST.
Browser check (Playwright offline mode): redact offline, Send -> Queued, back online -> letter.
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T11.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
