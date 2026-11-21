> **REMINDER (his choice, 20 Nov): the repo is still PRIVATE. He wants it made PUBLIC on 25 Nov, before the video is uploaded (submit 28 Nov; hard deadline 1 Dec 2026 3:30 AM IST). Remind him at the start of the 25 Nov session (and every session after, until done). Command, only on his yes: `gh repo edit yateen01-oralsurgeonn/saferefer --visibility public --accept-visibility-change-consequences`, then open the repo logged-out and check README, licence and that no secret shows.**
> **Live now:** https://saferefer-d5175.web.app (deployed, console steps done, App Check enforced, API key restricted). master = origin/master. Video prep is on branch `t14-video`.

# NEXT (21 Nov 2026): T16 built, Opus reviewed, all 3 fixes done; Dr. Yatin tries it, then merge

**T16 "My terms" is built on branch `t16-my-terms` (not merged, not pushed).** Commits: 551cab9 (core/myTerms.ts + redactFirst `saved` param), 7b11ce3 (myTermsStore, B1 test now allows exactly two modules), afbc015 (remember prompt + My terms panel), 3f7752a (leak page `&terms=`), plus the docs/NEXT commit after it.
Checks run: `npm test` 621 pass + 12 expected-fail (was 584 + 12); `tsc -b` and lint clean; `npm run harness` identical to the baselines; `npm run build` ok, no leak page or terms data in dist; `indexedDB` only in `queueStore.ts` and `myTermsStore.ts`. Playwright E2E on `npm run dev` passed (hide a lab by hand, save as Organisation, hide op-731, save as ID format; after reload a new note hides both before any click; the panel lists 2; Forget all empties it and the next note shows the words again; only page-load reCAPTCHA/Remote Config requests).
**Opus review (21 Nov) found 3 bugs:**
1. **FIXED (his yes, 21 Nov):** the "never a name" check (D1) was the wrong way round (refused Mumbai, Shivaji Nagar, Netaji Road; accepted "Asha Testpatil" as a Place). Now: a phrase with a place or organisation word (Road, Nagar, Chowk, Mandir, near/behind/opp, Lab, Clinic, Hospital, School...) is accepted at once; a phrase without one (Mumbai, Indapur, Sunita) needs one more in-page click "Yes, it is a place"; any word the app already hid as a person in the current note (code or Nano, not the user's own hand hides) is refused outright, even confirmed; titles and relation words are always refused. The old name-ending rule (-ji, -bai...) is gone. Stored terms are re-checked on read as confirmed.
2. **FIXED:** a saved ID prefix ("op") turned "Post-op 3 days" into "Post-[ID] days". It now skips matches after post/pre and before a time unit (days, weeks, months, hours, years, times, x). Real IDs ("op-731", "OP 4471") are still hidden. Tests in myTerms.test.ts.
3. **FIXED:** un-hides and hand hides carried over to the next note (they were cleared only on a profession change). `isNewNote` in core/screenLogic.ts: clearing the box, or replacing all the text (select-all then type or paste), starts a clean note; an ordinary edit keeps them. Heuristic limit: a replacement that happens to share the old text's first or last character is treated as an edit.
After all three fixes: 641 tests pass + 12 expected-fail, tsc and lint clean, harness gate passes (code-only numbers unchanged), build ok (no leak page or terms data in dist), `indexedDB` only in the two store files. Browser on `npm run dev`: "Post-op 3 days pain free. File OP 4471." -> only the file number hidden; un-hide in note A, clear the box, note B hides the saved lab again; same after select-all replace; an ordinary edit keeps the un-hide. D1 in the browser: "shivaji nagar" saved at once; "mumbai" asked first, saved after Yes; "testpatil ortho lab" (surname of the note's patient, after un-hiding it) refused with no Yes button; after reload both places hidden before any click; the original save / reload / Forget all test passes again.
Still to do: Dr. Yatin tries it once in his Chrome, the section 5 measurements (his terms file and hand batch 2 are his to write), merge, redeploy (`firebase deploy --only hosting`) and live check by 24 Nov. Then the video (T14 notes below). Design note: saved terms are applied AFTER the code redactor (as planned), so a longer saved phrase cannot override a shorter span the code already hid.

---

# NEXT: T13 is DONE (20 Nov). Now T14 the video

Read `HANDOVER.md`, `CLAUDE.md`, `SUBMISSION.md` section 2 (the demo script), `ACCEPTANCE.md` T14, `RULES.md` (video rules), `LEAK-RESULTS.md` and `T13-REPORT.md` first. Newest branch: **`t13-deploy`** (built on `t12c-gaps`). Everything up to `t12c-gaps` (5163e2a) is pushed; `t13-deploy` is committed locally. Nothing is merged to master.

## What T13 did (20 Nov 2026), details in `T13-REPORT.md`
- Security audit run box by box: 3.1, 3.2, 3.3, 3.4 PASS. `npm audit` had 4 high findings in `@grpc/grpc-js` (pulled in by Firestore code SafeRefer never uses, 0 occurrences in the built site); fixed with an npm override to 1.14.7: 0 vulnerabilities, 552 tests unchanged. The built site has no debug token, no test notes and no development pages.
- **3.5 has two open decisions for Dr. Yatin:** the real name and personal Gmail on all 60 commits will be public (options in the report), and the old made-up Aadhaar sample is still in two pushed commits (recommend leaving it).
- `README.md` written (three professions, local queue, no Firestore, honest leak tables, limitations, "reviewed by the builder only"); `SUBMISSION.md` rewritten (description about 890 words; 2:55 video script with a CA/Advocate segment and the Wi-Fi shot); `firebase.json` (CSP, cache rules) and `.firebaserc`.
- **Hosted-build check done locally** (the production build served with the exact `firebase.json` headers, fresh profile): 0 CSP violations, service worker active, offline works, no development page, 13 requests to Google none containing the name or phone, 0 model requests with Nano unavailable or `LanguageModel` undefined.
- **Not done, needs Dr. Yatin:** deploy (`firebase login`, `firebase deploy --only hosting`, commands in the report), the console steps (add the hosting domains to the reCAPTCHA key, enforce App Check, restrict the API key), and the hosted-site check on the live URL. The three `[FILL]` links (repo, live app, video) are still open.

## Still open for Dr. Yatin (not blocking T14)
Remote Config parameters (REMOTE-CONFIG.md, optional); a real CA and a real advocate reading the PDFs in their own words (optional); push `t13-deploy`; make the repo public before submitting.

## Step: T14 the video (Dr. Yatin records; the builder prepares)
```
Read CLAUDE.md, NEXT.md, SUBMISSION.md section 2, ACCEPTANCE.md T14, RULES.md, LEAK-RESULTS.md. Do task T14 and nothing else, on
branch t14-video from t13-deploy. Dr. Yatin records the screen and the voice himself; the builder prepares everything he needs and
checks the script against the app. Synthetic data only, banner visible in every shot.

1. COMPARE the script with the built app, line by line (ACCEPTANCE T14 "Sonnet tests"): list every shot the app cannot do today
   and what to show instead. Known items to check: the "chatbot window" opening shot (use a screenshot of any chatbot with a made-up
   note, never a real chat); the "On-device" badge needs Nano in his Chrome; the Wi-Fi shot needs a real Wi-Fi switch (it worked on
   his laptop on 20 Nov: queued, then sent by itself within about 20 s) and the dev server must NOT be the page shown (use the
   hosted URL or `npm run build` + `firebase serve`; the leak page and the 10-note fresh sets exist only in development: `/?leak`
   shots must be recorded on `npm run dev`, say so in the runbook).
2. WRITE `video/` in the repo: (a) `demo-notes.md`: one made-up note per profession for the video (dentist, CA, advocate), NOT taken
   from data/fresh or data/notes.json test files and with no name that exists in the tests; phones start with five zeros; (b)
   `runbook.md`: for each row of the script the exact clicks, what is on screen, how long it should take, what to say, and what to cut
   if the take is long; (c) `voiceover.md`: the spoken lines with timings and word counts (about 150 words per minute: the whole
   voiceover must fit about 2:45); (d) `subtitles.srt` with the same lines and timings (English); (e) a pre-flight checklist: new
   Chrome profile, zoom 100%, bookmarks bar hidden, notifications off, window 1280 x 720, Nano available (`await
   LanguageModel.availability()`), Wi-Fi switch ready, DevTools Network panel docked for the request-body shot, screen recorder
   settings, microphone check.
3. LEAK-TEST SHOT: decide with Dr. Yatin which numbers go on screen. Use the post-fix Nano results from LEAK-RESULTS.md; the
   on-screen text must say "fresh notes", the three numbers, and "small set"; never "private", "safe" or "compliant".
4. AFTER the recording (builder checks, Dr. Yatin uploads): length under 3:00; subtitles on; the banner in every shot; no real name,
   phone, face of a patient, API key or token on screen (look at the Network panel shot: the request body must show labels only); the
   YouTube link opens in an Incognito window and is public. Upload settings: public (not unlisted), English, subtitles uploaded as
   the .srt, a description with the repo link, no "reviewed by" claims.
Do not change files listed in HANDOVER.md "do not change". Commit, then rewrite NEXT.md for T15 (Devpost; PLAN.md section 6
checklist, SUBMISSION.md section 1, count the description words against the Devpost limit).
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`. If a real secret or real patient detail is found anywhere (a screenshot, the video, git), stop and tell him; do not rewrite history yourself.
