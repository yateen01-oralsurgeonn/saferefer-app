# Idea Decision: #BuildHybridAI 2026

## 1. Pick

**Idea 2, as a standalone variant: "BillSnap".**
Photograph a medicine supplier bill; the browser reads it offline into checked stock lines, and only the lines that fail arithmetic checks go to the cloud for a second read.

Assumptions:
- Platform is Web/Chrome (Gemini Nano via Firebase AI Logic hybrid mode), built as a PWA. This targets the Best Web prize and is the fastest for Sonnet to build.
- No AushadhiOS or Kanya integration. Output is CSV/JSON export, so judges can run it freely and there is no pre-existing code to disclose.
- Printed bills only; handwriting is out of scope.

## 2. Scores (1–5)

| Criterion | 1. Marathi post-op | 2. Bill reader (as written) | **BillSnap variant** |
|---|---|---|---|
| Technological implementation | 3 | 4 | **5** |
| Design | 4 | 3 | **4** |
| Potential impact | 4 | 3 | **4** |
| Quality of idea | 3 | 4 | **4** |
| **Total** | 14 | 14 | **17** |

Why Idea 1 loses: approved templates need no AI, so the hybrid part looks bolted on. Marathi from a small on-device model is unproven, and one wrong aftercare answer is a patient-safety problem on camera.

Why the variant beats Idea 2 as written: judges can use it without a private system, and the cloud hand-off is driven by rules they can see instead of a vague "confidence" number.

## 3. The hybrid part

**On-device (Gemini Nano):** reads the bill photo into structured lines (drug, batch, expiry, quantity, MRP, GST) using a JSON schema. Works with no signal, costs nothing per bill, and the photo stays on the device.

**Plain-code checks:** quantity × rate + GST = line amount; lines sum to the bill total; expiry is a valid future date; batch is not blank.

**Cloud (Gemini via Firebase AI Logic):** receives only the cropped image of each failed line and re-reads it.

**Why both:** on-device alone leaves misread lines; cloud alone fails in a shop with weak signal and sends every supplier bill off the device. If a judge's Chrome has no Nano, the same code falls back to cloud, so the app always runs.

Also used: App Check (required), Remote Config (check thresholds, cloud model name), Firestore offline queue and anonymous Auth.

## 4. The 3-minute demo moment

1. 0:00–0:25: a chemist typing a 14-line bill by hand, with one typo in an expiry date.
2. 0:25–1:15: Wi-Fi visibly **off**. Snap the bill. Lines fill in; 12 turn green, 2 turn amber with the reason shown ("GST does not add up").
3. 1:15–1:50: Wi-Fi **on**. Only the 2 amber crops go to the cloud and turn green. A counter reads: "12 of 14 lines never left this device."
4. 1:50–2:20: the app flags a batch that expires next month. The user confirms each line and exports.
5. 2:20–3:00: architecture slide, Remote Config change shown live, repo link.

The winning moment is step 3: the hybrid hand-off is visible, counted and explained.

## 5. Top 3 risks

1. **Nano reads bill images poorly.** Test on day 1–2. If weak, run on-device OCR text first and let Nano structure the text.
2. **Layout variety.** Limit to 3–4 synthetic printed layouts and say so.
3. **Scope creep.** No integrations, no handwriting, no second platform.

**Cut-down version:** one bill layout, on-device read, checks, cloud re-read of failed lines, CSV export. Drop Firestore, Auth and Remote Config (keep App Check, which is required).

## 6. Safety and privacy line

- Synthetic data only: invented suppliers, drug lines, batch numbers and GST numbers. No real bills in the repo or video.
- No patient data anywhere in the app.
- No diagnosis, prescribing or dosing claims. The expiry flag is a stock check, not clinical advice.
- A human confirms every line before export.
- No production keys or secrets in the repo; App Check debug tokens only.
