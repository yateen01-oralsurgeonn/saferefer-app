# Pre-flight checklist (tick every box before pressing record)

## A. Browser (your own Chrome, new profile)
- [ ] New Chrome profile ("Guest" works) so no extensions, bookmarks, history or notifications appear.
- [ ] Window exactly **1280 x 720** (DevTools device mode or a window-resize tool), zoom **100%**.
- [ ] Bookmarks bar hidden (Ctrl+Shift+B), no extension icons showing, tab bar has only the tabs you need.
- [ ] **Do Not Disturb on** (Windows Focus), WhatsApp, Teams, Outlook and Telegram closed or muted, Windows notifications off.
- [ ] Nano is on: on the app tab, DevTools console: `await LanguageModel.availability()` returns `'available'` (run it ON the app tab, not on a chrome:// page).
- [ ] Hosted app opened once online and reloaded (the service worker now holds the shell for the Wi-Fi shot).
- [ ] DevTools docked to the right, **Network** tab, filter `generateContent`, **Preserve log** ticked, list cleared. The `Authorization`/`?key=` parts will not be shown on camera.

## B. Notes (the important test)
- [ ] Paste **each of the three notes** from `demo-notes.md` in this Chrome with Nano on and read the right panel. **Every name, phone, date, ID and relative must show as a label.**
- [ ] If the CA firm name (`Nandini Textiles`) or the other party (`Hemant Waghmare`) is still visible: select it and click **Hide selected words** (do this on camera if it happens, it is real behaviour). Do not change the notes.
- [ ] On the dentist note the tooth list shows the **On-device** badge (not Cloud, not Rules only).
- [ ] One full online run works: letter with the Cloud badge (the live site was checked by script on 21 Nov, after App Check enforcement and the key restriction).

## C. The Wi-Fi shot
- [ ] You know where the Wi-Fi switch is (laptop key, Windows quick settings, or airplane mode). Practice off/on once.
- [ ] Practice run: page loaded, note pasted, tooth list On-device, Wi-Fi off, Approve + Send shows "You are offline. The letter is queued and will be sent when you are back online.", Wi-Fi on, letter arrives within 20 s without clicking anything.
- [ ] Dev server is **not** the page shown in this shot (hosted URL only).

## D. The leak-test shot
- [ ] From `BuildHybridAI\app`: `npm run dev` (port 5199; if the page looks stale after any edit, stop it, restart it).
- [ ] `http://localhost:5199/?leak&pack=law&set=fresh`, click run once **off camera**, note the time it takes. Expected with Nano: advocate **0 of 69**, dentist **1 of 46**, CA **2 of 56** (`LEAK-RESULTS.md`). If your numbers differ, the voiceover line 8 and `LEAK-RESULTS.md` change **before** recording.
- [ ] Every request in the zero-request checks says PASS.

## E. Recording
- [ ] Screen recorder: 1280 x 720 region (or full screen scaled to it), 30 fps, mouse pointer on, **system audio off** (no beeps).
- [ ] Microphone: 10 s test, speak line 1 and play it back; no keyboard noise, no fan; room quiet.
- [ ] Voice recorded in one go per shot, with 2 s of silence before and after each line (easy to trim).
- [ ] Record the voice line for shot 8 **last**, after the final numbers are in README, SUBMISSION and LEAK-RESULTS.
- [ ] The repo is **public** before the architecture shot (the diagram and the description link to it).

## F. After recording
- [ ] Total length under 3:00 (aim 2:50).
- [ ] Look at every frame of shots 5 and 6: nothing real, no pop-up, no token.
- [ ] Upload: **Public**, English, `subtitles.srt` attached, description with repo link and live-app link, Incognito check of the link.
