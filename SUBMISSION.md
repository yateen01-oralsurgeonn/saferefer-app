# SUBMISSION: SafeRefer (#BuildHybridAI 2026)

Draft. Items marked `[FILL]` need real values before submitting.

## 1. Devpost description

### SafeRefer: referral letters without sending the patient's identity to the cloud

**The problem.** Dentists paste patient notes into chatbots to get a referral letter. The patient's name, phone number and family details go with the note.

**What SafeRefer does.** SafeRefer is a web app for Chrome. The dentist types or pastes a clinical note. The note is cleaned inside the browser first: names, phone numbers and other identifiers are replaced with tokens. The dentist sees the cleaned text side by side with the original and approves it. Only then does the cleaned note go to the cloud, which writes the referral letter. The browser puts the real names back into the finished letter.

**How Firebase AI Logic is used.**
- Every model call goes through the Firebase AI Logic web SDK at runtime.
- On-device only: Gemini Nano in Chrome does the redaction, so the raw note stays in the browser. Redaction never falls back to the cloud.
- On-device first, cloud fallback: the tooth lines run on Gemini Nano and fall back to the cloud Gemini model when Nano is missing. The fallback gets the tokenised note only, and a badge shows which model ran.
- Cloud only: the cloud Gemini model drafts the letter from the tokenised note only.
- App Check protects the cloud calls. Anonymous Auth and Firestore hold the offline queue; Remote Config sets the cloud model name and the letter template.
- Offline, the on-device steps still work. The letter request is queued and sent when the connection returns.

**Features.**
- In-browser redaction with a review-and-approve step before anything is sent
- Split view showing exactly what the cloud will receive
- Names restored locally in the final letter
- Offline mode with a queued letter
- Leak-test page: the redactor is run on 30 synthetic notes and the score is shown, misses included

**Value.** The dentist gets the convenience of a cloud model for the writing, while the identifiers that the redactor finds and the dentist approves as hidden stay on their own machine. The redactor can miss a name, so the dentist's check is the real control; this prototype makes no privacy claim for real patients. The approval step and the published leak-test score let the dentist see how well the redaction works instead of trusting a promise.

**Where it is going.** SafeRefer's core (redaction, send guard, name restore, fact check) is a separate module so it can be reused. Next it goes into Enamel, the clinic software I build and use in my own dental practice, as the privacy step before any cloud AI sees a patient note. `[FILL: "already wired in, shown in the video" or "after the hackathon"]`

**Data.** All notes in the app, repo and video are synthetic and labelled as such. SafeRefer is a hackathon prototype and does not give patient advice.

**Pre-existing code.** None in this repo. Everything here was built during the hackathon. Enamel is a separate, closed product that existed before; it is not part of this entry.

**Links.** Repo: `[FILL]` · Live app: `[FILL]` · Video: `[FILL]`

## 2. Demo script (2:45, English, subtitles)

| Time | Shot | Voiceover | On-screen text |
|---|---|---|---|
| 0:00-0:15 | A chatbot window with a patient note pasted in | "Dentists paste patient notes into chatbots. The name goes with it." | The name goes with it. |
| 0:15-0:40 | SafeRefer, synthetic banner visible. Type the Asha Patil note | "Here the note is cleaned inside the browser first." | SafeRefer · Synthetic data only |
| 0:40-1:05 | Split screen. Right panel shows tokens only | "This is everything the cloud will see. No name, no phone, no husband." | What the cloud sees: tokens only |
| 1:05-1:25 | Approve, Send. Letter arrives, names snap back | "The cloud writes the letter. The browser puts the names back." | Names restored in the browser |
| 1:25-1:45 | Chrome network panel, request body open | "The request, as sent. No identifiers." | The actual request body |
| 1:45-2:20 | Wi-Fi off. Redact, tooth lines, "Queued". Wi-Fi on, letter arrives | "Offline, the on-device model still works. The letter waits." | Offline: on-device still works ("on-device" badge in shot) → Back online: letter sent |
| 2:20-2:30 | Leak-test page with the score | "Tested on 30 synthetic notes. Misses included." | 30 synthetic notes · score `[FILL]` |
| 2:30-2:40 | If built: Enamel's "Write referral letter" button on demo data. If not: architecture diagram | Built: "It is already inside Enamel, my clinic software." Not built: "Next, it goes into Enamel, my clinic software." | Next: inside Enamel · Demo data |
| 2:40-2:50 | Architecture diagram, repo URL | "Firebase AI Logic, Gemini Nano, App Check. Code is open." | Firebase AI Logic · Gemini Nano · App Check · `[FILL repo URL]` |

Change from PLAN.md: the opening shot is 15 s instead of 20 s. The leak-test shot is 10 s, and a 10 s Enamel shot is added, so the video is 2:50.
