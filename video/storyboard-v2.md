# SafeRefer demo: storyboard v2 (Kallaway method)

v1 = `final/saferefer-demo.mp4` (2:57, https://youtu.be/cta1eScR0R4, now Private). v2 LIVE: https://youtu.be/HHAUkDhs8p0 (Public, 26 Nov). Keep it, never delete it.
v2 must be uploaded and linked on Devpost **before 1 Dec 2026, 3:30 AM IST** (rules section 7: no changes after the deadline).

| | |
|---|---|
| **Format / length** | Hackathon demo, target **2:52**, hard limit 3:00 |
| **Goal** | Judges. 4 equal criteria: tech (hybrid inference), design, impact, idea |
| **Avatar** | A Firebase / Chrome AI judge watching on a laptop. Knows LLMs, not dentistry. Believes "privacy tools are a regex plus a disclaimer" (A) |
| **Target emotion** | **Relief** ("the AI can help without seeing the name"), opened with a jolt of shock in the hook |
| **Voice** | Kokoro `bm_george`, speed 0.95, en-gb (same as v1). AI voice disclosed in the YouTube description |
| **One subject** | A referral letter written by a cloud model that never saw the patient's name |
| **One question** | *"How can the cloud write the letter if it never sees the name?"* |
| **Archetype / structure** | Experimenter (live demo) + problem-solver; 3 numbered steps: Hide, Write, Restore |
| **Title (YouTube)** | SafeRefer: AI writes the letter, the name never leaves the browser |
| **Thumbnail** | Keep v1 thumbnail ("Names out. Before the cloud.") |

**Word count:** ~330 words at ~140 wpm (Kokoro 0.95) = ~2:20 of speech in 2:52. Every other second is a real wait in the app with music under it. **No silence over 1.5 s** without music.

**Music:** one calm, light-tech instrumental from the YouTube Audio Library (no MusicGen), continuous from 0:00 to the end card, ducked under voice (low-pass ~2 kHz while voice plays), up ~3 dB during the offline wait and the leak-test run.

**Canvas:** 1280x720 as v1. Crop the browser chrome off every app shot: no tab title, address bar or Guest badge. Keep the yellow "Synthetic data only" banner in every frame.

---

## Storyboard

| # | Time | Beat | Picture | Voice line (= caption) | On-screen text |
|---|---|---|---|---|---|
| 1 | 0:00-0:04 | **HOOK** | Code-drawn (from `chatbot-mock.html`): the dentist note zoomed in, the red words *Meghnad Sathaye*, *00000 61234*, *Vasanti Sathaye* pulse, then fly up into a small cloud icon. Motion starts on frame 1. | Paste a patient's note into a chatbot, and the name goes with it. | **The name goes with it** (top third) |
| 2 | 0:04-0:09 | Hook, snapback | Same note. The red words flip, one by one, into teal labels `[PATIENT]` `[PHONE]` `[DATE_1]` `[RELATIVE_1]`; the cloud icon gets only the labels. | But what if the names stayed on your laptop, and the AI still wrote the letter? | **Names out. Before the cloud.** |
| 3 | 0:09-0:19 | **LOCK-IN** (proof + plan) | Card: SafeRefer logo, "Dentist · Chartered accountant · Advocate", line "Built by a practising dentist in India". Then the plan appears as 3 numbered chips: **1 Hide · 2 Write · 3 Restore**. | This is SafeRefer. A practising dentist built it for dentists, accountants and advocates, people trusted with client names every day. It works in three steps. | 1 Hide · 2 Write · 3 Restore |
| 4 | 0:19-0:27 | Loop 1 opens: HIDE | `s24` footage (cropped): Ctrl+V of the dentist note into the left panel. Chip "1 Hide" lit, top-left. | Step one: hide. I paste the note. Before anything is sent, the browser goes through it. | 1 Hide |
| 5 | 0:27-0:38 | Loop 1 mechanism | Zoom 2x into the right panel as labels fill in. Two small tags appear: "Code rules: phones, dates, IDs" and "Gemini Nano, on this laptop: names". | Code rules catch the numbers: phones, dates and IDs. Gemini Nano, running on this laptop, catches the names the rules miss. **[CHECK 1]** | Code rules → numbers · Gemini Nano (on-device) → names |
| 6 | 0:38-0:46 | Loop 1 reveal | Hold the zoom on the right panel; cursor hovers `[PATIENT]`, `[PHONE]`, `[RELATIVE_1]`. | On the right is everything the cloud will see. No name. No phone. Not even his wife's name. | What the cloud will see |
| 7 | 0:46-0:58 | Loop 2: WRITE | Approve, then Send. Spinner. Chip "2 Write" lit. Zoom on the **Cloud** badge as the letter appears. | Step two: write. I approve, and only this labelled text goes to Gemini in the cloud, through Firebase AI Logic, protected by App Check. | 2 Write · Cloud |
| 8 | 0:58-1:02 | Re-hook (open the payoff loop in the same breath) | Zoom on the letter: "Dear Colleague, Re: [PATIENT], 52 years". | But a letter full of labels is no use to anyone. So… | |
| 9 | 1:02-1:13 | **PAYOFF** | Split screen: left = letter with labels, right = the same letter with *Meghnad Sathaye* back, the name highlighted as it appears. Chip "3 Restore" lit. Status line "Names were put back in this browser" zoomed. | Step three: restore. The browser puts the real names back. The list that links each label to a name never leaves this machine. | 3 Restore · Names back. Only here. |
| 10 | 1:13-1:26 | Proof | `s5` DevTools, cropped and zoomed to ONE line: `Patient: [PATIENT], 52 years. Phone: [PHONE]…` with a highlight box. | Don't take my word for it. This is the actual request the cloud received. Patient: a label. Phone: a label. | The real request body |
| 11 | 1:26-1:31 | Loop 3 opens: OFFLINE | `s6a`: fresh note, tooth list with **On-device** badge (zoom on the badge). | Now, what happens in a clinic when the internet drops? | |
| 12 | 1:31-1:48 | Loop 3 body | `s6a` Wi-Fi off, Send, "queued" message zoomed. Then `s6b` sped up (label "Wait sped up"), then `s6c` letter arrives. Music up during the wait. | The hiding and the tooth list keep working on the device. The letter is queued, not lost. … Wi-Fi back, and it sends itself. | Offline · Queued · Back online: sent |
| 13 | 1:48-1:52 | Loop 4 opens | Profession dropdown switching Dentist → Chartered Accountant (from `s7a`). | Same engine. Three professions. | Dentist · CA · Advocate |
| 14 | 1:52-2:02 | Loop 4: CA | `s7a`, zoom on the right panel: `Rs 4,85,000` and `section 143(1)` visible (green outline), PAN and GSTIN as `[ID]` (teal). | For the accountant, PAN and GST numbers are hidden, but amounts and tax sections stay, because the work needs them. | Amount + section stay · IDs hidden |
| 15 | 2:02-2:10 | Loop 4: Advocate | `s7b`, zoom: `section 138` visible, settlement sum → `[ID_3]`. | For the advocate, the settlement sum is hidden, and section 138 stays. | Settlement sum hidden |
| 16 | 2:10-2:16 | Human-in-the-loop beat | `s7a` again, zoom on the amber "Check this: 4 underlined" and the underlined firm name *Nandini Textiles*. **[CHECK 2]** | And when it's unsure, like this firm name, it underlines it and asks you. | Unsure? It asks you. |
| 17 | 2:16-2:20 | **RE-HOOK** (honesty) | Hard cut to a plain card, one line. | But it isn't perfect. Here's exactly where it fails. | It isn't perfect |
| 18 | 2:20-2:38 | Honest numbers | `s8b1` run (sped up, 2 s), then ONE new card with two big numbers: **300 generated notes: 2 to 4% left** · **40 realistic notes: about 3 in 10 left (38 of 132)**. Delete the 8 flash clips h1a-h4b. | On three hundred generated test notes, two to four percent of identifiers slipped through. On forty realistic notes, about three in ten. That is why nothing is sent until you check it and click Approve. | 2-4% · ~3 in 10 · You approve every note |
| 19 | 2:38-2:47 | **ENDING** (close the main loop) | `architecture.html`, animated left to right: Hide (on device) → Write (cloud) → Restore (on device). | Hide on the device. Write in the cloud. Restore on the device. The letter got written, and the name never left. | The name never left. |
| 20 | 2:47-2:52 | End card / CTA | `card_end` (SafeRefer, saferefer-d5175.web.app, "Synthetic data only"). Music fades out. | Try it free in Chrome. The link is below. | saferefer-d5175.web.app |

---

## Sources for every claim
- Labels in the request body, 0 hits for name/phone/date/relative: `demo-notes.md` (live check 20 Nov) + v1 shot 5 footage.
- Code rules = numbers, Nano = names: `demo-notes.md` "IMPORTANT" section and `LEAK-RESULTS.md`.
- Firebase AI Logic + App Check enforced, Gemini cloud model: `T13-REPORT.md` (20 Nov console setup), `SUBMISSION.md`.
- Offline queue + auto-send: `runbook.md` shot 6, his Wi-Fi test 20 Nov.
- CA/advocate behaviour: `demo-notes.md` notes 2 and 3, v1 shots 7a/7b.
- 300 generated notes 2.2-3.8% ("2 to 4%"); 40 realistic 38 of 132 (28.8%, "about 3 in 10"): `SUBMISSION.md` "Honest results" and `card_tally.png`. **One run only, everywhere: 38 of 132.** Fix `s8a2.txt` (says 39 of 132) and `voiceover.md`.
- "Practising dentist": his profession. No registration number anywhere.

## Needs your check (as the builder/dentist)
- **[CHECK 1]** In your recording, which detector hid *Vasanti Sathaye*? The code-only check on 20 Nov already showed `[RELATIVE_1]`, so the line says "names the rules miss", not "the wife's name". Confirm that you are happy with that wording.
- **[CHECK 2]** At 1:54 in v1 the CA right panel shows *Nandini Textiles* still visible with an amber "Check this: 4 underlined". Confirm the underline is on the firm name. If it isn't, cut shot 16 and give its 6 s to shot 18.
- **"1 suggestion was not applied. Check by hand. Ramesh"** shows in the dentist shots (v1 0:36-0:54). Found the cause: "Ramesh" is the example name inside the Nano prompt (`app/src/core/nanoRedactor.ts:68`). Nano copied the example, and the app correctly refused it because it isn't in the note. It's harmless but confusing on camera, so every zoom in shots 5-9 stays off that strip. (Possible prompt fix later; don't change code for the video.)
- Words never said: private, safe, secure, compliant, HIPAA/GDPR/DPDP, "reviewed by". The script uses none of them.

## Production notes (for the build step)
- **No new filming is required.** Shots 1, 2, 3, 17, 18 (card), 19 = code-drawn (PIL/HTML, as `cards.py` and `architecture.html`). Everything else = existing clips in `build/` and `raw/`, cropped and zoomed.
- Optional re-record (10 min, better than zooming 720p): shot 10 DevTools with the Payload pane at 150% zoom, and shot 9 the restored letter at 125% browser zoom.
- Timeline from the voice: generate each line separately with Kokoro, ear-check it, time it, then cut each shot to its line. Captions = the spoken words, in a bar **below** the app, never over it.
- Change the picture 1-3 times per sentence (zoom in, highlight, cut). Plain hold only during the real offline wait.
- Mute test: the on-screen text column alone must tell the story. Closed-eye test: the voice alone must make sense.
- Upload: Public, English `.srt`, description = live link + "Synthetic data only. Not for real patient data." + "Voiceover: AI voice (Kokoro)". Then Devpost → Edit project → replace the video link → save. Only after that, set v1 to Unlisted (do not delete it).

## Gate audit (Step 9)
| # | Gate | v2 |
|---|---|---|
| 1 | One subject, one planted question | Pass: "how can the cloud write it without the name?" |
| 2 | Hook works on its own, one meaning | Pass |
| 3 | Picture, text and voice say the same thing in the first 3 s | Pass: names flying to the cloud = "the name goes with it" |
| 4 | Topic named in 1-2 s, value by ~12 s | Pass: topic at 0:01, the plan at 0:15, first demo at 0:19 (a judge-format demo; the hook already shows the result) |
| 5 | Lock-in confirms the hook + real proof | Pass: built by a practising dentist + the 3-step plan; hard proof in shot 10 |
| 6 | Every line needed | Pass on the draft; trim at the voice timing if over 2:55 |
| 7 | But/therefore turns | Pass: shots 2, 8, 11, 17 |
| 8 | Re-hooks every 25-30 s, no dead air | Pass: 0:58, 1:26, 1:48, 2:16; music under every wait |
| 9 | Reveal better than expected and logical | Pass: names come back locally (shot 9), proof right after |
| 10 | Hard idea said twice, simple words | Pass: Hide/Write/Restore in shots 3-9, repeated in 19 |
| 11 | Main loop closed, last line echoes the hook, one CTA | Pass: "the name never left" ↔ "the name goes with it"; one CTA |
| 12 | Every claim sourced | Pass, except [CHECK 1], [CHECK 2] |
| 13 | House rules | Pass: no reg. number, synthetic data only, no AI faces, no MusicGen, AI voice disclosed |
| 14 | Final four | Interesting: yes. Compressed: ~330 words. Hook works alone: yes. Ending emotion: relief |

---

## As built (26 Nov 2026), `final/saferefer-demo-v2.mp4`, 2:31
- Builder: `v2/build_v2.py` (voice lines in `v2/lines.py`, Kokoro bm_george 0.95, files `v2/voice/L*.wav`); captions `final/saferefer-demo-v2.srt`.
- **Shot 16 changed from the storyboard (footage check):** in the final CA frame, *Nandini Textiles* is already hidden as `[ORG]`. It was underlined only for a moment before Nano finished. The advocate take shows that moment clearly (Hemant Waghmare underlined 5.5-8.2 s, then `[PERSON_1]`). So shot 16 now plays BEFORE shot 15 and says: "For the advocate, the other party's name is underlined at first. Then Gemini Nano, on the device, hides it." Shot 15 says: "The settlement sum is hidden too, and section one thirty-eight stays."
- Shot 8 uses the real labels panel (the app shows the letter with names already restored; there is no footage of a labelled letter, so none was faked).
- Shot 12's voice is split so "Wi-Fi back, and it sends itself" lands on the letter arriving.
- Music: a calm bed synthesised in code (pad + soft arpeggio, own work), ducked under the voice. Not YouTube Audio Library, and not MusicGen.
- Checks: voice 134.6 s of 151.3 s; the only gap over 1.5 s is the 3.75 s sped-up offline wait (music + "Wait sped up" tag); loudness -16 LUFS; no voice overlaps.
