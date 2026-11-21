# T16 "My terms": SafeRefer learns from the user's own corrections, on the device

Planned by Opus 5.5 on 21 Nov 2026 for Dr. Yatin. Built by Sonnet 5.5 on branch `t16-my-terms`. Reviewed by Opus before merge.
Must be merged, redeployed and live-checked by **24 Nov** (video on 25 Nov). If it is not ready by then, it ships after the video
and the video does not mention it.

## 1. Why
Hand-written dental notes leaked 7 of 34 identifiers (20.6%, LEAK-RESULTS.md, 21 Nov): **every landmark address (3/3) and half
the record ids (2/4)**. These are the things a professional repeats every day in one town: "near ganesh mandir", the lab, "op-731".
The generator's notes hid this. A user who corrects a miss once should not have to correct it again.

## 2. What it is (and is not)
- **Is:** a small list on the user's own device. When the user hides a word by hand, SafeRefer offers to remember it. Next time
  the code redactor hides it before Nano even runs.
- **Is not:** model training. Nano cannot be fine-tuned in Chrome, and corrections are never sent anywhere (they contain
  identifiers). No cloud, no Firestore, no analytics, no sharing between users.

## 3. Decisions (Opus recommendation; Dr. Yatin answers D3 before the build starts)
| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | What can be saved | **Places, organisations and ID formats only. Never a person's name.** | Places/labs/ID formats recur and are what leaked; a saved list of patient names on a clinic computer is a new privacy risk. Names are already the code+Nano strength (1/8 leaked). |
| D2 | "Never hide this" (for false alarms like a drug name) | **Not in T16.** | HANDOVER: `allowed` is filled only by an explicit un-hide click. An auto un-hide list would break that rule, and its failure mode is a leak. A false alarm only costs letter wording; the per-note un-hide click stays. |
| D3 | Where the list lives | **IndexedDB on the device, in plain text, with "Forget all" and per-item delete.** SECURITY B1 is amended to allow exactly one more storage module. | Hashing does not protect a place/org list (a dictionary reverses it) and encryption needs a passphrase: too heavy for 3 days. Places/orgs/ID shapes are low-sensitivity; names are excluded by D1. |
| D4 | ID formats | Stored as a **shape**, not a number: "op-731" saves prefix `op` -> hides `op-12`, `OP 4471`, `op/9`. | The number itself is never stored. |

## 4. Design (files)
**`app/src/core/myTerms.ts` (pure TypeScript; no React, Firebase, fetch, storage; HANDOVER rule)**
- `type SavedTerm = { kind: 'place' | 'org'; text: string } | { kind: 'idFormat'; prefix: string }`
- `validateTerm(input, termSet): SavedTerm | Problem`: refuse if 2 chars or fewer, more than 60 chars, contains a digit run of 5+
  (phone/ID), looks like a phone, email, date or money amount, is a tooth number, or is in the clinical/drug term set
  (`buildTermSet`). Place/org text: letters, digits, spaces, `.,'-/` only.
- `deriveIdFormat(text)`: `^[a-z]{1,5}[-/ ]?\d{1,6}$`i -> `{ kind: 'idFormat', prefix }`, else null. Prefix must not be a
  clinical abbreviation or a pack `notIdPrefixes` entry (e.g. not "rct", "gstr").
- `termsToHideItems(terms)`: place -> `{ type: 'ADDRESS' }`, org -> `{ type: 'ORG' }`.
- `termsToRules(terms, base)`: returns `base` plus one `extraIds` finder per ID format (`\bprefix[-/ ]?\d{1,6}\b`, any case,
  type `ID`). Rules only ADD (redactRules.ts contract).
- Limits: 200 terms max; duplicates folded (NFKC, lower case, spaces).

**`app/src/core/screenLogic.ts`**: `redactFirst(note, manualHides, rules, saved: HideItem[] = [])`. Saved items are hidden with
`hideValues` after the code redactor and before manual hides; they go into the same map, so `checkSend` and `restoreLetter`
treat them like any other token. Default `[]` keeps every existing caller and test unchanged.

**`app/src/myTermsStore.ts` (new, the second and last storage module)**: same pattern as `queueStore.ts`: database
`saferefer-terms`, one store, `list() / add(term) / remove(term) / clear()`, memory fallback if IndexedDB is blocked.
It only ever receives a validated `SavedTerm`, never the note, map, preview or letter. No console output.

**`app/src/NoteScreen.tsx`**
- After a manual hide (`setManualHides`, line ~472): a small inline prompt under the preview:
  "Remember '<text>' for next time? [Place] [Lab / organisation] [ID format] [No]". Default No; the prompt goes away on the
  next edit. Text under it: "Never save a patient's name. Saved on this device only."
  [ID format] is shown only when `deriveIdFormat` succeeds. A refused term shows the reason in plain words.
- Saved terms apply to every note. Their chips say "hidden by My terms" on hover. Clicking un-hides for this note only (the
  normal `unhidden` path); it does not delete the term.
- A "My terms (N)" link in the footer opens a panel: the list (kind + text/prefix), a delete button per row, "Forget all"
  (confirm in-page, no `window.confirm`). Works offline.
- Never-hide (D2) and names (D1) do not appear anywhere in the UI.

**Leak page (development only)**: `?leak&pack=..&set=..&terms=<name>` loads `data/harness/terms/<name>.json` (a synthetic
terms file) and runs the same path with those terms. The page title says "with My terms: <name> (N terms)". Off by default, so
every existing number and the H4 gate are unchanged.

## 5. Honest measurement (Dr. Yatin does the runs; the builder records)
1. **Real test (hand-written):** Dr. Yatin writes `data/harness/terms/yatin-dental.json`: the places, labs and ID formats he
   would actually save in his town, **from his own knowledge, without looking at any miss list** (the hand page shows none).
   Seal it in git. Then he writes a **second** batch `hand-dental-2.md` (10 new notes, same town, same rules) and seals it.
   Run batch 2 twice: without terms and with `&terms=yatin-dental`. Report both, "small set", in LEAK-RESULTS.
2. **Generated (flattering, reported as such):** terms built from the TUNE-set misses only, then run on the LOCKED set with
   and without them. Same generator vocabulary, so the gain is an upper bound, never quoted alone.
3. Not allowed: building terms from any locked or hand-set miss list.

## 6. Tests Sonnet must add (no test loosened, no `it.fails` deleted)
- myTerms: each refusal reason; a phone, email, date, tooth number, drug and person-looking name never become a SavedTerm;
  `deriveIdFormat` on "op-731", "OP 4471", "ort/48", refuses "rct-2", "GSTR-3B"; 200-term cap; duplicate folding.
- screenLogic: a saved place is hidden as ADDRESS in any case and spacing; saved terms + manual hides + code finds share one map;
  default `saved=[]` gives byte-identical output on the 30 builder notes and the harness sets (gate unchanged).
- sendGuard: a saved term left in text (simulated) is blocked by `checkSend` like any map value.
- store: with a fake IDBFactory, `add/list/remove/clear` work; memory fallback when the factory throws; `put` is never called
  with anything but a SavedTerm (spy).
- Zero requests: adding, listing and applying terms makes no `fetch` (withFetchCount).
- E2E on `npm run dev` (Playwright, Nano absent is fine): hide "near ganesh mandir" by hand, save as Place, reload, type a new
  note with it: it is hidden before any click; "Forget all" empties the panel and the next note shows it again.

## 7. Documents to update
SECURITY.md (B1 amended: two storage modules, grep list updated; new row B7: saved terms visible to anyone using the same
browser profile -> no names, Forget all, panel visible), README (one feature paragraph + limitation: "learns per device, not
across users; places, labs and ID formats only"), LEAK-RESULTS (the runs in section 5), HANDOVER (new "do not change": D1/D2),
NEXT.md (rewritten for the video). Video script: no change unless Dr. Yatin asks after he sees it live.

## 8. Acceptance (Opus checks before merge)
All existing tests pass (584 + new; 12 expected-fail unchanged), lint clean, `tsc -b` clean, `npm run harness` numbers identical
to the baselines, production bundle builds; grep of `dist/` finds no leak page and no terms data files; storage API grep finds
`indexedDB` only in `queueStore.ts` and `myTermsStore.ts`; the E2E above passes; Dr. Yatin tries it once in his Chrome.

## 9. Schedule and cut order
22 Nov Sonnet builds (core + store + UI + tests) -> 23 Nov Opus review + fixes, Dr. Yatin tries it, he writes the terms file
and hand batch 2 -> 24 Nov merge to master, `firebase deploy --only hosting` (his laptop), live check, the section 5 runs.
Cut first if late: the leak-page `&terms=` mode and section 5.2 -> then ID formats (keep places/orgs) -> then ship after the video.
Never cut: D1 (no names), the validation, Forget all, the zero-request test.
