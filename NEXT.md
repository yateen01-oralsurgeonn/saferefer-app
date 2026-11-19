# NEXT: T7 is DONE (19 Nov). Now T8 leak-test page

Read `HANDOVER.md` and `CLAUDE.md` first. **Newest branch: `t7-restore-copy`** (built on `t6-cloud-letter` > `t5-screen` > `t4-nano-redactor` > `t1-finish`; t4, t5, t6 are pushed, t7 is committed locally, nothing is merged to master).

## What T7 built
- Wording fixes (agreed with Dr. Yatin): `core/letter.ts` and PROMPTS.md section 3 now say "Put each section on its own line. Write the last section as the closing sentence only, with no label." The template's last entry is just "Thank you for seeing this patient." Real cloud letter now comes back one section per line and without "Closing line:".
- `NoteScreen.tsx`: when the letter arrives, `restoreLetter(letter, mapRef.current)` puts the names back. The right-hand side is an EDIT textarea (spellcheck off, plain text, no dangerouslySetInnerHTML). The restored letter lives in React state only.
- Warnings, rerun 300 ms after every edit: step A (`restoreLetter` on the edited text: unknown or bare token is red; patient name missing is amber) and step B (`checkFacts(letter, ORIGINAL note, lists, {skipLines: template headings, with and without a colon})`). Banner lists each warning in plain words. Code never edits the letter.
- Copy button copies the plain letter text only. It is off while any red warning is present, unless the dentist ticks "I have checked each warning"; the tick is tied to the exact set of warnings, so a new warning clears it. `not_recorded` sections are listed in grey under the letter.
- Tests: 240 pass, 14 expected fail (unchanged); tsc and build clean; one oxlint warning (set-state-in-effect, the effect that starts a run).
- ACCEPTANCE T7 run in the browser (Playwright, real cloud model, note 1): names snap back ("Re: Arvind Testwala"); typing "tooth 47" gives "Tooth 47 is not in your note" and Copy is off; the tick turns Copy on; a second new warning clears the tick; deleting the text removes the warning and Copy works; "[RELATIVE_9]" is a red unknown-token warning; no localStorage or sessionStorage keys.
- Not yet seen: the T7 screen by eye on a phone width, and with real Nano on.

## Step: T8 leak-test page
```
Read CLAUDE.md, HANDOVER.md, NEXT.md, PLAN.md row T8, SECURITY.md rows tagged T8 (A1, D3),
ACCEPTANCE.md T8, FINISH.md section 1.
Do task T8 and nothing else, on branch t8-leak-test from t7-restore-copy.

Build a leak-test page over the 30 synthetic notes in data/notes.json (each note lists its
identifiers). Open it at /?leak (DEV only, like /?setup). For each note run the SAME
redaction path the screen uses (code redactor, then Nano if ready; if Nano is not ready,
say so on the page and score code-only). Then score: an identifier "leaked" if its value
(any case) is still in the text that would be sent. Show "Identifiers leaked: X of Y" and
list every miss with the note number and the identifier type. A bad score is shown, not hidden.
Also assert, and show as pass/fail lines: zero cloud requests during the whole run (count
fetch calls), and redaction with LanguageModel undefined makes zero requests (D3, A4).
The number for the README and the video must come from this page, not the 3.2% code-only figure.
Sonnet test: scorer given one note with redaction skipped must report every identifier of that
note as leaked. Synthetic notes only. Do not change files listed in HANDOVER.md "do not change".
Commit, then rewrite NEXT.md for T9 with its prompt.
```

## If something fails
If the restored letter or the map would have to be stored anywhere to make something work, stop and tell Dr. Yatin. Never send anything that did not pass `guardedSend`.
