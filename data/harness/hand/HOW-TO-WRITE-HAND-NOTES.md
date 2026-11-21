# Hand-written locked notes (for Dr. Yatin)

Purpose: the one test the generator cannot fake. 10 notes per profession, written by you, in your own typing style.
Rules (written before any note exists):
- These notes are a **separate locked set**. The builder (Claude) never tunes the code rules on their misses and never reads the miss list. Only totals are reported.
- Reported separately from generated notes, as "hand-written, small set (10 per profession)".
- Do NOT reuse anything from `data/fresh/` or the video notes. New names, new numbers.
- Run the app once on these notes before anything is changed. No rule changes afterwards on their account.

## Files (save in this folder, UTF-8, plain text)
`hand-dental.md`, `hand-ca.md`, `hand-law.md`: numbered 1 to 10, one note per line or short paragraph.

## What to write (same marking as data/fresh/HOW-TO-WRITE-FRESH-NOTES.md)
- Everything made up. Phones start with FIVE ZEROS (00000 55123). No real Aadhaar (start numbers with 0 or 1). PAN style ZZZZZ0000Z, GSTIN state code 27.
- Type the way you really type: lower case, nicknames, first name only, initials, Marathi/Hindi in English letters (aai, kaka, bhau, tai), short forms, typos, mixed date styles (3/11, third Nov, last Tuesday), landmark addresses.
- Mix: 6 notes with many identifiers, 2 with few, 2 with none or almost none.
- Do NOT write a note to be "hard" or "easy" for the app. Write what you would write on a busy day.
- Mark each identifier: `[[type:text exactly as written]]`.
  Types: name, relative, phone, email, date, dob, address, organization, record_id, amount (settlement sum only), id (PAN, GSTIN, case/FIR/cheque no.).
  Never mark: tooth numbers, ages, drugs, claim amounts, sections, Acts, court names, assessment years, form names.

## Examples (made up, not part of any test)
Dentist: `1. [[name:savita kolhe]] ([[phone:00000 55123]]) aali hoti with [[relative:omkar]] [[date:third nov]]. pain 47 since 4 days. RCT?`
CA: `1. [[name:R. K. Mehta]] of [[organization:Mehta Traders]], PAN [[id:ZZZZZ0000Z]], GST return pending for Q2. mobile [[phone:00000-55123]].`
Advocate: `1. Matter [[name:Sunil Gaikwad]] v/s [[name:Rekha Jagtap]], cheque no [[id:004512]], [[date:5-11-2026]] hearing. witness [[name:Bunty]] saw it.`
