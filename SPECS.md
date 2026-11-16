# SPECS: SafeRefer T8, T10, T11 (written 16 Nov 2026)

The three tasks most likely to go wrong. Read with that task's rows in PLAN.md, SECURITY.md and ACCEPTANCE.md.
On a clash: SECURITY.md wins, then this file, then PROMPTS.md. Live Firebase docs beat all of them.

## 1. T8 leak test

**What runs.** For each of the 30 notes in `data/notes.json`: T3 code redactor, then T4 Nano redactor (`ONLY_ON_DEVICE`), with no dentist step and no cloud call. The scorer compares the anonymous text with that note's `identifiers` list. Starts on a button click (Nano needs one). Notes run one at a time. Results live in React state only: no console, no Firestore, no storage. **Before scoring,** check that every identifier `value` is found in its own note's `text`. If one is not, stop and show "Test data error in note Nxx". A value that is not in the note can never leak, so it would make the score look better than it is.

**How a leak is counted.** Cut the anonymous text into segments at every token (PROMPTS.md section 2 regex), so text on two sides of a token is never joined. Each identifier gets one result, the first that matches:

| Kind | Rule |
|---|---|
| exact | the value is in a segment, character for character |
| case | the value is in a segment when both are lower-cased (after NFKC) |
| split | the value is in a segment when both are lower-cased and stripped to letters and digits only. Catches "Arvind-Testwala", a line break inside a name, "00000-55501" |
| partial | a piece of the value is left (see below). Catches "[PATIENT] Testwala" and "[DATE_1]/2026" style half-redactions |
| clean | none of the above |

Partial pieces, by identifier type (whole word, any case):
- `name`: any word of 3 or more letters, honorifics dropped. A surname left alone is a leak.
- `phone`: the last 5 digits of the value, searched in the segment's digits-only form. `email`: the part before `@`.
- `date`, `dob`: the day and month without the year ("03/11", "2 Nov", "3 March"). `record_id`: its digit run, if 4 or more digits.
- `address`, `organization`: any comma-separated piece, any run of 5 or more digits, or any word of 4 or more letters not in a short stop list kept in the scorer file (road, street, lane, flat, towers, school, public, clinic, hospital).

**Formula.** `Y` = number of identifiers in the file, counted at run time, never typed in. `X` = identifiers whose result is not clean. A partial leak counts as a full leak. No weights. Leak rate = `X / Y`, shown as a percentage with one decimal. If Nano fails on a note (manual mode), that note is scored on its code-only redaction and stays in `Y`. A failed note is never skipped and never counted as clean.

**What the page shows.**
1. The "Synthetic patients only" banner, the line "Automatic redaction only, before the dentist's check.", a Run button, progress "Note 12 of 30" and a Stop button.
2. Headline, exactly: "Identifiers leaked: X of Y" with the percentage. Same size and colour rules for a good and a bad score.
3. Run facts: date and time, Chrome version, Nano status (`available` or not), "Notes where Nano failed: N", "Network requests during the run: N" (counted with a `PerformanceObserver` on `resource` entries; must be 0).
4. Two small tables: leaks by kind (exact, case, split, partial) and by type (name, phone, and so on).
5. Miss list, one row per leaked identifier: note id, type, value, kind, and the leftover text with 30 characters on each side. Always shown in full, never collapsed. If there are none: "No misses in this run."
6. If Nano is not available: the test still runs, and a label above the headline says "Code redactor only. Gemini Nano was not available."

**Honesty rules.** Nano gives slightly different results each run. The number in the README and video is the first complete run on the final build, with its date. Never re-run to pick a better one. The README also says what the test cannot show: 30 synthetic notes, known identifier lists, and no measure of clinical words hidden by mistake.

### Five likeliest bugs
| # | Bug | How to detect |
|---|---|---|
| 1 | Scorer only does exact match, so "testwala" or a lone surname counts as clean | Unit tests: one made-up text per kind (exact, case, split, partial, clean), each must get that kind |
| 2 | A failed or skipped Nano run is counted as "nothing leaked", or the note drops out of `Y` | Turn Nano off and run: `Y` is unchanged, the code-only label shows, `X` goes up |
| 3 | Scorer reads the wrong text (the original note, or text with names restored), or a typo in `notes.json` hides a value | ACCEPTANCE test: skip redaction for one note, every identifier must come back "exact". The data check above must fail on a deliberately broken value |
| 4 | False leaks: a piece such as "Road" or "2026" matches ordinary text; or false clean because two segments were joined across a token | Fully hand-redacted note must score 0. "[PATIENT] Testwala" must score partial |
| 5 | The test calls the cloud (shared helper, wrong mode) or logs note text | Request counter shows 0 with Nano on and with Nano off; Network panel agrees; console is empty |

## 2. T10 offline

**Service worker.** File `/sw.js`, scope `/`, registered in the production build only (never in `npm run dev`). It precaches the built app shell: `index.html`, JS, CSS, icons, manifest and the bundled JSON lists. No runtime caching at all. It answers same-origin GET requests only; every POST and every Google or Firebase address goes straight to the network. Gemini Nano itself is stored by Chrome, not by the worker. A new worker may take over at once (`skipWaiting`, `clientsClaim`), but code never reloads the page: a reload wipes the token map. Keep the app in one JS bundle so an old page never asks for a file the new worker dropped. Open point (DOCS-CHECK.md test 3): if an on-device call needs an App Check token from the network, offline tooth lines show the "rules only" list. Use the T1 result.

**Queue document.** Path `users/{uid}/queue/{id}`. `uid` is the Anonymous Auth id (sign in at app start, while online). `id` is a random Firestore id. One queued letter at a time. Three fields only: `text` (the frozen, approved anonymous note), `createdAt` (`serverTimestamp()`) and `v` (the number 1).
Never in the document: the original note, token map, restored letter, any name, a note id such as "N01", model name, template, device or browser details, status or retry count (those stay in memory).

**Rules.** Owner only (`request.auth.uid == uid`): `get`, `list`, `delete`. `create` only if the keys are exactly `text`, `createdAt`, `v`; `text` is a string of 6,000 characters or fewer; `createdAt == request.time`; `v == 1`. `update` is always denied. App Check enforced on Firestore.

**When a document is written.** Only when the letter cannot be sent now: `navigator.onLine` is false, or the cloud call fails with a network error. A letter that sends first time writes nothing to Firestore. Order: send guard, then write. Do not `await` the write: offline, that promise waits for the server and the screen would hang. Firestore uses its persistent local cache with the multi-tab manager, set up inside the queue module only.

**Retry rules.**
- Triggers: the browser's `online` event, page load, and the "Try now" button. The call's own result is the truth; `navigator.onLine` is only a hint.
- Each attempt: read `text` from the document, run the send guard again, make the same T6 call with the Remote Config values of that moment.
- After a trigger: try at once, then after 5 s, 20 s and 60 s, then wait for the next trigger. Network, App Check or quota error: stay queued. Bad reply twice (PROMPTS.md section 6): stop and show the failed state.
- On a valid letter: show it first, then delete the document. If the delete fails, remember the id in memory and delete later.

**Duplicate rules.**
- One owner per document: the tab that queued it holds a Web Lock named `saferefer-q-{id}` for as long as the tab lives. Another tab, or the page after a reload, may send a document only if it can take that lock.
- One call in flight per document; triggers that arrive meanwhile are ignored. A reload between "letter shown" and "document deleted" can draft the letter twice. That costs one extra cloud call and nothing else; accept it.
- While a letter is queued or sending, the note box is locked and Send is disabled. "Remove from queue" deletes the document and unlocks.

**What the screen shows.**

| State | Text | Buttons |
|---|---|---|
| Offline, nothing queued | Badge "Offline". Redaction and Approve work as normal | Send reads "Queue letter" |
| Queued | "Queued. The letter will be drafted when you are back online." | Try now, Remove from queue |
| Sending or retrying | "Drafting letter..." | none |
| Cloud busy (quota, App Check) | "The cloud is busy. Still queued; trying again." | Try now, Remove from queue |
| Arrived, map in memory | Letter with names restored (T7 as normal) | T7 buttons |
| Arrived after a reload | Letter with tokens, and "Names were cleared on reload. Fill them in by hand." | T7 buttons |
| Failed | "Could not draft the letter. Your note is safe. Try again." | Try again, Remove from queue |
| Guard blocked | "Blocked: an identifier is still in the note." Nothing is written or sent | none |
| No sign-in yet (never been online) | "Cannot queue on this device yet. Connect once, then try again." | none |

After a reload the map is gone, so the guard can only check the phone and email patterns. That is acceptable because the stored text was guarded and approved before it was written, and it cannot be edited (no `update`).

### Five likeliest bugs
| # | Bug | How to detect |
|---|---|---|
| 1 | Worker caches API replies, serves an old app after a deploy, or breaks the dev server | DevTools, Application, Cache Storage: same-origin shell files only. Search the build config for `runtimeCaching`: none. Deploy a visible change: it shows after one reload |
| 2 | The document holds more than the approved text, or holds the live text instead of the frozen one | Open the document in the console: three fields only. A test write with a fourth field is denied. Queue, then check the note box is locked |
| 3 | Letter drafted two or three times (`online` fires twice, two tabs, retry during a call), or the document is never deleted | Two tabs open, toggle Wi-Fi three times: Network panel shows one `generateContent` call. After the letter arrives the collection is empty. A second browser profile cannot read it |
| 4 | Stuck states: `await setDoc` hangs offline; `navigator.onLine` says true on dead Wi-Fi so an error shows instead of "Queued"; `online` never fires so it stays queued for ever | Test three ways: DevTools "Offline", real Wi-Fi off, and Wi-Fi on with the router's internet unplugged. Each shows "Queued" within 2 s, and "Try now" works |
| 5 | Reload while queued: app tries to restore names from an empty map and shows "undefined", crashes, or loses the queued letter | Queue, reload, go online: letter arrives with tokens and the "Names were cleared" line. No blank screen |

## 3. T11 Remote Config

**Keys.** Two, and no others. Defaults are constants in code, passed to `defaultConfig`; the same constants are used when a value is rejected.

| Key | Default | Accepted values |
|---|---|---|
| `cloud_model` | `gemini-3.5-flash-lite` | exactly `gemini-3.5-flash-lite` or `gemini-3.8-flash`. Used for the letter and for the tooth-line cloud fallback |
| `letter_template` | the 7 middle headings from PROMPTS.md section 3, one per line: Reason for referral / Presenting complaint and history / Clinical findings / Investigations / Treatment so far / Medical history and medication / Request | 3 to 10 lines, each 3 to 60 characters, letters, spaces, commas, `&`, `'` and `-` only; 400 characters in total |

- The first two lines ("Dear Colleague," and "Re: [PATIENT], with age only if recorded") and the closing line are fixed in code. This is how SECURITY.md A11 ("strip brackets") and the `[PATIENT]` line in PROMPTS.md both hold: Remote Config can never add or remove a token.
- No digits in headings, so a heading cannot set off the T7 number check. T7 Step B skips the heading lines of the current template. One bad line rejects the whole value and the default is used. Never use half a template. An empty string counts as bad.
- Not in Remote Config, ever: prompt rules, inference modes, the send guard, timeouts, or any switch that turns a check off.
- Do not add Analytics or a `measurementId` for Remote Config (SECURITY.md A9). Check the live docs for whether Remote Config needs its own App Check setting.

**Fetch.** Call `fetchAndActivate()` once at app start. `fetchTimeoutMillis` 5,000. `minimumFetchIntervalMillis` 0 in dev and 60,000 in production, so a console change shows on a reload one minute later. It never blocks the page or redaction. The letter call waits for that one promise to settle (5 s at most), reads both values once, validates them, and uses them for that call. A queued letter uses the values at send time.

**When the fetch fails** (offline, timeout, App Check, throttled): use the last activated values the SDK has saved, checked by the same validator; if there are none, use the defaults. No error is shown and nothing is retried until the next page load. The SDK keeps these two settings in its own browser storage. That is allowed: they are not patient data, and app code still touches storage only in the queue module. The screen shows one small footer line: "Letter settings: default" or "Letter settings: remote". Nothing else.

### Five likeliest bugs
| # | Bug | How to detect |
|---|---|---|
| 1 | The 12-hour default cache is left on, so a console change never shows | Change a heading, publish, wait a minute, reload: the new heading is in the next letter |
| 2 | The letter waits for ever, or fails, when the fetch fails | Block `firebaseremoteconfig.googleapis.com` in DevTools, reload, send: a default letter arrives, at most 5 s slower |
| 3 | A bad value is used as it is: unknown model name (every letter fails), empty template (letter with no sections), brackets (fake tokens) | Set `cloud_model` to `x`, then the template to empty, then to a line with `[PATIENT]`: the footer says "default" each time and the letter is normal. Unit tests on the validator |
| 4 | Defaults drift: the code, the console and PROMPTS.md disagree, or a deleted key comes back as "" and is treated as valid | Delete both keys in the console: the letter matches the PROMPTS.md default exactly |
| 5 | A new heading breaks T7: it is flagged as an invented treatment or finding, or `not_recorded` greying stops working because names no longer match | Change a heading to "Root canal history": no red warning from the heading itself, and an empty section still shows grey |
