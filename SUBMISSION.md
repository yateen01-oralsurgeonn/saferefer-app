# SUBMISSION: SafeRefer (#BuildHybridAI 2026)

Updated 20 Nov 2026 (T13) to match the built app. Items marked `[FILL]` need real values before submitting. Every number below is in `LEAK-RESULTS.md`; change both together.

## 1. Devpost description

### SafeRefer: letters and briefs for professionals, without sending the client's identity to the cloud

**The problem.** Doctors, accountants and lawyers paste client notes into chatbots to get a letter drafted. The client's name, phone number and family details go with the note.

**What SafeRefer does.** SafeRefer is a web app for Chrome. A dentist, a chartered accountant or an advocate types or pastes a note. The note is cleaned inside the browser first: names, phone numbers, IDs, dates and addresses are replaced with labels. The user sees the cleaned text side by side with the original and approves it. Only then does the hidden text go to the cloud, which writes the letter: a referral letter, a case summary for a specialist CA, or a brief to senior counsel. The browser puts the real names back into the finished letter and checks it against the original note.

**One engine, three professions.** A profession pack changes only words and rules, never a safety check. Dentist: tooth list and clinical terms stay visible. CA: PAN, GSTIN, bank account and similar IDs are hidden, amounts and sections stay. Advocate: case and FIR numbers and settlement sums are hidden, the other side is hidden as a separate person (never as the client), Acts and court names stay.

**How Firebase AI Logic is used.**
- Every model call goes through the Firebase AI Logic web SDK at runtime.
- On-device only: Gemini Nano in Chrome finds the names in free text, so the raw note stays in the browser. Redaction never falls back to the cloud. We found that `ONLY_ON_DEVICE` alone is not a lock (in a browser with no on-device model the SDK sends the call to the cloud), so the app checks that Nano is really available before every call and otherwise switches to manual mode with no network call; a test proves zero requests.
- On-device first, cloud fallback: the dentist's tooth list runs on Gemini Nano and falls back to the cloud model when Nano is missing; it receives the hidden text only, and a badge shows which model ran.
- Cloud only: the cloud Gemini model drafts the letter from the hidden text only.
- App Check (reCAPTCHA Enterprise) protects the cloud calls. Remote Config can change the section list of each letter and the cloud model name, nothing else, with every value checked and an allow-list for models.
- Offline: redaction and the tooth list still work on the device. Send queues the already hidden letter request in the browser (IndexedDB, hidden text plus profession, never a name) and sends it when the connection returns, with retries every 10 seconds. A service worker keeps the app shell. There is no Firestore and no cloud copy of anything.

**Features.**
- In-browser redaction with a review-and-approve step before anything is sent
- Split view showing exactly what the cloud will receive, and a send guard that checks it once more
- Names restored locally in the final letter, and a fact check against the original note
- Three profession packs on one engine
- Offline mode with a queued letter
- A leak-test page: the redactor is run on synthetic notes and the score is shown, misses included

**Honest results.** On 25 fresh synthetic notes written by a dentist and a helper after the rules were built, 3 of 171 identifiers were left (1.8%) with the code rules plus Gemini Nano. The three were generic words, not names, numbers or places. Before two rule fixes made after the first fresh-note runs, the same notes scored 12% to 17% left, and the builder's own notes had flattered the code (code-only 3.2% on the builder's notes, 43.5% on fresh ones). The advocate set, tested with fixes that were not written for it, left 0 of 69. Ten notes per profession is a small set; "0 of 69" does not mean "never leaks". On 300 locked generated notes 2% to 3% of identifiers were left; on 40 realistic-style notes written with an AI assistant and sealed before any run, 39 of 132 (29.5%) were left (dentist 21% and 30%, CA 21%, advocate 47%), so our 3% target is met on generated notes and not on realistic-style ones. The user checks every note before anything is sent.

**Value.** The professional gets the convenience of a cloud model for the writing, while the identifiers that the redactor finds and the professional approves as hidden stay on their own machine. The redactor can miss a name, so the professional's check is the real control; this prototype makes no privacy claim for real clients and no compliance claim. The approval step and the published leak-test scores let the user see how well the redaction works instead of trusting a promise.

**Where it is going.** SafeRefer's core (redaction, send guard, name restore, fact check, packs) is a separate module so it can be reused. Next it goes into Enamel, the clinic software I build and use in my own dental practice, as the privacy step before any cloud AI sees a patient note. `[FILL: "already wired in, shown in the video" or "after the hackathon"]`

**Data.** All notes in the app, repo and video are synthetic and labelled as such. SafeRefer is a hackathon prototype and gives no medical, tax or legal advice. The CA and advocate letters were reviewed by the builder only.

**Pre-existing code.** None in this repo. Everything here was built during the hackathon, with the help of Claude (Anthropic) through Claude Code. Enamel is a separate, closed product that existed before; it is not part of this entry.

**Links.** Repo: https://github.com/yateen01-oralsurgeonn/saferefer · Live app: https://saferefer-d5175.web.app · Video: `[FILL]`

## 2. Demo script (target 2:50, hard limit 3:00, English, subtitles)

Everything for recording is in `video/` (runbook, demo notes, voiceover, subtitles, pre-flight, chat mock, architecture page); this table is the summary, `video/voiceover.md` has the final lines. Record at 1280 x 720 with the synthetic banner in every shot. Use only made-up notes. Chrome with Nano on, then the Wi-Fi shot.

| Time | Shot | Voiceover | On-screen text |
|---|---|---|---|
| 0:00-0:12 | A chatbot window with a made-up patient note pasted in | "Professionals paste client notes into chatbots. The name goes with it." | The name goes with it. |
| 0:12-0:32 | SafeRefer, banner visible. Type or paste the dentist note | "Here the note is cleaned inside the browser first." | SafeRefer · Synthetic data only |
| 0:32-0:52 | Split screen. Right panel shows labels only | "This is everything the cloud will see. No name, no phone, no relative." | What the cloud sees: labels only |
| 0:52-1:10 | Approve, Send. Letter arrives, names snap back | "The cloud writes the letter. The browser puts the names back." | Names restored in the browser |
| 1:10-1:28 | Chrome network panel, request body open | "The request, as sent. No identifiers." | The actual request body |
| 1:28-1:55 | Wi-Fi off. Redact, tooth list ("On-device" badge), Send: "Queued". Wi-Fi on: letter arrives | "Offline, the on-device model still works. The letter waits, then sends itself." | Offline: on-device still works → Back online: letter sent |
| 1:55-2:20 | Switch to Chartered Accountant, then Advocate: same flow, 10 s each | "Same engine, three professions. Amounts and sections stay, IDs and settlement sums are hidden." | CA · Advocate · one engine |
| 2:20-2:42 | Leak-test page on `npm run dev`, locked and hand sets, with Nano | "On 300 generated notes, two to three percent of identifiers were left. On 40 realistic notes written with an AI assistant, about three in ten. Small sets. You check every note before it is sent." | 300 generated notes: 2-3% left · 40 realistic notes written with an AI assistant: about 30% left · small sets |
| 2:42-2:55 | `video/architecture.html`, repo URL | "Firebase AI Logic, Gemini Nano, App Check. The code is open." | Firebase AI Logic · Gemini Nano · App Check · github.com/yateen01-oralsurgeonn/saferefer |

Cut first if it runs over 3:00: the CA/Advocate shot to 2 x 7 s, then the network-panel shot. Do not cut the Wi-Fi shot or the leak-test shot: they are what no other entry will have. Do not claim a review by a CA or an advocate, and do not say "private" or "compliant".
