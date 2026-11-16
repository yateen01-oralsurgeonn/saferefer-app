# FINISH: SafeRefer finish pack (T12 to T15)

Written 16 Nov 2026 from RULES.md, PLAN.md section 6, SUBMISSION.md and SECURITY.md. No app code existed yet, so file names, script names and env names below are best guesses: use the real ones and tell Dr. Yatin where they differ.

## 1. T12 design brief

**Goal.** A judge who has never seen the app understands in 5 seconds what leaves the browser and what stays. Design is one of four equal judging criteria.

### Layout at 1280px
The whole main screen must fit in 1280 x 720 with no scrolling: it is the split-screen shot in the video.

```
+--------------------------------------------------------------+
| SafeRefer            [ Synthetic data only: not for real      |
|                        patients ]              [Leak test]    |  56px
+--------------------------------------------------------------+
|  1 Note   >   2 Check   >   3 Letter                          |  40px
+------------------------------+-------------------------------+
| Your note (stays in browser) | What the cloud will see        |
|                              |                                |
|  text box                    |  read-only text, tokens shown  |
|                              |  as chips: [PATIENT_1]         |
|                              |                                |
+------------------------------+-------------------------------+
| status line (one message)    | [ ] ticks   [Approve] [Send]   |
+--------------------------------------------------------------+
```

- Page width up to 1200px, centred. Two equal columns, 24px gap, 24px side padding.
- Each panel has a fixed label on top. The labels do the explaining: "Your note (stays in this browser)" and "What the cloud will see".
- Step 3 swaps the right panel for the letter, with a badge showing which model answered and a Copy button. The left panel stays so the names are seen to come back.
- The synthetic banner is on every page, including the leak-test page, and is never dismissible.

### Layout at phone width (360 to 430px)
- One column. Order: banner, steps, note box, cloud view, ticks, letter.
- Approve and Send sit in a bar fixed to the bottom of the screen, full width, at least 44px tall.
- Text is 16px or larger (smaller text makes phones zoom into the box).
- Gemini Nano runs on desktop Chrome only. On a phone the app will always be in manual mode, so the phone layout must make manual mode clear and usable: it is the normal case there, not an error.
- No sideways scrolling at 360px. Long tokens wrap.

### States
One state at a time. Each has one status line and a clear rule for the buttons.

| State | Status line | Approve | Send |
|---|---|---|---|
| Empty | "Type or paste a note to begin." | off | off |
| Redacting | "Hiding names in this browser…" with a spinner | off | off |
| Ready to check | "Check the right-hand panel. Is every name hidden?" | on | off |
| Items not placed (A5) | "We found these but could not hide them. Hide them by hand, then tick the box." | on after tick | off |
| Manual mode (D4) | "The on-device model is not available. Hide every name by hand, then tick the box." | on after second tick | off |
| Edited after approval | "You changed the note. Please check it again." | on | off |
| Approved | "Approved. Only the right-hand text will be sent." | done | on |
| Sending | "Writing the letter…" | off | off |
| Letter ready | "Letter ready. Names were put back in this browser." | off | off |
| Queued (offline) | "You are offline. The letter is queued and will be sent when you are back online." | off | off |
| Failed | one message from the table below | as before | "Try again" |

Possible missed names keep the amber underline in every state where the cloud view is shown.

### Error messages
Fixed text only. One error-mapper function turns every failure into one of these. The screen never shows SDK text, error codes, stack traces or any part of the note.

| What went wrong | What the dentist reads |
|---|---|
| Nano missing, failed or timed out | "The on-device model is not available. Hide every name by hand, then tick the box." |
| Nano still downloading | "Chrome is still downloading the on-device model. You can wait, or hide the names by hand." |
| Send guard blocked the text | "A name may still be in the text. Nothing was sent. Please check the highlighted words." |
| Cloud call failed | "The letter could not be written. Nothing was lost. Please try again." |
| Cloud reply failed the checks | "The letter that came back did not pass our checks, so it is not shown. Please try again." |
| Too many requests | "The free limit has been reached for now. Please try again in a few minutes." |
| App Check failed | "This browser could not be verified. Reload the page and try again." |
| Offline | "You are offline. The letter is queued and will be sent when you are back online." |
| Browser not supported | "SafeRefer needs Chrome 139 or newer on a computer to hide names automatically. You can still hide them by hand." |
| Anything else (error boundary) | "Something went wrong. Reload the page. Your note was not sent." |

Rules for the last row: only show "was not sent" if the code can be sure of it; otherwise say "Something went wrong. Reload the page."

### Colours
| Use | Colour |
|---|---|
| Page background | `#F7F8FA` |
| Panels | `#FFFFFF`, border `#D5DAE1` |
| Text | `#1A2433`; secondary `#5B6676` |
| Main button, on-device badge | `#0F766E` with white text |
| Token chip | text `#0B5C56` on `#E0F2F1` |
| Cloud badge | text `#3730A3` on `#E0E7FF` |
| Possible missed name (amber) | underline `#B45309`, background `#FEF3C7` |
| Error | text `#B42318` on `#FEE4E2` |
| Success | text `#17663A` on `#DCFCE7` |
| Offline, queued | text `#475569` on `#E2E8F0` |

- Colour is never the only signal. Every badge and warning also has a word or an icon ("On-device", "Cloud", "Check this").
- One font family (system font stack), no web fonts: fewer network requests to explain in the network-panel shot.
- Status line uses `aria-live="polite"`. Every control works with the keyboard and shows a focus ring.

### T12 done-check
- [ ] 1280 x 720: main screen fits with no scroll, in every state in the table
- [ ] 360px wide: no sideways scroll, bottom bar reachable, manual mode usable
- [ ] Each error in the table was forced once and shows exactly the fixed text
- [ ] Search the page and the console during those errors: no SDK text, no note text
- [ ] Banner visible on every page

## 2. README outline

1. **SafeRefer**: one line. "Referral letters without sending the patient's identity to the cloud."
2. **Warning box.** Hackathon prototype. Synthetic patients only. Do not enter real patient data. No advice, no compliance claim.
3. **What it does.** Three steps: hide names in the browser, dentist approves, cloud writes the letter and the browser puts the names back. One screenshot (synthetic note) and the architecture diagram.
4. **How Firebase AI Logic is used.** Small table: step, mode (`ONLY_ON_DEVICE`, `PREFER_ON_DEVICE`, `ONLY_IN_CLOUD`), what text that step receives. Then one line each for App Check, Anonymous Auth, Firestore queue, Remote Config.
5. **Try it.** Live URL `[FILL]`, video `[FILL]`. What the judge needs: Chrome 139+ on a computer, the flag `prompt-api-for-gemini-nano-multimodal-input` enabled, and time for Chrome to download the model once. Say what happens without Nano: manual mode, and the tooth lines fall back to the cloud.
6. **Run it yourself.**
   ```
   git clone [FILL] && cd [FILL]/app
   npm install
   cp .env.example .env.local     # then fill in your own Firebase values
   npm run dev
   ```
   Then the Firebase steps, numbered: create a project; turn on AI Logic (Gemini Developer API); register a web app and copy its config into `.env.local`; turn on App Check and add a debug token for localhost; turn on Anonymous Auth, Firestore and Remote Config; deploy the rules (`firebase deploy --only firestore:rules`). `.env.example` must exist with names only and empty values.
7. **Tests.** The command for the unit tests, and how to open the leak-test page.
8. **Leak-test result.** Score on the 30 synthetic notes `[FILL]`, the date, and the misses listed plainly.
9. **Limitations.** See below. Use this wording, do not soften it.
10. **Security notes.** What is stored where: token map, note and restored letter in memory only; the approved anonymous text in Firestore until the letter arrives. No analytics or crash SDK.
11. **Pre-existing code.** None. Built during the hackathon. Say which AI tools helped write it.
12. **Licence.** `[FILL: MIT suggested]`, with a `LICENSE` file at the top of the repo. The file does not exist yet and the rules require it.

### Limitations section (text to use)
- **The redactor misses things.** On our 30 synthetic notes it scored `[FILL]`. The dentist's check before Approve is the real control, not the model.
- **Hiding names is not the same as anonymous.** A rare condition, an exact date or a job title can still point to one person. Clinical details are sent to the cloud on purpose.
- **Synthetic data only.** This build uses the free Gemini Developer API, where Google may keep and review prompts. We make no privacy claim for real patients and no DPDP or HIPAA claim.
- **Automatic redaction needs desktop Chrome 139+** with the flag on and the on-device model downloaded. On phones and other browsers it is manual mode.
- **The approved anonymous text is stored in Firestore** while a letter is queued, and deleted when the letter arrives.
- **Copy puts the full letter, with names, on the clipboard.** Clipboard history or sync may keep it.
- **The letter is a draft.** The model can be wrong. The dentist must read it before using it. The app gives no diagnosis or advice.
- **Tested on English notes only** `[confirm at T13]`, on a small synthetic set written by one dentist.
- **Free tier limits.** The live demo can stop working if the quota runs out.

## 3. T13 secrets, history and PII audit

Run in Git Bash from the repo root, in this order. Paste each result into the T13 report as PASS or FAIL. Do not print a token, key or note into the report: say which file and line.

**If any secret or real patient detail is found in history: stop. Do not rewrite history yourself. Tell Dr. Yatin.** A leaked debug token or key must be deleted in the Firebase console; removing it from git is not enough.

### 3.1 Files that should never be tracked
```bash
# now
git ls-files | grep -iE '(^|/)\.env|debug\.log$|service.?account|adminsdk|\.pem$|\.p12$|\.key$'
# ever, on any branch
git log --all --diff-filter=A --name-only --format= | sort -u \
  | grep -iE '(^|/)\.env|debug\.log$|service.?account|adminsdk|\.pem$|\.p12$|\.key$'
# ignore rules work
git check-ignore -v app/.env.local
```
Pass: the first two print nothing except `.env.example`; the third prints a `.gitignore` rule.

### 3.2 Secrets in the full history
```bash
git log -p --all -- . ':(exclude)*package-lock.json' | grep -nE \
  'AIza[0-9A-Za-z_-]{35}|BEGIN [A-Z ]*PRIVATE KEY|"private_key"|client_email|DEBUG_TOKEN.{0,6}[=:].{0,3}[0-9A-Za-z-]{20,}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

# if gitleaks is installed (older versions: gitleaks detect --redact -v)
gitleaks git --redact -v
```
How to read the hits:
- A long code shaped like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` may be an App Check debug token. FAIL, stop.
- `private_key` or `client_email`: a service-account file. FAIL, stop.
- `AIza…`: the Firebase web key. It is public by design, but it belongs in `.env.local`, not in git. Report it, move it, and confirm the key is restricted in 3.6.

### 3.3 The built site
```bash
cd app && npm run build
# the debug token's value must not be in the build (prints only clean or LEAK)
T=$(grep -E 'DEBUG_TOKEN' .env.local | head -1 | cut -d= -f2- | tr -d '"\r')
[ -n "$T" ] && grep -rqF "$T" dist && echo LEAK || echo clean
npm audit --audit-level=high
cd ..
```
Search for the value, not the word: the Firebase SDK itself may contain the text `DEBUG_TOKEN`, which is harmless.

### 3.4 Code rules (source, not the minified build)
```bash
# storage: only the queue module may appear
git grep -nE 'localStorage|sessionStorage|indexedDB|document\.cookie' -- app/src
# logging, raw HTML, debug handles
git grep -nE 'console\.(log|debug|info|warn|error)|dangerouslySetInnerHTML|window\.[A-Za-z_]+ *=' -- app/src
# no analytics, crash or performance SDK
git grep -niE 'firebase/analytics|firebase/performance|crashlytics|sentry|measurementId|gtag\(' -- app
# redaction must not import the cloud model
git grep -nE 'ONLY_IN_CLOUD|PREFER_ON_DEVICE|inCloudParams' -- app/src | grep -i redact
```
Pass: first command lists the queue module only; the other three print nothing.

### 3.5 PII scan: files and history
The repo is full of synthetic names on purpose (`data/notes.json`), so a name search proves nothing. Search for the things a real record would carry, then let Dr. Yatin read the short list.
```bash
PII='(?<!\d)(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?<!\d)\d{4}\s\d{4}\s\d{4}(?!\d)|\b[A-Z]{5}\d{4}[A-Z]\b'

# files now
git grep -nIP "$PII" -- . ':(exclude)*package-lock.json' ':(exclude)data/notes.json'
# every unique hit that was ever committed, on any branch
git log -p --all -- . ':(exclude)*package-lock.json' | grep -oP "$PII" | sort -u
# every phone and email inside the synthetic set, to compare against
grep -oP "$PII" data/notes.json | sort -u
# who the commits say wrote them (this becomes public with the repo)
git log --all --format='%an <%ae>' | sort -u
# pictures, PDFs and video in the repo: open and look at each one
git ls-files | grep -iE '\.(png|jpe?g|webp|gif|pdf|mp4|mov)$'
```
The pattern finds Indian mobile numbers, email addresses, Aadhaar-style numbers and PAN-style codes.

Pass means all of these:
- Every phone number or email outside `data/notes.json` is also in `data/notes.json`, or is an obvious placeholder such as `noreply@…`.
- Dr. Yatin has read the unique-hits list and confirmed none belongs to a real person, including himself, his staff and his clinic.
- Dr. Yatin has seen the author line and is happy for that name and email to be public.
- Every image and PDF shows synthetic patients only, with the banner in shot.

Sonnet cannot decide whether a name is real. Give Dr. Yatin the lists and wait for his answer.

### 3.6 Console and live-site checks (Dr. Yatin does these with Sonnet's help)
- [ ] App Check: enforced for AI Logic and Firestore; unused debug tokens deleted
- [ ] Firestore rules deployed; a second anonymous user cannot read the first user's queue item
- [ ] Analytics and AI monitoring are off
- [ ] Web API key restricted to the hosting domain and localhost; per-user rate limit set
- [ ] Hosted site, fresh Chrome profile: run note 1 with the Network panel open, search every request body for the patient's name and phone: zero hits
- [ ] Same profile with Nano turned off: redaction sends zero requests and the app goes to manual mode
- [ ] The response headers show the CSP from `firebase.json`

## 4. Submission day: 30 Nov 2026 (IST)

The deadline is **1 Dec, 3:30 AM IST**. Plan to submit at 4:00 PM on 30 Nov and never use the night. These times assume T13 to T15 are finished by 29 Nov; PLAN.md section 4 was not read for this file, so if its dates differ, PLAN.md wins and these times move.

| Time | Do this | Done when |
|---|---|---|
| 10:00 AM | Open the live site in a fresh Chrome profile. Run note 1 end to end, then the offline run, then the leak-test page | All three work; banner visible; badges correct |
| 10:45 AM | Firebase console: App Check enforced, quota not near the limit, rules deployed | Seen with your own eyes today |
| 11:15 AM | Re-run section 3.1, 3.2 and 3.5 on the final commit | All PASS |
| 11:45 AM | Make the repo public. Open it in a private window, not signed in | README shows, `LICENSE` shows, run steps are there, no `.env` file |
| 12:15 PM | Video: set to Public (not Unlisted, not Private). Watch it once in a private window | Under 3:00, English subtitles on, synthetic data only, plays without signing in |
| 1:00 PM | Lunch. Do not skip it | |
| 2:00 PM | Replace every `[FILL]` in SUBMISSION.md and the README: repo, live app, video, leak-test score | Searching both files for `[FILL]` finds nothing |
| 2:30 PM | Paste the description into Devpost. Check it against the word limit noted in CONSISTENCY.md. Check the "pre-existing code: none" line is there | Saved as draft, no warnings |
| 3:00 PM | Go through PLAN.md section 6 line by line, all ten boxes | All ticked |
| 3:30 PM | Click every link in the Devpost draft from a private window | Repo, app and video all open |
| **4:00 PM** | **Submit on Devpost** | Confirmation page and email received; screenshot both |
| 4:15 PM | Open the public submission page on your phone | It shows the right video and links |
| 4:30 PM | Freeze. No more commits, pushes, deploys or video edits | |
| 9:00 PM | Last sensible moment to fix a real problem and resubmit | |
| 1 Dec, 3:30 AM | Deadline. After this, change nothing: not the repo, not the site, not the video | |

If something breaks after 4:30 PM: fix only that one thing, re-run 3.2 and 3.5, resubmit, and re-check the links.

### After submitting
- Keep the site, the Firebase project and the public repo exactly as they are until **21 Dec**. Do not make the repo private, delete the project or change billing.
- 9 Dec (the day before judging starts): open the live site and run note 1 once. Check the quota. Judging is 10 to 16 Dec.
- Do not push to the default branch until winners are announced. New ideas go on a separate branch, unpushed.
