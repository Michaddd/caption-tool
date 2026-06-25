import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Transcribe audio using Gemini 1.5 Flash.
 * @param {Uint8Array} audioData - raw audio bytes
 * @param {string} mimeType - e.g. 'audio/mp3'
 * @param {string} apiKey
 * @returns {Array<{ text: string, start: number, end: number }>}
 */
export async function transcribeAudio(audioData, mimeType, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API key is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Convert Uint8Array to base64
  const base64Audio = uint8ArrayToBase64(audioData)

  const prompt =
    'Transcribe this audio. Return ONLY a JSON array of subtitle segments, ' +
    'each with: text (string), start (number, seconds), end (number, seconds). ' +
    'No markdown, no explanation, just the JSON array.'

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
    prompt,
  ])

  const response = await result.response
  const text = response.text().trim()

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let segments
  try {
    segments = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(
      'Failed to parse Gemini response as JSON. Response was:\n' + text
    )
  }

  if (!Array.isArray(segments)) {
    throw new Error('Gemini did not return a JSON array of segments.')
  }

  // Validate and normalize
  return segments
    .filter((s) => s && typeof s.text === 'string' && typeof s.start === 'number')
    .map((s, i) => ({
      id: i,
      text: s.text.trim(),
      start: Number(s.start.toFixed(3)),
      end: Number((s.end ?? s.start + 2).toFixed(3)),
    }))
}

function uint8ArrayToBase64(uint8Array) {
  let binary = ''
  const chunkSize = 0x8000 // 32KB chunks to avoid call stack overflow
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}
