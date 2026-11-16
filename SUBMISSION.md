# SUBMISSION: SafeRefer (#BuildHybridAI 2026)

Draft. Items marked `[FILL]` need real values before submitting.

## 1. Devpost description

### SafeRefer: referral letters without sending the patient's identity to the cloud

**The problem.** Dentists paste patient notes into chatbots to get a referral letter. The patient's name, phone number and family details go with the note.

**What SafeRefer does.** SafeRefer is a web app for Chrome. The dentist types or pastes a clinical note. The note is cleaned inside the browser first: names, phone numbers and other identifiers are replaced with tokens. The dentist sees the cleaned text side by side with the original and approves it. Only then does the cleaned note go to the cloud, which writes the referral letter. The browser puts the real names back into the finished letter.

**How Firebase AI Logic is used.**
- Every model call goes through the Firebase AI Logic web SDK at runtime.
- On-device first: Gemini Nano in Chrome does the redaction and the tooth lines, so the raw note stays in the browser.
- Cloud second: the cloud Gemini model drafts the letter from the tokenised note only.
- App Check protects the cloud calls.
- Offline, the on-device steps still work. The letter request is queued and sent when the connection returns.

**Features.**
- In-browser redaction with a review-and-approve step before anything is sent
- Split view showing exactly what the cloud will receive
- Names restored locally in the final letter
- Offline mode with a queued letter
- Leak-test page: the redactor is run on 30 synthetic notes and the score is shown, misses included

**Value.** The dentist gets the convenience of a cloud model for the writing, while the identifying details stay on their own machine. The approval step and the published leak-test score let the dentist see how well the redaction works instead of trusting a promise.

**Data.** All notes in the app, repo and video are synthetic and labelled as such. SafeRefer is a hackathon prototype and does not give patient advice.

**Pre-existing code.** None. Everything was built during the hackathon.

**Links.** Repo: `[FILL]` · Live app: `[FILL]` · Video: `[FILL]`

## 2. Demo script (2:45, English, subtitles)

| Time | Shot | Voiceover | On-screen text |
|---|---|---|---|
| 0:00-0:15 | A chatbot window with a patient note pasted in | "Dentists paste patient notes into chatbots. The name goes with it." | The name goes with it. |
| 0:15-0:40 | SafeRefer, synthetic banner visible. Type the Asha Patil note | "Here the note is cleaned inside the browser first." | SafeRefer · Synthetic data only |
| 0:40-1:05 | Split screen. Right panel shows tokens only | "This is everything the cloud will see. No name, no phone, no husband." | What the cloud sees: tokens only |
| 1:05-1:25 | Approve, Send. Letter arrives, names snap back | "The cloud writes the letter. The browser puts the names back." | Names restored in the browser |
| 1:25-1:45 | Chrome network panel, request body open | "The request, as sent. No identifiers." | The actual request body |
| 1:45-2:20 | Wi-Fi off. Redact, tooth lines, "Queued". Wi-Fi on, letter arrives | "Offline, the on-device model still works. The letter waits." | Offline: on-device still works → Back online: letter sent |
| 2:20-2:35 | Leak-test page with the score | "Tested on 30 synthetic notes. Misses included." | 30 synthetic notes · score `[FILL]` |
| 2:35-2:45 | Architecture diagram, repo URL | "Firebase AI Logic, Gemini Nano, App Check. Code is open." | Firebase AI Logic · Gemini Nano · App Check · `[FILL repo URL]` |

Change from PLAN.md: the opening shot is 15 s instead of 20 s; every later shot keeps its length and starts 5 s earlier.
