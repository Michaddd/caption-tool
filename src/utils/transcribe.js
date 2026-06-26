/**
 * Transcribe audio using Groq Whisper, then translate segments to Hebrew.
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

  const segments = data.segments.map((s, i) => ({
    id: i,
    text: s.text.trim(),
    start: Number(s.start.toFixed(3)),
    end: Number(s.end.toFixed(3)),
  }))

  // If already Hebrew, skip translation
  if (data.language === 'he') {
    return segments
  }

  return translateSegmentsToHebrew(segments, resolvedKey)
}

async function translateSegmentsToHebrew(segments, apiKey) {
  const texts = segments.map((s) => s.text)
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a translator. Translate the numbered list of subtitle segments to Hebrew. ' +
            'Return ONLY the translated numbered list in the same format (1. text, 2. text, etc). ' +
            'No explanations, no extra text.',
        },
        {
          role: 'user',
          content: numbered,
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq translation failed: ${err}`)
  }

  const data = await response.json()
  const raw = data.choices[0].message.content.trim()

  // Parse "1. text\n2. text\n..." back into array
  const lines = raw.split('\n').filter((l) => /^\d+\./.test(l.trim()))
  const translated = lines.map((l) => l.replace(/^\d+\.\s*/, '').trim())

  return segments.map((s, i) => ({
    ...s,
    text: translated[i] ?? s.text,
  }))
}
