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
| | CA | 10 | code + Nano | (to do) | |
| | Advocate | 10 | code + Nano | (to do) | |

### Dentist, code + Nano, Dr. Yatin's Chrome (20 Nov 2026)
- Zero requests during the whole run (PASS). With the on-device model removed, 0 requests and 30 of 30 notes went to manual mode (PASS).
- By type: names 0 of 41, phones 0 of 27, dates 0 of 22, dates of birth 0 of 6, emails 0 of 6, record IDs 0 of 5, addresses 0 of 8, relatives 0 of 4, organisations 1 of 5.
- **The one miss: N25, organisation, "partial", left in the text: ", works at".** This is the known scorer case: the note says "works at Dummy Steel Works"; the employer is hidden as `[EMPLOYER]`, but the scorer counts the verb "works" (a piece of the organisation's name) as a partly left word. The organisation name itself is not in the text. It is reported as the page shows it, not corrected.

## Fresh-note runs (notes the builder has not seen)
(empty: Dr. Yatin writes 10 fresh notes per profession, then they are run here)
