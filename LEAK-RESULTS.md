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
| | Advocate (fresh) | 10 | code + Gemini Nano, pre-fix | (to do) | Dr. Yatin's Chrome |

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
