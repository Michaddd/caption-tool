/**
 * Transcribe audio using Groq Whisper API.
 * @param {Uint8Array} audioData - raw audio bytes
 * @param {string} mimeType - e.g. 'audio/mp3'
 * @param {string} apiKey
 * @returns {Array<{ id: number, text: string, start: number, end: number }>}
 */
export async function transcribeAudio(audioData, mimeType, apiKey) {
  const resolvedKey = apiKey || import.meta.env.VITE_GROQ_API_KEY
  if (!resolvedKey) {
    throw new Error('Groq API key is required')
  }

  const ext = mimeType.split('/')[1] || 'mp3'
  const blob = new Blob([audioData], { type: mimeType })
  const file = new File([blob], `audio.${ext}`, { type: mimeType })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'segment')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq transcription failed: ${err}`)
  }

  const data = await response.json()

  if (!data.segments || !Array.isArray(data.segments)) {
    throw new Error('Groq did not return segments in the response.')
  }

  return data.segments.map((s, i) => ({
    id: i,
    text: s.text.trim(),
    start: Number(s.start.toFixed(3)),
    end: Number(s.end.toFixed(3)),
  }))
}
