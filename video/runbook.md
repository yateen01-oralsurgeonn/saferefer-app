# Runbook: recording the 3-minute video (Dr. Yatin records, 1280 x 720)

Read `preflight.md` first and tick every box. Notes to paste are in `demo-notes.md`. Spoken lines and timings are in `voiceover.md`; the subtitle file is `subtitles.srt`.

## 0. Script versus the built app (ACCEPTANCE T14, checked 20 Nov 2026)

| Script shot | Can the app do it today? | What to do |
|---|---|---|
| 1. "A chatbot window with a made-up note" | **Not an app feature.** | Open `video/chatbot-mock.html` (a generic made-up chat window, no brand, banner on screen). Never use a real chat or a real chatbot's logo. |
| 2. Type or paste the dentist note, banner visible | **Yes.** Banner "Synthetic data only: not for real patients" is in the header of every screen. | Paste, do not type (typing is slow on camera). |
| 3. Split screen, labels only | **Yes.** Right panel "What the cloud will see". | The note must include a relative: demo note 1 does ("[RELATIVE_1]"). |
| 4. Approve, Send, letter, names snap back | **Yes.** Letter, Cloud badge, "Names were put back in this browser". | With Nano on, hide-by-hand tickbox is not needed. |
| 5. Network panel, request body | **Yes on the hosted URL**, DevTools docked. | See shot 5 below; the body is `contents > 0 > parts > 0 > text`. |
| 6. Wi-Fi off, On-device badge, "Queued", Wi-Fi on, letter arrives | **Yes**, tested on his laptop 20 Nov. Real text: "You are offline. The letter is queued and will be sent when you are back online." The queued letter retries every 10 s; allow 20 s after Wi-Fi returns. | **Hosted URL only.** The tooth list "On-device" badge needs Nano. Load the page once online first so the service worker holds the shell. |
| 7. CA, then Advocate | **Yes**, profession dropdown. | Both notes need **Nano** (see `demo-notes.md`). |
| 8. Leak-test page, locked + hand sets, with Nano | **Yes, but only on `npm run dev`** (`/?leak&pack=...&set=locked` and `set=hand`). The page is NOT in the hosted build (the T13 audit removed it on purpose). It has its own banner. | Record this shot on `localhost:5199`, **not** the hosted URL. Run it once off camera to time it. |
| 9. Architecture diagram, repo URL | **No diagram existed.** | `video/architecture.html` is new; open it full-window. |
| Banner "in every shot" | App screens and the leak page: yes. Chat mock and diagram: yes, I put one in each. | Do not crop the top of the window. |

**Wording fixed in the script:** the old line "Tested on notes I had not seen" is replaced (see `voiceover.md`), because only the advocate set is a clean test.

**Not testable by the builder:** the On-device badge and Nano redaction on camera (headless browser has no Nano). Your Chrome decides; that is why the pre-flight has you try all three notes first.

## 1. Shot by shot

### Shot 1, 0:00-0:12, chat window
- Screen: `video/chatbot-mock.html` full window.
- Do: nothing; let the pasted note sit; zoom is already set in the page.
- Say: line 1. About 4 s of silence at the start is fine.
- Cut if long: hold 8 s instead of 12.

### Shot 2, 0:12-0:32, paste the dentist note
- Screen: hosted app https://saferefer-d5175.web.app, profession **Dentist**, empty note.
- Do: click the note box, **Ctrl+V** demo note 1. Wait 2 s while it redacts.
- Say: line 2.
- Cut if long: skip the wait; the panel fills by itself.

### Shot 3, 0:32-0:52, split screen
- Screen: same page. Mouse slowly under the right panel.
- Do: hover over `[PATIENT]`, `[PHONE]`, `[DATE_1]`, `[RELATIVE_1]` one by one (no clicking).
- Say: line 3.
- Cut if long: hover three labels, not four.

### Shot 4, 0:52-1:10, Approve and Send
- Do: click **Approve**, then **Send**. Spinner, then the letter with the **Cloud** badge. The names in the edit box are the real ones again.
- Say: line 4.
- Cut if long: trim the wait for the letter (usually 3 to 6 s; it is real, do not fake it).

### Shot 5, 1:10-1:28, the actual request
- Setup (done in pre-flight): DevTools docked on the right, **Network** tab, filter `generateContent`, "Preserve log" on, list cleared before shot 4.
- Do: click the `gemini-3.5-flash-lite:generateContent` row of type **fetch** (not preflight) > **Payload** > expand `contents` > `0` > `parts` > `0` > the `text` line. It reads `Patient: [PATIENT], 52 years. Phone: [PHONE]...`. Hold 4 s on it.
- Say: line 5.
- Do **not** open the headers tab or the `?key=` line on camera (the web key is public, but keep it off screen anyway).
- Cut if long: this is the first shot to trim (to 10 s).

### Shot 6, 1:28-1:55, offline
- Do: type or paste the dentist note again (fresh page reload first), watch the tooth list show **On-device**, then **switch Wi-Fi off** (laptop switch or airplane mode), click **Approve** and **Send**: the status says "You are offline. The letter is queued and will be sent when you are back online." Switch Wi-Fi **on**. Wait up to 20 s: the letter appears by itself.
- Say: line 6 (stop talking while you wait).
- Do **not** cut this shot (no other entry has it). If the first wait is long, speed it up and show a small "sped up" caption.
- Take it twice; keep the take where the queued message and the arrival are both clear.

### Shot 7, 1:55-2:20, CA then Advocate (10 to 12 s each)
- Do: dropdown > **Chartered Accountant**, paste demo note 2, wait for the labels, point at the amount `Rs 4,85,000` and `section 143(1)` (visible) and `[ID]` (hidden). Then **Advocate**, paste demo note 3, point at `section 138` and `Rs 6,50,000` (visible) and `[ID_3]` where the settlement sum was.
- Say: line 7.
- Cut if long: 7 s each.

### Shot 8, 2:20-2:42, leak test (record on `npm run dev`)
- Setup: from `app/` run `npm run dev` (port 5199). Your Chrome with Nano on.
- Do: (a) open `http://localhost:5199/?leak&pack=law&set=locked`, click run, show the result (about **16 of 558**, 2.9%); the run is long, so record it and speed it up 4x with the "sped up" caption. (b) open `?leak&pack=law&set=hand`, run (10 notes, quick), show **about 15 of 32** (46.9%). Each page title must say what the set is ("generated" or "written with an AI assistant"). Numbers can move by a few between runs; if they differ, say the rounded line 8 numbers only if they still hold, otherwise update the line first.
- On-screen text (add in the edit): **300 generated notes: 2-3% left · 40 realistic notes written with an AI assistant: about 30% left · small sets**. Never "private", "safe" or "compliant".
- Say: line 8 **(record last; update the numbers if they changed)**.
- Do not cut this shot.

### Shot 9, 2:42-2:55, architecture and repo
- Screen: `video/architecture.html` full window.
- On-screen: repo URL https://github.com/yateen01-oralsurgeonn/saferefer-app (the repo must be public by now).
- Say: line 9.

## 2. After recording (the builder checks, you upload)
1. Length under 3:00 (aim 2:50 to 2:55).
2. Subtitles on: upload `subtitles.srt` in YouTube Studio; set language English.
3. Banner visible in every shot (scrub the video; the chat mock and diagram have their own).
4. Nothing real on screen: no real name, no phone not starting with 00000, no face of a patient, no API key or token. Look hardest at shot 5 (request body must show labels only) and shot 6 (no notification pop-ups).
5. The YouTube link opens in an **Incognito** window and is **Public** (not unlisted).
6. Description: repo link, live-app link, "Synthetic data only. Not for real patient data." No "reviewed by" claims, no "private/safe/compliant".
