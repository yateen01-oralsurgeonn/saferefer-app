> **REMINDER (his choice, 20 Nov): the repo is still PRIVATE. He wants it made PUBLIC on 25 Nov, before the video is uploaded (submit 28 Nov; hard deadline 1 Dec 2026 3:30 AM IST). Remind him at the start of the 25 Nov session (and every session after, until done). Command, only on his yes: `gh repo edit yateen01-oralsurgeonn/saferefer --visibility public --accept-visibility-change-consequences`, then open the repo logged-out and check README, licence and that no secret shows.**
> **Live now:** https://saferefer-d5175.web.app (deployed, console steps done, App Check enforced, API key restricted). master = origin/master. Video prep is on branch `t14-video`.

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
