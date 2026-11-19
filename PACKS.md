# PACKS: one privacy engine, three professions (brainstorm and plan, 19 Nov 2026)

Written by Opus 5.5 for Dr. Yatin. Read after `NEXT.md`. This changes PLAN.md section 7 ("more than one letter type"): Dr. Yatin decided on 19 Nov to add profession packs **after T9**, without rebuilding.

## 1. The idea in one line
SafeRefer hands a case to a specialist without handing over the client. A dentist refers a patient to an endodontist. A CA passes a client file to a GST or tax specialist. An advocate briefs senior counsel. The engine is the same in all three: hide in the browser, let the cloud write, put the names back in the browser.

## 2. What stays the same (the engine, already built in T3 to T8)
Code redactor, Nano redactor behind the `LanguageModel` lock, split screen, Approve, `guardedSend`, cloud letter, name restore, fact check, leak scorer. **No pack can turn off a lock.** A pack only adds rules and words. It never removes one.

## 3. What a pack is
One typed object per profession in `core/packs.ts` (changed in P1, 19 Nov: TypeScript, not JSON, because `core/` never reads files; `validatePack()` checks any pack that comes from outside, such as Remote Config in T11). Test notes stay in `data/`. A pack holds:

| Field | Dental (today) | CA | Lawyer |
|---|---|---|---|
| `label`, `noteLabel`, placeholder | "Dentist", "Clinical note" | "Chartered Accountant", "Client file note" | "Advocate", "Case note" |
| Person words | Patient, husband, son | Client, director, partner, proprietor | Client, petitioner, respondent, accused, witness |
| Extra ID patterns (code, with checks) | (none extra) | PAN, GSTIN, TAN, bank account, IFSC, Aadhaar, UDIN | Case number, FIR number, CNR, Aadhaar |
| What is NOT hidden | Age, tooth numbers, drugs | **Amounts, section numbers, assessment years, form names** | **Section and Act names, court names, hearing stage** |
| Letter | Referral to endodontist | Case summary for a specialist CA | Brief to senior counsel |
| Item list (the T9 slot) | Tooth lines (FDI) | Sections and forms cited | Sections and Acts cited |
| Safe words, fact lists | drugs, clinical terms | tax terms, form names | legal terms, Act names |
| Test notes | `data/notes.json` (30) | `data/packs/ca-notes.json` (10) | `data/packs/law-notes.json` (10) |

## 4. Decisions taken (tell Opus if you disagree)
1. **Amounts are not hidden** in the CA pack. A cloud model cannot reason about `[AMOUNT_1]`, and an amount alone does not name anyone. Only what identifies a person or business is hidden: name, PAN, GSTIN, account, phone, address. Said plainly in the README.
2. **Same rule as dentistry: summary, not advice.** The CA letter summarises facts for a colleague. It gives no tax opinion. The legal brief states facts and the question for counsel. It gives no legal opinion. The professional signs.
3. **Context can still identify a person** ("the only builder in Indapur"). The amber underline and the professional's check stay the real control. The leak score is published per pack, misses included.
4. **No compliance claims** (DPDP, HIPAA, ICAI, Bar Council), same as today.
5. **Dental stays the default and the demo lead.** CA and Lawyer are a dropdown at the top. If the CA or Lawyer pack is not good by its cut-off day, it is hidden behind `?packs` and only mentioned in the video.
6. **Dr. Yatin cannot judge CA or legal letters.** Before the video, one CA and one advocate (people he knows) read one synthetic letter each and say "usable" or not. If no one is available, the video says "reviewed by the builder only".
7. **The name stays SafeRefer.** "Refer" works for all three.

## 5. Hurdles and how we handle them
| Hurdle | Handling |
|---|---|
| PAN, GSTIN and case numbers are new formats | Code patterns with check digits (GSTIN has one, PAN has a fixed shape), each with tests and attack cases |
| Nano prompt is written for dental notes | Pack adds its person words and examples to the same prompt; the schema stays the same |
| Leak scorer and the 30 notes are dental | Each pack gets 10 new synthetic notes with identifier lists; the same scorer runs per pack |
| Fact check knows tooth numbers and drugs | Generic checks (numbers, dates, unknown 4+ letter words) work for all; tooth checks run for dental only |
| Free-tier cloud limits (15 a minute, 500 a day) | Space leak-test runs; no pack test runs the cloud in a loop |
| `core/` must stay importable by Enamel | Packs are data plus plain functions in `core/`; the dental pack is the default, so Enamel's import does not change |
| Time | Packs get 3 days (P1 to P3). P3 (Lawyer) is the first thing cut |

## 6. New schedule (IST)
| Day | Task |
|---|---|
| Thu 19 Nov | T9 tooth lines (ahead of the old plan by 5 days) |
| Fri 20 | P1 pack layer: `core/packs.ts`, dental pack as data, dropdown, no change in dental behaviour |
| Sat 21 | P2 CA pack: patterns, prompt words, letter, item list, 10 notes, leak score |
| Sun 22 | P3 Lawyer pack: same. **Cut-off: if P2 is not passing, P3 is dropped** |
| Mon 23 | T10 offline queue |
| Tue 24 | T11 Remote Config (pack templates can come from here), T12 design pass |
| Wed 25 | T12 finish |
| Thu 26 | T13 deploy, README, secrets check |
| Fri 27 | T14 video (dental lead, packs shown in 20 s) |
| Sat 28 | T15 Devpost. **Submit on 28 Nov.** |
| 29 to 30 Nov | Buffer only. No new features |

## 7. Pack tasks (done-checks)
**P1 DONE 19 Nov** (branch `p1-pack-layer`). The dental letter and Nano prompt are byte-for-byte the same as before (checked against the T9 versions).

- **P1 Pack layer.** Done when: all existing tests pass unchanged; the dropdown shows Dentist; `core/packs.ts` has no Firebase or React import; a test proves a pack cannot remove a base pattern or the guard.
- **P2 CA pack.** Done when: a note with a PAN, GSTIN, bank account and client name shows only tokens on the right; amounts and "section 143(1)" stay; the CA leak test lists its score and every miss; the letter has no tax opinion.
- **P3 Lawyer pack.** Done when: party names, case and FIR numbers are hidden; Act and section names stay; the brief has no legal opinion; the leak test lists its score and every miss.
