# PLAN: SafeRefer (#BuildHybridAI 2026)

Builder: Sonnet 5.5, alone. Deadline: 1 Dec 2026, 3:30 AM IST. Submit by 29 Nov.
If this plan disagrees with RULES.md, RULES.md wins.

## 1. Architecture

```
CHROME, ON-DEVICE (works offline)              CLOUD (Firebase)
---------------------------------              ----------------
typed note
  |
1 code redactor: header fields, phone, date
2 Nano redactor: free-text names, employer, address
3 preview: dentist approves
  |   token map (names) stays in memory only
  |------ anonymous note ------------------->  4 Gemini drafts letter
  |<----- letter with tokens ----------------    (App Check on every call)
5 fact check, restore names, edit, copy
6 tooth lines: Nano first - - if no Nano - ->  Gemini (anonymous note only)

Offline: steps 1, 2, 3, 6 work. Step 4 queues until reconnect.
Privacy lock: steps 1-3 never call the cloud. No Nano = dentist redacts by hand.
```

## 2. Tech stack

| Need | Choice | From |
|---|---|---|
| Platform | Web, Chrome desktop, Gemini Nano 4 | RULES: one platform |
| AI calls | Firebase AI Logic web SDK (`firebase/ai`), all three modes: on-device only (redaction), cloud only (letter), prefer on-device (tooth lines) | RULES: required, hybrid |
| Abuse guard | App Check: debug token locally, reCAPTCHA on the hosted site | RULES: required |
| Extras | Anonymous Auth, Firestore (offline queue of anonymous notes), Remote Config (cloud model name, letter template) | RULES: encouraged |
| App | Vite + React + TypeScript, plain CSS, PWA service worker | Builder's choice |
| Host | Firebase Hosting, Gemini Developer API on the free plan | RULES: free judge access |
| Licence | Apache-2.0 | RULES: visible licence |

Install latest versions on day 1 and commit `package-lock.json`. Take SDK and model names from the current Firebase docs, not memory.

## 3. Tasks

Each is half a day or less.

| # | Task | Done when |
|---|---|---|
| T1 | Firebase project, Vite app, App Check, one hybrid call | Page shows a model reply and a badge saying "on-device" or "cloud" |
| T2 | 30 synthetic notes in `data/notes.json`, each with its list of identifiers | File has 30 notes; app shows a "Synthetic patients only" banner |
| T3 | Code redactor: header fields, phones, dates, emails become tokens | Paste note 1: name and phone show as `[PATIENT]`, `[PHONE]` |
| T4 | Nano redactor for free text, merged with T3 | Note with "husband Ramesh, works at Infosys" shows `[RELATIVE_1]`, `[EMPLOYER]` |
| T5 | Split screen: "What you see" and "What the cloud sees", with approve button and hand-edit | Typing on the left updates the right; Send is greyed until Approve |
| T6 | Cloud draft of one letter type: endodontist referral | Click Send: a full letter appears, still with tokens |
| T7 | Restore names, fact check, edit box, copy button | Names snap back; a letter with a tooth number not in the note shows a red warning |
| T8 | Leak-test page over the 30 notes | Page shows "Identifiers leaked: X of Y" and lists any misses |
| T9 | Tooth lines (FDI) from the anonymous note, Nano first, cloud fallback | Tooth list appears with a badge showing which model ran |
| T10 | Offline: service worker, Firestore queue | Wi-Fi off: redaction works, letter shows "Queued"; Wi-Fi on: letter arrives |
| T11 | Remote Config for model name and template | Change the template in the console, reload, new wording shows |
| T12 | Design pass: one screen, empty and error states | Looks finished at 1280 px and phone width; no raw error text |
| T13 | Deploy, README, LICENSE, secrets check | Hosted URL works in a fresh Chrome profile; repo is public |
| T14 | Record and upload the video | Public YouTube link, under 3:00, subtitles on |
| T15 | Devpost submission | Devpost shows "Submitted" |

## 4. Schedule (IST)

| Day | Work |
|---|---|
| Tue 17 Nov | T1 |
| Wed 18 | T2, T3 |
| Thu 19 | T4 |
| Fri 20 | T5 |
| Sat 21 | T6 |
| Sun 22 | T7. **Checkpoint: note in, letter out, names never sent.** |
| Mon 23 | T8 |
| Tue 24 | T9 |
| Wed 25 | T10 |
| Thu 26 | T11, T12 |
| Fri 27 | T13 |
| Sat 28 | T14 |
| Sun 29 | T15 |
| Mon 30 | Buffer only. No new features. |

If the 22 Nov checkpoint slips by more than a day, drop T11, then T10. Keep T9: it is the only "on-device first, cloud fallback" call, which RULES.md requires.

## 5. Demo video (2:50, English, subtitles)

| Time | Shot | Voice |
|---|---|---|
| 0:00-0:20 | A chatbot window with a patient note pasted in | "Dentists paste patient notes into chatbots. The name goes with it." |
| 0:20-0:45 | SafeRefer, synthetic banner visible. Type the Asha Patil note | "Here the note is cleaned inside the browser first." |
| 0:45-1:10 | Split screen. Right panel shows tokens only | "This is everything the cloud will see. No name, no phone, no husband." |
| 1:10-1:30 | Approve, Send. Letter arrives, names snap back | "The cloud writes the letter. The browser puts the names back." |
| 1:30-1:50 | Chrome network panel, request body open | "The request, as sent. No identifiers." |
| 1:50-2:25 | Wi-Fi off. Redact, tooth lines, "Queued". Wi-Fi on, letter arrives | "Offline, the on-device model still works. The letter waits." |
| 2:25-2:40 | Leak-test page with the score | "Tested on 30 synthetic notes. Misses included." |
| 2:40-2:50 | Architecture diagram, repo URL | "Firebase AI Logic, Gemini Nano, App Check. Code is open." |

## 6. Submission checklist (RULES.md)

- [ ] Firebase AI Logic called at runtime, with App Check
- [ ] Hybrid shown: on-device first, cloud fallback (T9)
- [ ] Video: 3 min or less, public on YouTube, English or subtitles
- [ ] Public repo: full source, run instructions, visible licence
- [ ] No production keys, secrets, debug tokens or PII in the repo or its history
- [ ] Text description: how Firebase AI Logic is used, features, value
- [ ] Pre-existing code disclosed (none; say so)
- [ ] Judges can use it free until judging ends: keep hosting live to 21 Dec
- [ ] Submitted before 1 Dec 3:30 AM IST; no changes after
- [ ] Synthetic data only, labelled in app, repo and video

## 7. What NOT to build

- Voice input, photos, X-rays, or languages other than English
- Android or iOS versions
- More than one letter type
- Login screens, patient lists, saved history, settings
- Patient-facing text; diagnosis or treatment advice
- Cloud fallback for redaction
- Enamel links or Enamel code
- Legal compliance claims (DPDP, HIPAA)
- A backend server or Cloud Functions
- Token map stored outside browser memory
