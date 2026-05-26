import { GoogleGenerativeAI } from '@google/generative-ai'
import { stickmanSceneImageRequest } from '@/shared/lib/prompts/stickman-scene-image'
import { env } from '@/shared/lib/env'

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY ?? '')

const IMAGE_MODEL = 'gemini-2.5-flash-image'

export async function generateSceneImage(prompt: string): Promise<{ mimeType: string; data: Buffer }> {
  const model = genAI.getGenerativeModel({ model: IMAGE_MODEL })

  const fullPrompt = stickmanSceneImageRequest(prompt)

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ],
  })

  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    const inline = (part as { inlineData?: { mimeType?: string; data?: string } }).inlineData
    if (inline?.data) {
      return {
        mimeType: inline.mimeType || 'image/png',
        data: Buffer.from(inline.data, 'base64'),
      }
    }
  }

  throw new Error('Image model returned no image data')
}
