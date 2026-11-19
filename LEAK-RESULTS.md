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
(empty: Dr. Yatin writes 10 fresh notes per profession, then they are run here)

## Wi-Fi-off check on Dr. Yatin's laptop (20 Nov 2026)
- **First real run: FAILED.** With Wi-Fi off, Send showed "The letter could not be written. Nothing was lost. Please try again." instead of "queued".
- **Cause:** the cloud call first fetches an App Check token; with no connection that step fails with `appCheck/fetch-network-error`, and the AI SDK reports it as a bare "error" the app did not recognise. The laptop also keeps `navigator.onLine` true (virtual adapters), so the "back online" event would never have fired either.
- **Fix (commit after 85f0e57):** the adapter reads that one App Check code (never the message text) and treats a network failure as offline and a refusal as "could not be verified"; a queued letter is retried every 10 seconds, quietly, and stays queued while the network is down. 5 new tests. Reproduced in a browser by blocking the internet while it still reported "online": queued, stayed queued through retries, and the letter arrived 7 s after the network returned.
- **To repeat on his laptop** after reloading the page (the dev server was restarted).
