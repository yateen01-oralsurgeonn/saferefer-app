// The tooth-line adapter (T9): the ONLY place that calls a model for tooth lines.
// Mode PREFER_ON_DEVICE: Gemini Nano first, the cloud model if Nano is not there. Same prompt and schema for both.
// It is called only by listTeeth(), which passes ONLY the approved anonymous text, through guardedSend (SECURITY A3).
// It never logs. SDK errors become a kind only; their text is thrown away (SECURITY A8).
import { getGenerativeModel, InferenceMode, InferenceSource, Schema, type AI } from 'firebase/ai'
import { TOOTH_CODES, type ToothModelFn } from './core'
import { mapLetterError } from './letterAdapter'

export interface ToothSdk {
  getGenerativeModel: typeof getGenerativeModel
}

const cloudSchema = Schema.object({
  properties: {
    teeth: Schema.array({
      items: Schema.object({
        properties: {
          tooth: Schema.enumString({ enum: [...TOOTH_CODES] }),
          finding: Schema.string(),
        },
      }),
    }),
    unnumbered: Schema.array({ items: Schema.string() }),
  },
})

/** Build the model function for listTeeth(). `ai` and `model` come from firebase.ts. */
export function createToothModelFn(ai: AI, model: string, sdk: ToothSdk = { getGenerativeModel }): ToothModelFn {
  return async (prompt, schema, signal) => {
    try {
      const m = sdk.getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_ON_DEVICE,
        onDeviceParams: {
          createOptions: {
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
          },
          promptOptions: { responseConstraint: schema as never },
        },
        inCloudParams: {
          model,
          generationConfig: { responseMimeType: 'application/json', responseSchema: cloudSchema },
        },
      })
      const result = await m.generateContent(prompt, { signal })
      const source = result.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'cloud'
      return { text: result.response.text(), source }
    } catch (e) {
      throw mapLetterError(e)
    }
  }
}
