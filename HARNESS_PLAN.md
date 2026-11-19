# HARNESS_PLAN: the slim leak-test harness (agreed with Dr. Yatin, 20 Nov 2026)

Goal: keep the leak rate honest while the rules change, the way the Enamel raw-note harness does (tune set, locked set, saved baselines, written targets, regression gate). **Slim version before the deadline (23 to 24 Nov); the full version after 1 Dec.** The deploy, console steps, repo merge and the video stay first (NEXT.md, memory file "TOMORROW").

## Decisions already taken
- **No notes from Reddit, Facebook, Instagram or any scraped source.** Real people's data (breaks "synthetic only" and would sit in a public git history), platform terms forbid scraping, the content is not clinical / CA / legal notes and has no labels, and a post by a professional may hold real patient data. Social media may be read by Dr. Yatin for *style only* (how people abbreviate, Hinglish, lower case), never copied.
- **Sources allowed:** (1) a **generator** that builds labelled notes from made-up parts; (2) **hand-written notes** by Dr. Yatin, his staff or other professionals (the locked set); (3) open synthetic PII-masking datasets only after a licence check (low priority).
- **The builder does not write the locked set** (builder notes flattered the code about 13 times) and does not read its misses.

## What gets built (H1 to H5)
| # | Task | Done when |
|---|---|---|
| H1 | **Note generator** `harness/gen-notes.*`: made-up names (Indian first names, surnames, nicknames, relation words), phones in many formats starting 00000, addresses with landmarks, shops and employers, dates in many styles, PAN `ZZZZZ`-style, GSTIN, cheque / case / FIR / CNR numbers (valid shape, fake), Aadhaar only as numbers starting 0 or 1. 30+ templates per profession, plus mess transforms (lower case, no punctuation, nicknames, small name typos, Hinglish words, shuffled order). Fixed seed. Output = the existing `TestNote` JSON with exact identifier lists | 300 notes per profession (dentist, CA, advocate), the same file every run; a test proves every listed identifier is in its note |
| H2 | **Split and seal**: by index, 200 "tune" and 100 "locked" per profession. Dr. Yatin's hand-written notes join the locked set. Rule written in the file header: nobody tunes on the locked set's misses | `data/harness/{tune,locked}-{dental,ca,law}.json`; the leak page can open each (`&set=tune` / `&set=locked`) |
| H3 | **Runner and baselines**: one command (`npm run harness`) runs code-only over every set and prints a table per profession and per identifier type; saves `harness/baselines/*.json`; a second mode drives the real Chrome with Nano through Playwright if Dr. Yatin enables it, otherwise he runs the leak page by hand (Nano stays manual: it is not exactly repeatable) | table and baseline files created on the first run |
| H4 | **Regression gate** in the unit tests (code-only only, it is deterministic): fails if any structured type (phone, email, ID, date, DOB, amount, case number) leaks, or if the overall code-only rate on a set is worse than its baseline by more than 1 point | gate passes on the saved baseline and fails on a deliberately broken rule (tested once) |
| H5 | **Targets and report** `LEAK-TARGETS.md`: written before the first run on the locked set. Proposed: with Nano on Dr. Yatin's Chrome, 0 names / phones / emails / IDs left on the locked set and at most 3% of identifiers overall; the zero-request checks always PASS; "never send unapproved text" stays a unit test. Report generated notes and hand-written notes **separately** (generated notes are templated, so code rules will look better on them) | file committed; first locked run recorded in `LEAK-RESULTS.md` as it comes out |

## Honest limits (to put in the README when it exists)
- Generated notes are more regular than real ones: report them separately from hand-written notes and never quote them as "real-world".
- Counts are small: 0 leaks in n identifiers only shows "under about 3/n" with 95% confidence (0 of 69 means under about 4.3%; 3 of 171 means under about 5%). The locked set exists to grow n.
- Code-only runs are exactly repeatable; Nano runs are not (run each set 3 times when the time allows and report the spread).

## After the deadline (not before)
The letter harness (count facts added by the cloud letter against the note: figure, date, section, drug), repeat-run statistics for Nano, a Node stand-in model (for example the Gemma model Enamel uses) for headless runs, more locked notes from other dentists, CAs and advocates, and the Enamel import of the engine (`app/src/core/`).

## Schedule
| Day | Work |
|---|---|
| 21 Nov | Deploy, console steps, live check, merge to the main branch, repo public |
| 22 Nov | Video prep (runbook, demo notes, voiceover, subtitles) |
| 23 to 24 Nov | H1 to H5 |
| 25 Nov | Record the video with the final numbers (if the harness changes any number, update README, SUBMISSION and `LEAK-RESULTS.md` first) |
| 26 to 27 Nov | Devpost entry, buffer |
| 28 Nov | Submit |
If the deploy or the video slips by more than a day, cut H3's Playwright mode, then H5's repeat runs; never cut the locked set or the regression gate.
