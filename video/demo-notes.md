# Demo notes for the video (made up, one per profession)

Rules followed: not taken from `data/` or the tests; no name here exists anywhere else in the repo (checked with `git grep`, 0 hits); every phone starts `00000`; the PAN and GSTIN are obvious placeholders (`AAAAA0000A`), never real numbers. Paste each note exactly as written, one line.

## 1. Dentist (shots 2 to 6)
```
Patient: Meghnad Sathaye, 52 years. Phone: 00000 61234. Seen on 14/11/2026. His wife Vasanti Sathaye came with him. Referred for endodontic retreatment of tooth 46: dull ache on biting for two weeks, root filling done elsewhere. Tender to percussion. IOPA attached. Please evaluate and manage.
```
Why this note: it has a name, a phone, a date and a **relative** (the voiceover says "no relative"), plus a tooth number so the tooth list and the On-device badge show.

Checked on the live site, code only (no Nano): `Patient: [PATIENT], 52 years. Phone: [PHONE]. Seen on [DATE_1]. His wife [RELATIVE_1] came with him. ...`; the name, phone, date and relative were found in 0 request bodies; letter written with the Cloud badge.

## 2. Chartered Accountant (shot 7a)
```
Client: Ratnakar Bhide, proprietor of Nandini Textiles. PAN: AAAAA0000A. GSTIN: 27AAAAA0000A1Z5. Phone: 00000 72345. Notice under section 143(1) for AY 2025-26 shows a mismatch of Rs 4,85,000 in turnover. Response due 30/11/2026. Please review the working and prepare a summary.
```
Expected: `[PATIENT]`, the firm name hidden, `[ID]` x2, `[PHONE]`, `[DATE_1]`. **The amount `Rs 4,85,000` and `section 143(1)` stay visible** (that is the point of the shot).

## 3. Advocate (shot 7b)
```
Client: Ketaki Lokhande. Phone: 00000 83456. Complaint filed against Hemant Waghmare under section 138 of the Negotiable Instruments Act, cheque no. 000123, Rs 6,50,000. Case no. SCC 123/2026 pending before the court at Pune. Next hearing on 05/12/2026. Settlement discussed at Rs 5,00,000. Please summarise the position for the senior.
```
Expected: client, the other party, the phone, the cheque number, the case number, the hearing date and the **settlement sum** hidden; `section 138` and the claim `Rs 6,50,000` stay visible.

## IMPORTANT: these two need Gemini Nano on
Checked on 21 Nov with code only (headless browser, no Nano): the **firm name `Nandini Textiles` (CA) and the other party `Hemant Waghmare` (advocate) were NOT hidden**, even with labels. Everything else was. This is the known split in `LEAK-RESULTS.md`: code finds structured identifiers, Nano finds names. So:

1. In the pre-flight, paste all three notes in your Chrome with Nano on and read the right panel. **Every name must show as a label.**
2. If a name is still visible on camera: select it and click **Hide selected words** (it is a real feature, and it shows the human-in-the-loop). Do not edit the note to make the problem go away.
3. Never record the CA or advocate shot in a browser without Nano.

## What the voiceover must not say
Not "private", "safe", "compliant", "reviewed by a CA/advocate" (the two review answers were not from named professionals; README says "reviewed by the builder only").
