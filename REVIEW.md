# REVIEW: outside readers for the CA and Lawyer letters (19 Nov 2026)

Dr. Yatin cannot judge a CA or legal letter himself. One practising **Chartered Accountant** reads the CA letter and one practising **advocate** reads the legal brief. Their names stay out of this repo because it goes public; Dr. Yatin has them.

## Ready to send (made 19 Nov 2026)
Two PDFs in `review/`, each 4 pages: what this is, **Sheet 1** note, **Sheet 2** what the cloud saw, **Sheet 3** the drafted letter, then the questions below with answer lines.
- `review/CA-review-packet.pdf` for the Chartered Accountant (note = `CA01` in `data/packs/ca-notes.json`)
- `review/LAW-review-packet.pdf` for the advocate (note = `LW04` plus a settlement sentence and a question for counsel)

**How to send:** attach the PDF to a WhatsApp message or email, with one line: "Could you read this and tell me if the letter is usable? 10 minutes. It is all made-up data." They can answer by replying with the question numbers.

**How the sheets were made:** the exact note was typed into the running app with the pack selected, Approve, Send, on the real cloud model (`gemini-3.5-flash-lite`). Sheet 2 is the request body captured from the browser's network call, Sheet 3 is the letter box after names were restored. The note was run 3 times per pack; run 1 is in the PDF. All 3 CA and all 3 advocate letters had every section, no tax or legal opinion, no changed number. Run-to-run difference: CA run 3 repeated the whole note under "Facts recorded" instead of summarising it. If a reviewer says "Facts recorded just repeats the note", that is a real finding, not a one-off.

**Regenerating:** if the pack text changes, run the note again in the app and rebuild the PDFs (the script is in the 19 Nov session notes, not in the repo). Never send a packet made before the last change to a pack.

## Rules
- **Synthetic only.** Reviewers see made-up notes from `data/packs/`. Never ask them to try it with a real client file, and do not accept one if they offer.
- **Send three things, one page each:** (1) the original synthetic note, (2) the anonymous text that went to the cloud, (3) the final letter with names restored.
- **Timing:** CA pack after P2 (Sat 21 Nov), legal pack after P3 (Sun 22 Nov). Send by Mon 23, answers by Wed 25, video on Fri 27.
- **Quoting:** ask before naming them in the video or README. Default line: "Reviewed by a practising CA and a practising advocate."
- Their answers go in `## Results` below. A "not usable" answer means the pack fixes it or the pack is hidden behind `?packs` (PACKS.md decision 5).

## Questions for the CA (case summary for a specialist CA)
1. Could you send this letter to a GST or income-tax specialist as it is? **Usable / usable with small edits / not usable.**
2. Compare it with the original note. Is any fact wrong, changed or added (amount, assessment year, date, form, section)?
3. Does the letter give a tax opinion or advice anywhere? Point to the line.
4. Is anything missing that a specialist would ask for first?
5. Is any section, form or tax term used wrongly?
6. Look at the anonymous text (sheet 2). Could you tell who the client is from what is left, for example a business type plus a town?
7. Would you use a tool like this for your own client files? One line on why or why not.

## Questions for the advocate (brief to senior counsel)
1. Could you send this brief to senior counsel as it is? **Usable / usable with small edits / not usable.**
2. Compare it with the original note. Is any fact wrong, changed or added (date, amount, court, stage, section)?
3. **Are the right names in the right roles?** Petitioner, respondent, accused and witness must not be swapped.
4. Is the question for counsel stated clearly?
5. Does the brief give a legal opinion anywhere? Point to the line.
6. Is any Act, section, court name or hearing stage used wrongly?
7. Look at the anonymous text (sheet 2). Could you tell who the parties are from what is left?
8. Would you use a tool like this in your own practice? One line on why or why not.

## Results
**20 Nov 2026: two sets of written answers arrived by WhatsApp (one for the CA sheet, one for the advocate sheet). They are NOT counted as a professional review.** They read like an AI chat assistant's output, not a practising CA's or advocate's: identical structure, "Usable with small edits" for both with the same sentence, "Follow-up questions could include...", a footnote marker, and generic points ("minor adjustments might be needed to fit specific specialist requirements", "details about the nature of the demand ... could be crucial"). Two earlier replies from the same source said "I don't see a SafeRefer sheet attached in this chat". What the answers say, for the record: usable with small edits; no fact wrong or added; no tax or legal opinion; roles correct; the sheet-2 text does not identify the client or parties; would use the tool.
**What the README may say:** "reviewed by the builder only" unless a named, real professional confirms in their own words. Do not write "reviewed by a practising CA / advocate" on the strength of these answers. To get a real review: send the PDFs to the person directly (not through an assistant) and ask for answers in their own words, two lines each.
