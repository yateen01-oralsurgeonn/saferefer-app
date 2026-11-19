# ACCEPTANCE: done-checks for T3 to T15

**You check** = Dr. Yatin, by eye, under 2 minutes. **Sonnet tests** = the one test Sonnet must run and report before saying "done".
Use synthetic notes from `data/notes.json` only. A task is not done until both lines pass.

**"Nano off" means one of these two states. The Chrome flag does NOT turn Nano off on Chrome 157 (T1 test d), so never use it.**
1. **No `LanguageModel` at all:** open the dev server in Edge. The SDK then sends every mode to the cloud, so the app's own guard must stop redaction (SECURITY A4).
2. **`LanguageModel` present but `unavailable`:** a fresh Chrome profile, for example through Playwright. The SDK throws and sends nothing.
Test both. Check `typeof LanguageModel` and `await LanguageModel.availability()` in the console first, so you know which state you are in.

## T3 Code redactor
- **You check:** Paste note 1. The name shows as `[PATIENT]`, the phone as `[PHONE]`, each date as `[DATE_1]`, `[DATE_2]`. The age and tooth numbers are still there.
- **Sonnet tests:** Run the redactor over all 30 notes. No header name, phone, email or date from a note's identifier list is left in its output.

## T4 Nano redactor
- **You check:** Paste a note with "husband Ramesh, works at Infosys". You see `[RELATIVE_1]` and `[EMPLOYER]`. Tooth numbers and drug names are untouched.
- **Sonnet tests:** Nano off in both states above, Network panel open. Redaction shows "The on-device model is not available. Hide every name by hand, then tick the box." (or the "Browser not supported" text when there is no `LanguageModel` at all; T12 changed the texts to the FINISH.md table, see core/messages.ts) and sends **zero requests to `firebasevertexai.googleapis.com`** (an App Check `exchangeDebugToken` call may appear; it carries no note text, and SECURITY A4 says to note when it fires). Plus a unit test: with `LanguageModel` undefined the redactor returns state `manual` and `fetch` is never called.

## T5 Split screen and send guard
- **You check:** Typing on the left updates the right. Send is grey until you click Approve. Change one letter after Approve: Send goes grey again.
- **You check:** A note with a name left in shows "A name may still be in the text. Nothing was sent. Please check the highlighted words." and the offending word is marked in the right-hand text (T12 text, core/messages.ts)
- **Sonnet tests:** Send guard unit tests. "Rameshs", "RameshPatil", "RAMESH", a 3-letter name as a whole word, a phone and an email are all blocked.

## T6 Cloud letter
- **You check:** Note 1, Approve, Send. A full letter appears with section headings. Names are still tokens such as `[PATIENT]`. No real name anywhere.
- **Sonnet tests:** Open the request body in the Network panel and search it for the note's name and phone. Zero hits; the body holds only the approved text.

## T7 Restore, fact check, copy
- **You check:** The names snap back into the letter. Type "tooth 47" into the letter (not in the note): a red warning "Tooth 47 is not in your note" appears and Copy is off. Delete it: Copy works.
- **Sonnet tests:** Restore unit tests. `[Patient]` and `[ PATIENT ]` are repaired; an unknown token such as `[PERSON_9]` stays as it is and raises a red warning.

## T8 Leak-test page
- **You check:** Open the page. It shows "Identifiers leaked: X of Y" and lists every miss. A bad score is shown, not hidden.
- **Sonnet tests:** Feed the scorer one note with redaction skipped. It must report every identifier in that note as leaked.

## T9 Tooth lines
- **You check:** After Approve, a tooth list appears with an "on-device" badge. Every tooth in the list is in the note. An age such as "36 years" is not listed as a tooth.
- **Sonnet tests:** Nano off (Edge, or a fresh Chrome profile). The badge says "cloud", and the request body holds only the approved anonymous note.

## T10 Offline
- **You check:** Wi-Fi off: redaction still works, Send shows "Queued". Wi-Fi on: the letter arrives by itself.
- **Sonnet tests (local queue, decided 19 Nov):** Read the stored record (`indexedDB` database `saferefer-queue`). It holds exactly `id`, `packId`, `approved` (anonymous text only), `savedAt`; it is removed when the letter arrives; a reload shows the "letter from your last visit" panel and sends it with labels.

## T11 Remote Config
- **You check:** Rename one section in the template in the Firebase console and publish. Reload the app and send a note: the new wording shows in the letter.
- **Sonnet tests:** Set a template with brackets in it, and a model name that is not on the allow-list. The app falls back to the defaults.

## T12 Design pass
- **You check:** The screen looks finished at full width and at phone width. The empty screen tells you what to do. Wi-Fi off and Send: a plain message, no raw error text.
- **Sonnet tests:** Force each failure (offline, App Check refused, bad model reply, no Nano in both states above). Each shows its fixed message, and the console prints no note text.

## T13 Deploy and secrets check
- **You check:** Open the hosted URL in a fresh Chrome profile. Note 1 goes in, a letter comes out. The repo opens without login and shows the README and licence.
- **Sonnet tests:** Run every box of the SECURITY.md T13 checklist and report each result, pass or fail.

## T14 Video
- **You check:** The YouTube link opens in an Incognito window. Length is under 3:00. Subtitles show. The "Synthetic patients only" banner is visible.
- **Sonnet tests:** Before recording, compare every line of the SUBMISSION.md script with the built app. List any shot the app cannot do.

## T15 Devpost
- **You check:** Devpost shows "Submitted". The video, repo and app links all open in an Incognito window.
- **Sonnet tests:** Before submitting, go through the PLAN.md section 6 checklist line by line and count the description's words against the limit.
