# NEXT: T12 is DONE (19 Nov). Now T13 deploy, README, LICENSE, secrets check

Read `HANDOVER.md`, `CLAUDE.md`, `PACKS.md`, `REMOTE-CONFIG.md`, `REVIEW.md`, `SUBMISSION.md`, **FINISH.md sections 2, 3 and 4**, `SECURITY.md` (T13 checklist) and `ACCEPTANCE.md` T13 first. Newest branch: **`t12-design`** (built on `t11-remote-config` > `t10-offline` > `p3-lawyer-pack` > `p2-ca-pack` > `p1-pack-layer` > `t9-tooth-lines` > `t8-leak-test`). Pushed to origin: everything up to `t11-remote-config` (1cfc63d). `t12-design` is committed locally. Nothing is merged to master.

## What T12 built (19 Nov)
- **`core/messages.ts`: the ONE place for every sentence the dentist reads.** `MESSAGES` (the FINISH.md error table, word for word, plus `offline-not-queued`, `queue-unavailable`, `rules-only`, `unknown`, `unknown-unsure`), `STATUS` (one text per state), `mapError(e)` (reads only an error's own `kind` or `AbortError`, never its message, never an inherited property), `manualKind(state)` and `nanoAvailability()` in `nanoAdapter.ts` (so "still downloading" and "Browser not supported" are told apart from "not available"). `LETTER_MESSAGES`, `BLOCKED_MESSAGE`, `MANUAL_MESSAGE`, `QUEUED_MESSAGE` etc. now come from it. **Two older texts changed to the FINISH.md table** (the blocked text and the manual-mode text); ACCEPTANCE.md T4/T5 and two tests were updated.
- **Screen redesign** (`NoteScreen.tsx`, `index.css`, FINISH.md palette): header with the Profession pill and the banner, a 3-step progress strip (Note, Check, Letter), two panels (the right one explains "How it works" when empty and says so on a browser without Nano), a bottom dock with one status line (icon + word, never colour alone), ticks and the buttons (Approve turns green when approved, Send turns teal when allowed). Tooth list is a card in the right column; the "letter from your last visit" panel sits under the steps. **1280 x 720: 0 px page scroll in every state. 390 px: no sideways scroll, Approve and Send in a fixed 48 px bar, 16 px text.**
- **`ErrorBoundary.tsx`** + `main.tsx`: one fixed sentence and a Reload button; the error object is dropped; React's three error hooks are silenced so no error text reaches the console.
- **Real guard gap found and closed:** while forcing the "blocked" row, a hidden surname glued into a longer word ("clinicMockpatilx", "Mockpatilkar", "Mockpatil2") passed BOTH the redactor and the guard and the letter request went out with the surname inside. `sendGuard.ts` now also blocks a hidden name word of 6+ letters found inside a longer word (clinical words and words the dentist cleared still pass; 0 false positives on the 50 synthetic notes). The blocked word is marked in the right-hand text. 9 new tests. **Not fixed:** the redactor itself still does not hide such glued words (the guard catches them and the dentist hides them by hand).
- Tests: 502 pass, 14 expected fail; tsc, build, oxlint clean; production bundle has 0 hits for any test name.
- **Forced failures (real browser, 1280 px):** nano not available, nano downloading, no `LanguageModel` (unsupported), quota 429, App Check 403, server 500, bad reply, offline (queued), guard block, error-boundary crash. Each showed exactly its fixed text. Fake server replies and the crash carried a name and a phone number; neither reached the page or the console.
- **Not done / honest limits:** no review by a real designer or a real phone (390 px was a Playwright viewport); Nano was absent in the test browser so the green "On-device" badge was not seen in the new design; 360 px was not measured separately; the dev server needed a restart once because Vite served a stale file (no code issue).

## Still to do by Dr. Yatin
1. Look at the screen himself in his own Chrome and on his phone, and say what he does not like (T12 is a design pass: his eye is the test).
2. Create the four Remote Config parameters (REMOTE-CONFIG.md), send the review PDFs, the Nano scores for all three packs, a real Wi-Fi-off check, 10 fresh notes per profession.
3. (Aadhaar sample: decided and done, see T13 item 4.)

## Step: T13 deploy, README, LICENSE, secrets check
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PACKS.md, REMOTE-CONFIG.md, REVIEW.md, SUBMISSION.md, FINISH.md sections 2 to 4,
SECURITY.md T13 checklist, ACCEPTANCE.md T13. Do task T13 and nothing else, on branch t13-deploy from t12-design.

1. LICENSE: Apache-2.0 exists at the repo root (check). README.md following FINISH.md section 2, BUT the outline is out of
   date in these places and the README must say what is TRUE now:
   - three professions (Dentist, Chartered Accountant, Advocate), one engine, "profession packs" (PACKS.md); dental leads;
     the CA and advocate letters were read by outside professionals ONLY IF Dr. Yatin says so (REVIEW.md); otherwise say
     "reviewed by the builder only";
   - the offline queue is LOCAL (IndexedDB, approved anonymous text and profession only); there is NO Firestore and NO
     Anonymous Auth: delete those steps and the Firestore limitation; say a service worker keeps the app shell;
   - Remote Config changes the section list and the allow-listed model name only (REMOTE-CONFIG.md);
   - leak scores for all three packs from the /?leak pages (dental 30 notes, CA 10, advocate 10), the date, every miss listed;
     the code-only numbers on file (dental 3.2%, CA 3.6%, advocate 5.7%) were measured by the session that wrote the rules,
     so say they are flattered; the honest numbers need Nano and fresh notes; use Dr. Yatin's Nano numbers if he has them;
   - the Limitations text of FINISH.md "Limitations section" stays, adjusted for the local queue; add: hiding names is not
     anonymising, a name glued into a longer word is stopped by the send guard but not hidden by the redactor, the
     other-side roles ("accused", "defendant") are hidden as separate people, settlement sums are hidden in the advocate pack.
2. Update SUBMISSION.md: the description and the 2:45 script now need the pack segment (about 20 s: switch to CA then
   Advocate, show the same flow) and the local offline queue; keep it truthful, no compliance claims, no "reviewed by" unless true.
3. Deploy: Firebase Hosting (firebase.json with a CSP whose connect-src is limited to the Google endpoints the app calls:
   firebasevertexai, firebaseappcheck, firebaseremoteconfig, firebaseinstallations, recaptcha; the service worker file must be
   served with no-cache). reCAPTCHA Enterprise site key and the hosted domain go in the console and in .env.production only
   via env, never in git. Dr. Yatin runs `firebase login` and `firebase deploy` himself (give him the exact commands); do not
   ask for his credentials.
4. Run EVERY box of FINISH.md section 3 (3.1 to 3.6) and report PASS or FAIL for each, file and line only, never a token or a
   note. Note: the test notes now include fake PAN, GSTIN, bank numbers, emails and an Aadhaar-shaped number
   (data/packs, review/*.pdf); section 3.5's PII scan WILL list them: confirm each is one of the made-up values and say so.
   DECIDED 19 Nov (Dr. Yatin): the Aadhaar sample was replaced by "0123 4567 8901" (starts with 0: never a real number) in
   data/packs and the tests; a number written after the word Aadhaar/UID is now hidden whole whatever its digits (any first
   digit, no checksum needed); the Verhoeff test uses the public vector 2363 and a number built at run time. The OLD number
   "0123 4567 8901" is still in git history (commits 8fdb69a, e5dae38 and the T12 notes); it is a made-up string that passes
   the checksum, not a known person's record. The 3.2 history scan will show it: say so, and ask Dr. Yatin whether to leave
   it or rewrite history before the repo goes public (rewriting means force-pushing pushed branches: only on his word).
5. Hosted-site check in a fresh Chrome profile (Playwright): note 1 in, letter out, search every request body for the name and
   phone (zero hits); with Nano unavailable and with LanguageModel undefined redaction sends zero requests; the leak page and
   the setup page are NOT in the build; the service worker registers and the app opens offline.
Do not change files listed in HANDOVER.md "do not change". Do not push or deploy yourself. Commit, then rewrite NEXT.md for T14
(the video; SUBMISSION.md section 2, ACCEPTANCE.md T14).
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`. If a real secret or real patient detail is found in git history, stop and tell him: do not rewrite history yourself.
