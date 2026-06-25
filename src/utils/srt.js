/**
 * Convert subtitle segments to SRT format string.
 * @param {Array<{ id: number, text: string, start: number, end: number }>} segments
 * @returns {string}
 */
export function generateSRT(segments) {
  return segments
    .map((seg, index) => {
      const start = secondsToSRTTime(seg.start)
      const end = secondsToSRTTime(seg.end)
      return `${index + 1}\n${start} --> ${end}\n${seg.text}`
    })
    .join('\n\n') + '\n'
}

/**
 * Convert seconds (float) to SRT timestamp format: HH:MM:SS,mmm
 */
function secondsToSRTTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':') + ',' + String(ms).padStart(3, '0')
}
