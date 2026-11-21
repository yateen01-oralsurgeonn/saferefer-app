# LEAK-RESULTS: measured scores of the redactor (SafeRefer)

Each row is one run of the leak-test page. Numbers come from the page, not from a unit test. The README quotes this file.
**Read the caveat first:** the code rules were written by the same session that wrote the synthetic notes, so the scores below are flattered. The honest numbers come from notes nobody has seen (see "Fresh-note runs", still empty).

## Runs on the builder's notes
| Date | Profession | Notes | Mode | Leaked | Where measured |
|---|---|---|---|---|---|
| 19 Nov 2026 | Dentist | 30 | code only (Playwright, no Nano) | 4 of 124 (3.2%) | Playwright Chromium |
| 19 Nov 2026 | CA | 10 | code only | 2 of 55 (3.6%) | Playwright Chromium |
| 19 Nov 2026 | Advocate | 10 | code only | 4 of 70 (5.7%) | Playwright Chromium |
| 20 Nov 2026 | **Dentist** | 30 | **code + Gemini Nano** | **1 of 124 (0.8%)** | Dr. Yatin's own Chrome |
| 20 Nov 2026 | **CA** | 10 | **code + Gemini Nano** | **1 of 55 (1.8%)** | Dr. Yatin's own Chrome |
| 20 Nov 2026 | **Advocate** | 10 | **code + Gemini Nano** | **1 of 70 (1.4%)** | Dr. Yatin's own Chrome |

### Dentist, code + Nano, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests during the whole run (PASS). With the on-device model removed, 0 requests and 30 of 30 notes went to manual mode (PASS).
- By type: names 0 of 41, phones 0 of 27, dates 0 of 22, dates of birth 0 of 6, emails 0 of 6, record IDs 0 of 5, addresses 0 of 8, relatives 0 of 4, organisations 1 of 5.
- **The one miss: N25, organisation, "partial", left in the text: ", works at".** This is the known scorer case: the note says "works at Dummy Steel Works"; the employer is hidden as `[EMPLOYER]`, but the scorer counts the verb "works" (a piece of the organisation's name) as a partly left word. The organisation name itself is not in the text. It is reported as the page shows it, not corrected.

### CA, code + Nano, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- By type: names 0 of 10, phones 0 of 8, IDs 0 of 10, dates 0 of 8, organisations 0 of 7, relatives 0 of 5, emails 0 of 3, dates of birth 0 of 1, addresses 1 of 3.
- **The one miss: CA09, address, "partial": ", office at shop 12,"** (the note is typed all in lower case, "office at shop 12, example plaza, fakepur"). Part of the address was left. With code alone this note leaked the whole address and the nickname "Bunty" in CA06; Nano caught "Bunty" and most of the address.

### Advocate, code + Nano, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- By type: names 0 of 9, IDs and case numbers 0 of 13, organisations 0 of 6, dates 0 of 13, phones 0 of 7, relatives 0 of 11, amounts (settlement sums) 0 of 3, emails 0 of 2, dates of birth 0 of 1, addresses 1 of 5.
- **The one miss: LW08, address, "partial": "lives at plot 5,"** (again a note typed all in lower case, "plot 5, example nagar, fakewadi"). With code alone this run leaked 4 of 70 ("Pappu", a lower-case witness name, two addresses); Nano caught the nickname, the witness and one address.

### What the three Nano runs have in common
Both new misses are **lower-case street addresses** in notes typed entirely in lower case. That is the weak spot to state in the README: a lower-case address with no capital letters is the hardest thing for the redactor, and the dentist's check is the real control.

## Fresh-note runs (notes the builder has not seen)
Notes written by Dr. Yatin on 20 Nov 2026 following `data/fresh/HOW-TO-WRITE-FRESH-NOTES.md`. No redactor rule was changed before the first run. Test data: `data/fresh/dental-fresh.json`; open `/?leak&pack=dental&set=fresh`.
One marking correction was made to the test data BEFORE any run, never to a rule: in note 7 the word "aai" (Marathi for "mother", marked as a relative) is a relation word, not an identifier, so it is not scored. Note 2 keeps "aai" unmarked as written.

| Date | Profession | Notes | Mode | Leaked | Where measured |
|---|---|---|---|---|---|
| 20 Nov 2026 | Dentist | 10 (46 identifiers) | code only | **20 of 46 (43.5%)** | Playwright Chromium (no Nano) |
| 20 Nov 2026 | **Dentist** | 10 (46 identifiers) | **code + Gemini Nano** | **8 of 46 (17.4%)** | Dr. Yatin's own Chrome |

### Dentist fresh notes, code only (first run, 20 Nov 2026)
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- By type: names 7 of 8 leaked, addresses 5 of 8, dates 4 of 7, organisations 3 of 6, relatives 1 of 8; **phones 0 of 6, emails 0 of 1, dates of birth 0 of 1, record IDs 0 of 1**.
- **What this shows:** the code rules find structured things (phones, emails, IDs, DOB) but not names that are not introduced by a label or a title. In the builder's notes the patient name always followed "Patient:" or a title; in these fresh notes names start the note ("rahul bhau came...", "P. K. Jadhav - ...", "Anjali Patil anjali.patil.fake@...", "Suresh M (", "nikita came...", "Vikram Thorat - ...", "Kavita S. came..."), and addresses and employers written without cue words (behind bus stand, near water tank, Shirdi road) are left. The builder-note score of 3.2% (code only) was therefore **flattered by about 13 times**; the code-only score on notes nobody tuned for is 43.5%.
- That is the job Gemini Nano does; the Nano run on the same notes (next row) is the number that matters.

## Wi-Fi-off check on Dr. Yatin's laptop (20 Nov 2026)
- **First real run: FAILED.** With Wi-Fi off, Send showed "The letter could not be written. Nothing was lost. Please try again." instead of "queued".
- **Cause:** the cloud call first fetches an App Check token; with no connection that step fails with `appCheck/fetch-network-error`, and the AI SDK reports it as a bare "error" the app did not recognise. The laptop also keeps `navigator.onLine` true (virtual adapters), so the "back online" event would never have fired either.
- **Fix (commit after 85f0e57):** the adapter reads that one App Check code (never the message text) and treats a network failure as offline and a refusal as "could not be verified"; a queued letter is retried every 10 seconds, quietly, and stays queued while the network is down. 5 new tests. Reproduced in a browser by blocking the internet while it still reported "online": queued, stayed queued through retries, and the letter arrived 7 s after the network returned.
- **Repeated on his laptop after the fix (20 Nov 2026): PASSED, "as expected"** (Dr. Yatin: Send showed queued with Wi-Fi off, and the letter arrived by itself when Wi-Fi came back).

### CA fresh notes, code only (first run, 20 Nov 2026)
Notes received on WhatsApp on 20 Nov 2026 in reply to `review/WHATSAPP-CA.txt`; test data `data/fresh/ca-fresh.json` (10 notes, 56 identifiers); open `/?leak&pack=ca&set=fresh`. No rule changed before the run. Marking corrections made to the test data BEFORE the run (never to a rule): in note 7 the relation words "aai" (mother) and "bhau" (brother) were marked as names; they are not identifiers and are not scored.
**Provenance caveat:** several names and places in these notes are copied from the dentist fresh notes or from the example in the WhatsApp message (Rakesh bhau, Sai Traders, P. K. Jadhav, Anjali Patil, Vikram Thorat, Kavita S., Sai Medical Stores, Shree Datta Dairy, Baburao, Omkar). The reply also says the sender never received the review sheet. So these notes are less independent than a CA's own; the scores are valid for the text as given, but should not be described as "written by a practising CA" unless the CA confirms it.
- **Code only: 26 of 56 leaked (46.4%).** Zero requests (PASS); 10 of 10 manual with the model removed (PASS).
- By type: **phones 0 of 8, record IDs 0 of 10 (PAN, GSTIN, TAN, CIN, bank account, IFSC), emails 0 of 1: all hidden.** Names 11 of 14, organisations 8 of 11, addresses 4 of 4, dates 3 of 8 leaked.
- Same pattern as the dentist fresh notes: the structured identifiers are found by code; names, business names and street addresses with no label are not. Nano is the next run.

| Date | Profession | Notes | Mode | Leaked | Where measured |
|---|---|---|---|---|---|
| 20 Nov 2026 | CA (fresh) | 10 (56 identifiers) | code only | **26 of 56 (46.4%)** | Playwright Chromium (no Nano) |
| 20 Nov 2026 | **CA (fresh)** | 10 (56 identifiers) | **code + Gemini Nano** | **7 of 56 (12.5%)** | Dr. Yatin's own Chrome |

### Advocate fresh notes, code only, BEFORE any fix (first run, 20 Nov 2026)
Notes received on WhatsApp on 20 Nov 2026 in reply to `review/WHATSAPP-LAW.txt`; test data `data/fresh/law-fresh.json` (10 notes, 69 identifiers); open `/?leak&pack=law&set=fresh`. Taken BEFORE the two planned rule fixes (relative dates, landmark address phrases), so that this set can show whether the fixes generalise: the fixes are designed from the dentist and CA misses only, with no advocate-specific rule. (The advocate misses below were seen by the builder before the post-fix run; no rule was added for them.)
Marking correction made to the test data BEFORE the run (never to a rule): note 4's "aai" (mother) is a relation word and is not scored. Provenance caveat as for the CA notes: many names are reused from the dentist notes and the WhatsApp example; the reply again says the sender never received the review sheet, so no review answers exist yet.
- **Code only: 23 of 69 leaked (33.3%).** Zero requests (PASS); 10 of 10 manual with the model removed (PASS).
- By type: **phones 0 of 9, case / FIR / cheque / enrolment numbers 0 of 10, emails 0 of 1, organisations 0 of 2, settlement sums 0 of 3: all hidden.** Names 11 of 27, addresses 7 of 7, dates 5 of 10 leaked.
- Same pattern as the dentist and CA fresh sets.

| Date | Profession | Notes | Mode | Leaked | Where measured |
|---|---|---|---|---|---|
| 20 Nov 2026 | Advocate (fresh) | 10 (69 identifiers) | code only, pre-fix | **23 of 69 (33.3%)** | Playwright Chromium (no Nano) |
| 20 Nov 2026 | **Advocate (fresh)** | 10 (69 identifiers) | **code + Gemini Nano, PRE-FIX** | **11 of 69 (15.9%)** | Dr. Yatin's own Chrome |

### Dentist fresh notes, code + Nano, Dr. Yatin's Chrome (20 Nov 2026) - the number to quote
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- **Names 0 of 8, relatives 0 of 8, organisations 0 of 6, phones 0 of 6, emails 0 of 1, dates of birth 0 of 1, record IDs 0 of 1 leaked.** Nano turned 20 code-only leaks into 8: every name, relative and employer or school was caught, including the ones with no label ("rahul bhau", "nikita", "Vikram Thorat -", "Kavita S.").
- **What is left (8): two kinds.**
  - **Dates written without a year or as a weekday (4 of 7):** "3/11" (F02), "last Tuesday" (F03), "Monday" (F07), "5/1" (F08). These are the "numeric date with no year" and "weekday" gaps already listed in HANDOVER.md as known; Nano does not fix them.
  - **Street landmarks (4 of 8 addresses, all "partial"):** the lead words of an address are left behind while the place name is hidden: "stays behind", "near water tank,", "near", "Lives behind" (F02, F06, F08, F09). The place name itself ("Loni", "Rahata", "Sangamner") was hidden.
- **Honest summary for the README:** on 10 notes written by a dentist the builder had not seen, 8 of 46 identifiers (17.4%) were left with the code rules plus Nano; names, phones, emails, IDs and employers were all hidden; relative dates and the leading words of landmark addresses were not. The dentist's check before Approve is the real control.
- **Not yet done:** no rule has been changed after these runs. Any later improvement will be recorded as made after seeing these notes (so a later score on the same notes is flattered).

### CA fresh notes, code + Nano, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- **Names 0 of 14, phones 0 of 8, record IDs 0 of 10 (PAN, GSTIN, TAN, CIN, bank account, IFSC), emails 0 of 1 leaked.** Nano turned 26 code-only leaks into 7: all names were caught, including unlabelled ones ("Rakesh bhau", "priya madam", "suresh kaka", "nikita").
- **What is left (7):** the same two families as the dentist fresh notes.
  - **Dates without a year or as a weekday (3 of 8):** "3/11" (F01), "last Tuesday" (F04), "Monday" (F07).
  - **Landmark or place words of an address (3 of 4, "partial"):** "She stays near" (F02), ", Sangamner." left after "opp. Hanuman mandir" was hidden (F05), "He lives behind bus stand," (F10).
  - **One organisation "partial" (F07):** the generic word "boutique" left in "her boutique" after "Nikita Boutique, Kopargaon" was hidden (a scorer false alarm of the "works" kind: the name itself is not in the text).
- The caveats on the CA notes' provenance (see above) still apply.
- **Pattern across both fresh sets (dentist 8 of 46, CA 7 of 56): the remaining leaks are almost all (a) short or relative dates and (b) the leading words and place names of landmark addresses.** Names, phones, emails and every ID were hidden. No rule has been changed after any of these runs.

### Advocate fresh notes, code + Nano, PRE-FIX, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests (PASS); 10 of 10 notes manual with the model removed (PASS).
- **Names 0 of 27, phones 0 of 9, case / FIR / cheque / enrolment numbers 0 of 10, emails 0 of 1, organisations 0 of 2, settlement sums 0 of 3 leaked.** Nano turned 23 code-only leaks into 11.
- **What is left (11): the same two families, nothing else.** Dates 5 of 10 ("3/11", "last Tuesday", "Monday", "5/1", "Monday"); addresses 6 of 7, all "partial" landmark words ("at near", "Sangamner", "near behind bus stand", "near water tank", "at behind", "near Sai baba chowk").
- This is the PRE-FIX number: taken before the two planned rule fixes. It is the clean comparison for the post-fix advocate run.

## Summary of all three fresh sets before any rule fix (20 Nov 2026, code + Nano, Dr. Yatin's Chrome)
| Set | Identifiers | Leaked | Names | Phones | IDs / case numbers | Dates | Addresses |
|---|---|---|---|---|---|---|---|
| Dentist | 46 | 8 (17.4%) | 0 | 0 | 0 | 4 of 7 | 4 of 8 |
| CA | 56 | 7 (12.5%) | 0 | 0 | 0 | 3 of 8 | 3 of 4 |
| Advocate | 69 | 11 (15.9%) | 0 | 0 | 0 | 5 of 10 | 6 of 7 |

## The two rule fixes made after the fresh-note runs (20 Nov 2026, branch t12c-gaps)
**These fixes were designed from the dentist and CA misses, with no rule specific to the advocate notes, so the advocate set is the clean test of whether they generalise.** (The builder saw the advocate misses before the post-fix run; none of them led to an advocate-specific rule.) Scores on the dentist and CA fresh notes AFTER the fixes are flattered: the fixes were written after seeing those notes.

1. **Dates with no year and weekdays used as dates** (`patterns.ts`): "3/11", "5/1", "3-11" (a day and a month that is not a fraction such as 1/2, 3/4, 2/3 and not two tooth numbers such as 11/12, unless a cue word like "on", "seen", "hearing" comes right before); "last Tuesday", "next Friday", "on Monday", "hearing Monday" (a weekday only with a cue before it, so "free on any Friday" and "Monday clinic" are kept). The old "known gap" test for numeric dates moved up to a passing test; the weekday half of the old weekday test moved up; "the 3rd" stays a known gap (it can mean "the 3rd molar").
2. **Landmark address phrases** (`places.ts`): "near Ganesh mandir", "behind bus stand", "opp. Hanuman mandir", "near water tank", "behind ZP school", "near Sai baba chowk", "near railway crossing" (a cue word, up to three words, a landmark noun) and house numbers ("Flat 4", "plot 5", "shop 12"); the place name after a comma was already followed by the existing tail rule. Words that are also clinical are not landmark nouns ("temple", "bridge", "signal", "field", "lake"), and 12 clinical phrases with the same cue words are tested to stay untouched ("near 36", "near the ear", "behind the lower molar", "next to the bridge abutment", "near the temple joint", "nerve block 2 ml").

### Code only, before and after the fixes (Playwright Chromium, no Nano)
| Set | Before | After | Dates | Addresses |
|---|---|---|---|---|
| Dentist fresh (flattered) | 20 of 46 (43.5%) | 11 of 46 (23.9%) | 4 of 7 to 0 | 5 of 8 to 1 |
| CA fresh (flattered) | 26 of 56 (46.4%) | 21 of 56 (37.5%) | 3 of 8 to 0 | 4 of 4 to 2 |
| **Advocate fresh (clean test)** | **23 of 69 (33.3%)** | **11 of 69 (15.9%)** | **5 of 10 to 0** | **7 of 7 to 0** |
- **The advocate set improved with no advocate-specific rule:** every date and every address is now hidden by code alone; all 11 remaining code-only leaks are names, which Gemini Nano handles.
- **No regression on the builder notes:** dentist 4 of 124, CA 2 of 55, advocate 4 of 70 (identical to before).
- 552 unit tests pass (13 known-gap tests remain, two fewer than before).

### Nano re-runs AFTER the two fixes, Dr. Yatin's own Chrome (20 Nov 2026) - the numbers to quote
All three runs: zero requests (PASS); 10 of 10 notes manual with the model removed (PASS); mode "code redactor plus Gemini Nano on this device".

| Set | Identifiers | Before the fixes (code + Nano) | **After the fixes (code + Nano)** | Status of the number |
|---|---|---|---|---|
| Dentist fresh | 46 | 8 (17.4%) | **1 (2.2%)** | flattered (fixes written after seeing these notes) |
| CA fresh | 56 | 7 (12.5%) | **2 (3.6%)** | flattered |
| **Advocate fresh** | 69 | 11 (15.9%) | **0 (0.0%)** | **clean test: no rule was written for it** |

- **Every name, phone, email, date, record ID, case number, settlement sum, relative and address was hidden in all three sets.** The only leftovers are generic words left after the name itself was hidden, which the scorer counts as "partial":
  - Dentist F07: the word "College:" after "Pravara College" was hidden.
  - CA F02: "She stays near" (the landmark after it was hidden; the lead-in words alone carry no information).
  - CA F07: the word "boutique" in "her boutique" after "Nikita Boutique, Kopargaon" was hidden.
- **How to quote this honestly:** "On 25 fresh synthetic notes written by a dentist and a helper, 3 of 171 identifiers were left (1.8%) with the code rules plus Gemini Nano; the three leftovers were generic words, not names, numbers or places." Add: only the advocate set (0 of 69) is a test of fixes written without seeing it; 10 notes per profession is a small set; 0 leaked on it is not "never leaks"; the dentist's check before Approve is the real control.
- **Still true:** the numbers are for English notes with Roman-script Marathi/Hindi words, typed by one dentist and helpers; a real clinic note can be messier.

## All results at a glance (code + Gemini Nano on Dr. Yatin's Chrome unless stated)
| Set | Leaked | Note |
|---|---|---|
| Dentist builder notes (30) | 1 of 124 (0.8%) | written by the builder: flattered |
| CA builder notes (10) | 1 of 55 (1.8%) | flattered |
| Advocate builder notes (10) | 1 of 70 (1.4%) | flattered |
| Dentist fresh, before fixes | 8 of 46 (17.4%) | fresh |
| CA fresh, before fixes | 7 of 56 (12.5%) | fresh |
| Advocate fresh, before fixes | 11 of 69 (15.9%) | fresh |
| Dentist fresh, after fixes | 1 of 46 (2.2%) | flattered by the fixes |
| CA fresh, after fixes | 2 of 56 (3.6%) | flattered by the fixes |
| **Advocate fresh, after fixes** | **0 of 69 (0.0%)** | **clean generalisation test** |

## Harness runs (generated notes), code rules only: baselines of 20 Nov 2026
Source: `harness/baselines/*.json`, produced by `npm run harness` (app/). Generated notes from `harness/gen-notes.ts` (seed 20261121): per profession 200 TUNE + 100 LOCKED, sealed with SHA-256 (`data/harness/SEAL.json`). Generated notes are more regular than real ones: do not quote these as "real-world". No rule was changed before these runs; `LEAK-TARGETS.md` was committed before the first locked run (commit 96a38a1).

| Set | Notes | Identifiers | Leaked (code only) | Names | Dates | ID numbers | Phones / emails / DOB |
|---|---|---|---|---|---|---|---|
| tune dental | 200 | 888 | 276 (31.1%) | 136/200 | 12/211 | 6/20 | 0 |
| tune CA | 200 | 1,104 | 212 (19.2%) | 101/176 | 9/158 | 24/323 | 0 |
| tune law | 200 | 1,080 | 253 (23.4%) | 113/167 | 15/197 | 7/204 | 0 |
| **locked dental** | 100 | 412 | **133 (32.3%)** | 66/100 | 5/98 | 1/13 | 0 |
| **locked CA** | 100 | 536 | **117 (21.8%)** | 50/83 | 5/87 | 14/161 | 0 |
| **locked law** | 100 | 558 | **123 (22.0%)** | 62/87 | 7/118 | 2/113 | 0 |

- **Reading:** the code rules never miss a phone, email, DOB or amount, and do not over-hide (0 to 2 "keep" strings lost per set). Free names (no label, nickname, relative) are mostly left for Gemini Nano, as designed; that is why the code-only name rate is 60 to 70%.
- **Against `LEAK-TARGETS.md` section A (locked, code only):** phones and emails 0 = **met**; over-redaction at most 2% = **met** (1 of 252 at worst); structured types at most 2% each = **missed for dates (5.1 to 5.9%) and ID numbers (CA 8.7%, dental 7.7%, law 1.8%)**.
- **Gaps seen on the TUNE sets (not the locked ones):** dates written month-first ("December 16"), clinic record numbers ("OPD 2090"), CA ID numbers typed in lower case, advocate enrolment numbers ("MAH/1754/2018"). Fixing them is tuning on the tune set and will be marked post-hoc.
- **Not run yet:** Nano passes on these sets (by hand, `/?leak&pack=<dental|ca|law>&set=<tune|locked>`), and the hand-written locked set.
- **Gate:** `npm test` fails if any set gets worse than its baseline (checked once by weakening the phone rule: 6 of 7 gate tests failed; reverted).

### Relabelled baselines (20 Nov 2026, after the review, approved by Dr. Yatin)
Two labelling bugs in the generator were fixed **before any rule was tuned**, and the sealed files were regenerated with his approval (`--force-locked`): (1) one dental opener tagged only the first name and left the surname untagged, so a leaked surname was not counted (flattering); (2) a nickname with a respect word ("Sonu bhau") was tagged as one name, so a left-behind "bhau" counted as a leak (a false alarm; the redactor treats these words as relation words, and so did the fresh-note labels). **Every note's text is byte-for-byte unchanged**; only labels changed (159 respect-word splits, 29 surnames now tagged; checked note by note). New seal hashes in `data/harness/SEAL.json`. The table above is superseded by this one.

| Set | Notes | Identifiers | Leaked (code only) | Names | Dates | ID numbers |
|---|---|---|---|---|---|---|
| tune dental | 200 | 888 | 273 (30.7%) | 136/200 | 12/211 | 6/20 |
| tune CA | 200 | 1,104 | 209 (18.9%) | 101/176 | 9/158 | 24/323 |
| tune law | 200 | 1,080 | 251 (23.2%) | 113/167 | 15/197 | 7/204 |
| **locked dental** | 100 | 412 | **130 (31.6%)** | 66/100 | 5/98 | 1/13 |
| **locked CA** | 100 | 536 | **113 (21.1%)** | 50/83 | 5/87 | 14/161 |
| **locked law** | 100 | 558 | **122 (21.9%)** | 62/87 | 7/118 | 2/113 |

Phones, emails, DOB and amounts: still 0 leaked on every set. Against `LEAK-TARGETS.md` section A the picture is unchanged: phones/emails 0 and over-redaction at most 2% **met**; dates and ID numbers above 2% **missed**.

### After the four code-rule fixes (20 Nov 2026, approved by Dr. Yatin; POST-HOC on the tune sets)
Made from the **TUNE-set misses only** (all 73 structured tune misses had one of four causes; the locked misses were never opened): (1) a month written in full is a date even when the day looks like a tooth number ("December 16"; short forms like "Dec 16" still need a year, "rd/th" or a date word); (2) a bare "OPD 2090" / "IPD 44512" is an ID; (3) PAN, TAN and IFSC typed in lower case; (4) bar enrolment numbers in lower case ("mah/1754/2018"). 23 new unit tests, including cases each fix must leave alone; one old known gap ("Seen Nov 26") now passes and moved up.

| Set | Identifiers | Leaked (code only) | Names | Dates | ID numbers | "Keep" lost |
|---|---|---|---|---|---|---|
| tune dental | 888 | 255 (28.7%) | 136/200 | 0/211 | 0/20 | 0 of 0 |
| tune CA | 1,104 | 176 (15.9%) | 101/176 | 0/158 | 0/323 | 0 of 383 |
| tune law | 1,080 | 229 (21.2%) | 113/167 | 0/197 | 0/204 | 2 of 111 |
| **locked dental** | 412 | **125 (30.3%)** | 66/100 | 1/98 | 0/13 | 0 of 0 |
| **locked CA** | 536 | **94 (17.5%)** | 50/83 | 0/87 | 0/161 | 1 of 252 |
| **locked law** | 558 | **113 (20.3%)** | 62/87 | 0/118 | 0/113 | 0 of 61 |

- **Locked, measured once after the fix:** dates 1 of 98 / 0 of 87 / 0 of 118 and ID numbers 0 on all three: the `LEAK-TARGETS.md` section A target (each structured type at most 2%) is now **met** on all three locked sets. Over-redaction did not change.
- **Caveat:** the locked notes come from the same generator as the tune notes, so this improvement was expected; it shows the fixes did not over-fit single notes, not that they generalise to real notes. Hand-written locked notes are the real test.
- **Earlier sets unchanged** (code only, checked before and after the fix): builder notes 4/124, CA 2/55, law 4/70; fresh notes 11/46, 21/56, 11/69. The text passed to Nano on those notes is the same, so the fresh-note Nano results (1/46, 2/56, 0/69) still stand.
- **Not live yet:** the hosted site runs the build from before these fixes. A redeploy after merging to master puts them live (then repeat the live check).

## Nano passes, 21 Nov 2026 (his Chrome, Nano on, `npm run dev`)
| Set | Mode | Identifiers | Leaked | Names | Address | Org | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|
| tune dental (200 notes) | code + Nano, run 1 | 888 | 11 (1.2%) | 3 | 7 | 1 | 0 PASS | 200/200 PASS |

- Nano failed on 1 note (DENTAL-000); that note was scored on code only. Its miss is "Sonu bhau" (name).
- Code-only on the same set after the rule fixes was 255 of 888 (28.7%), so Nano removed about 96% of what the code rules left.
- Misses are mostly partial addresses ("near", "Market Yard", "Hadapsar") and partial surnames (ghule, phadke). Zero phones, emails, dates, DOBs, record IDs.
- TUNE set only: the targets in LEAK-TARGETS section B apply to the LOCKED sets. Single run; the spread over 3 runs is not measured yet.

### Locked dental, code + Nano, run 1 (21 Nov 2026)
| Set | Identifiers | Leaked | name | phone | email | record_id | date | dob | org | address | relative | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| locked dental (100 notes) | 412 | 7 (1.7%) | 1/100 | 0/21 | 0/30 | 0/13 | 1/98 | 0/14 | 2/72 | 2/21 | 1/43 | 0 PASS | 100/100 PASS |

- Against LEAK-TARGETS section B: overall 1.7% is under the 3% limit (PASS); zero-request checks PASS; phones, emails, ID numbers 0 (PASS); **names left = 1, target 0: MISSED by 1 name** (one name or part of one). One date also left (code-rule target for dates is at most 2%: 1/98 = 1.0%, within it).
- Nano did not fail on any note this time. Misses not shown (locked set), so the cause of the name miss is unknown. Single run, spread over 3 runs not yet measured; 7 in 412 means "under about 2.8 per 100 identifiers" at 95% confidence is not claimed, only the count.
- The README and video must say: dental locked, 7 of 412 leaked (1.7%), one name missed against a target of zero.

### Tune CA, code + Nano, run 1 (21 Nov 2026)
| Set | Identifiers | Leaked | name | org | address | other types | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|
| tune CA (200 notes) | 1,104 | 23 (2.1%) | 8/176 | 4/103 | 11/53 | 0 (record_id 323, date 158, phone 82, dob 51, relative 108, email 50) | **1 FAIL (must be 0)** | 200/200 PASS |

- **The zero-request check FAILED: 1 request.** Cause NOT yet known. The counter (`withFetchCount` in `app/src/leakRun.ts`) wraps `globalThis.fetch` for the whole run (minutes), so it counts ANY fetch the page makes, including background Firebase App Check / Remote Config calls, not only redaction. Not assumed harmless: to be re-run with the DevTools Network tab open to see the URL, before this set counts as a pass. Reported as a FAIL until then.
- Leaks: mostly partial office addresses and partial surnames after "File:". Zero phones, emails, IDs, dates.

### Tune CA, code + Nano, run 2 (21 Nov 2026, DevTools Network open, Preserve log on, Fetch/XHR, filter "firebasevertexai")
| Set | Identifiers | Leaked | name | org | address | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|
| tune CA, run 2 | 1,104 | 28 (2.5%) | 15/176 | 1/103 | 12/53 | 0 PASS | 200/200 PASS |

- Run 1 gave 23 (2.1%) and 1 request (FAIL); run 2 gave 28 (2.5%) and 0 requests. **Nano spread on this set: 23 to 28; names 8 to 15.** Nano is not repeatable, so quote ranges.
- Network panel screenshot (`Pictures/Screenshots/Network list screenshot .png`): 0 of 73 requests match "firebasevertexai", i.e. nothing went to the cloud model endpoint. Because the filter was on, it does NOT show what the single request in run 1 was; run 1 was done without the Network tab open. **The cause of run 1's 1 request is still unproven** (most likely a background Firebase call counted by the whole-run fetch counter). Dental tune, dental locked and CA tune run 2 all show 0.

### Request-source check with Playwright (21 Nov 2026, code-only, no Nano in that browser)
- Ran tune CA on `npm run dev` with a logger on fetch, XHR and sendBeacon installed before the run: **0 calls during the run**; page result 176 of 1,104 (15.9%), identical to the code-only baseline; both zero-request checks PASS.
- The whole browser session made exactly one network request that is not a static file: a POST to `content-firebaseappcheck.googleapis.com/.../exchangeDebugToken` at page load (App Check debug-token exchange in dev mode). It carries no note text. Most likely explanation of run 1's single request in his Chrome: a background App Check call landing inside the run window, which the whole-run fetch counter also counts. This is an inference from the dev setup, not proof, since run 1 was not watched.

### Locked CA, code + Nano, run 1 (21 Nov 2026)
| Set | Identifiers | Leaked | name | org | address | relative | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|
| locked CA (100 notes) | 536 | 16 (3.0%; 2.985%) | 6/83 | 3/53 | 6/26 | 1/48 | **1 FAIL (must be 0)** | 100/100 PASS |

- Against LEAK-TARGETS section B: overall 16/536 = 2.985%, just inside "at most 3%" (PASS, no margin); phones, emails, record IDs, dates, DOBs 0 (PASS); **names left 6, target 0: MISSED**; **zero-request check FAILED (1 request), cause not identified.**
- The Network screenshot for this run shows nothing usable: the filter box still read "firebasevertexai" and the panel was empty ("Currently recording", timeline from 10 ms), i.e. the log was cleared or started after the run. It proves neither a request nor its absence.

### Locked CA, code + Nano, run 2 (21 Nov 2026, page reloaded with DevTools open, Preserve log on)
| Set | Identifiers | Leaked | name | address | relative | org | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|
| locked CA, run 2 | 536 | 10 (1.9%) | 4/83 | 5/26 | 1/48 | 0/53 | 0 PASS | 100/100 PASS |

- **Locked CA spread over 2 runs: 10 to 16 leaked (1.9% to 3.0%); names 4 to 6 (target 0, missed in both); requests 1 then 0.**
- Network panel for this run (`Recent screenshot of network of safe refer .png`): recorded from page load, 148 requests, filter still "firebasevertexai" (not cleared), 0 match. So nothing went to the cloud model endpoint; other requests were hidden by the filter. The request that failed run 1 is still unidentified.

### Tune advocate, code + Nano, run 1 (21 Nov 2026, DevTools Network open from page load, Keep log on, filter empty, Fetch/XHR)
| Set | Identifiers | Leaked | name | address | org | relative | other types | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|---|
| tune advocate (200 notes) | 1,080 | 39 (3.6%) | 17/167 | 15/85 | 4/33 | 3/198 | 0 (phone 63, email 50, date 197, record_id 204, dob 40, amount 43) | 0 PASS | 200/200 PASS |

- Network panel (`saferefer advocate screenshot 1 .png`): 0 of 74 requests under Fetch/XHR with the filter box empty, recorded from page load. A watched clean run.
- Nano failed on 1 note (LAW-000), scored on code only (same first-note failure as tune dental DENTAL-000: probably the model warming up, not confirmed).
- Misses: partial surnames after "Matter:"/"File:" (More, Jadhav, Gokhale, Ghule, Phadke, Chavan...), lower-case given names in brackets ("sheetal (", "seema ("), landmark addresses ("behind sabzi mandi", "opp. shivaji statue", "H.No. 94"), and "<name> Electricals/Constructions/Hardware (client)" business names. Zero phones, emails, dates, DOBs, record IDs, amounts.
- 3.6% is above the 3% line, but that line in LEAK-TARGETS section B applies to the LOCKED sets; this is the tune set (misses shown, may be used for fixes).

### Locked advocate, code + Nano, run 1 (21 Nov 2026, DevTools Network open, Keep log on, filter empty, Fetch/XHR)
| Set | Identifiers | Leaked | name | address | relative | other types | Requests | Manual-mode check |
|---|---|---|---|---|---|---|---|---|
| locked advocate (100 notes) | 558 | 16 (2.9%; 2.87%) | 12/87 | 3/43 | 1/96 | 0 (date 118, record_id 113, phone 32, dob 24, email 19, amount 13, org 13) | **1 (counter FAIL; request identified, see below)** | 100/100 PASS |

- Against LEAK-TARGETS section B: overall 2.87% is inside "at most 3%" (PASS, narrow margin); phones, emails, IDs, dates, DOBs 0 (PASS); **names left 12, target 0: MISSED**.
- **The one request is identified** (`saferefer to advocate screenshot 2. .png`, Network panel, Fetch/XHR, filter empty): a `fetch`, status 200, 0.8 kB, 668 ms, URL beginning `1:456312324293:web:dd6313b1fe42a7207470ac:excha...` = the Firebase App Check token exchange (`...:exchange...Token`). It is not the cloud model endpoint and carries no note text. The panel shows the whole session at 148 requests with this as the only Fetch/XHR entry. The "Initiator: leakRun.ts:25" is the fetch counter wrapper itself, not the source of the call.
- This is the same kind of background call suspected for tune CA run 1 and locked CA run 1 (1 request each, unwatched). Those two are now very probably the same cause, still an inference for them because they were not watched.
- The leak counter counts any fetch during the whole run, so a background App Check call landing mid-run fails the check even though redaction made no request. The honest wording for the video and README: "0 requests to the model; one background App Check token call, no note content."
- Locked advocate spread: single run so far.
