# Idea Decision v2: #BuildHybridAI 2026 (dental)

## 1. Pick

**"SafeRefer": a referral-letter writer where the patient's identity never leaves the dentist's browser.**
The dentist types a clinical note. Chrome's on-device model strips every identifier, the cloud drafts the letter from the anonymous note, and the browser puts the names back locally.

Assumptions: Web/Chrome PWA (Best Web prize); typed English notes; new code only, no Enamel code reused.

## 2. The four ideas, scored 1–5

| Idea | Tech | Design | Impact | Idea quality | Total | Filters |
|---|---|---|---|---|---|---|
| **A. SafeRefer** (redact on-device, draft in cloud) | 5 | 4 | 4 | 5 | **18** | Pass |
| B. ChartScribe (typed shorthand to FDI tooth chart) | 3 | 4 | 3 | 3 | 13 | Weak: cloud is only a spare, not essential |
| C. CaseVault (sorts clinical photos on-device, flags faces, cloud writes a teaching caption) | 4 | 4 | 3 | 4 | 15 | Risky: on-device photo reading is unproven |
| D. PlanExplain (turns a treatment plan into a patient hand-out) | 3 | 4 | 4 | 3 | 14 | **Rejected**: patient-facing treatment text |

## 3. The hybrid split

**Must run on-device (Gemini Nano plus plain code):**
- Replace identifiers with tokens (`[PATIENT]`, `[PHONE]`, `[RELATIVE_1]`). Header fields are matched exactly in code; Nano catches free-text leaks such as a relative's name, employer or address.
- Hold the token-to-name map, and restore names in the final letter.
- Why: if this step ran in the cloud, the identity would already have left.

**Needs the cloud (Gemini via Firebase AI Logic):**
- Draft the full referral letter from the anonymous note. Why: long, formal, well-ordered writing is beyond the small model.

**On-device first, cloud fallback (the rule's pattern):** structuring the already-anonymous note into FDI tooth lines.

**Privacy lock:** redaction never falls back to cloud. With no Nano, the dentist must approve the redaction preview by hand before anything is sent.

Also: App Check, Remote Config (letter templates, model name), Firestore offline queue, anonymous Auth.

## 4. The 3-minute demo moment

1. 0:00–0:20: the problem: dentists paste patient notes into chatbots.
2. 0:20–1:10: type a synthetic note ("Asha Patil, husband Ramesh, 36 deep caries…"). Split screen: left "what you see", right **"what the cloud sees"**, with every name already a token.
3. 1:10–1:50: the letter arrives and names snap back in. Chrome's network panel shows the request: no name, no phone.
4. 1:50–2:25: Wi-Fi off. Redaction and the tooth chart still work; the letter queues.
5. 2:25–3:00: leak-test score on 30 synthetic notes, architecture, repo.

The winning moment is step 2: privacy made visible.

## 5. Top 3 risks

1. **Nano misses an identifier.** Exact-match header fields, patterns for phones and dates, dentist preview before sending, and a published leak-test score.
2. **A judge's Chrome has no Nano.** Privacy lock keeps it usable; the video shows the on-device path.
3. **Looks like "just a letter writer".** Lead with the "what the cloud sees" panel.

**Cut-down version:** one letter type (endodontist referral), redaction, cloud draft, restore. Drop the tooth chart, Firestore and Remote Config.

**After the hackathon:** the redaction layer becomes Enamel's gateway for any cloud AI feature, and "how I keep patient names off the cloud" is channel content.

## 6. Safety and privacy line

- Synthetic patients only, labelled as such. No real records in the repo or video.
- Nothing is addressed to patients. No diagnosis or treatment advice.
- The letter contains only what the dentist wrote. A code check blocks any tooth number or treatment absent from the note, and keeps the dentist's own order of options, conservative option first when recorded.
- The dentist reviews, edits and signs every letter.
- No claim of legal compliance; no production keys in the repo.
