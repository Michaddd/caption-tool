import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance = null
let loaded = false

export async function getFFmpeg() {
  if (ffmpegInstance && loaded) return ffmpegInstance

  ffmpegInstance = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  loaded = true
  return ffmpegInstance
}

let fontLoaded = false

async function ensureFont(ffmpeg) {
  if (fontLoaded) return
  try {
    const fontResp = await fetch('/fonts/NotoSansHebrew.ttf')
    if (!fontResp.ok) throw new Error(`HTTP ${fontResp.status}`)
    const fontData = await fontResp.arrayBuffer()
    await ffmpeg.createDir('/fonts')
    await ffmpeg.writeFile('/fonts/NotoSansHebrew.ttf', new Uint8Array(fontData))
    fontLoaded = true
  } catch (e) {
    console.warn('Could not load Hebrew font:', e)
  }
}

/**
 * Extract audio from a video File as a Uint8Array (mp3).
 */
export async function extractAudio(videoFile, onProgress) {
  const ffmpeg = await getFFmpeg()

  onProgress('Loading FFmpeg...')

  const inputName = 'input' + getExtension(videoFile.name)
  const outputName = 'audio.mp3'

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

  onProgress('Extracting audio...')

  await ffmpeg.exec([
    '-i', inputName,
    '-vn',
    '-acodec', 'libmp3lame',
    '-q:a', '4',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)

  try { await ffmpeg.deleteFile(inputName) } catch {}
  try { await ffmpeg.deleteFile(outputName) } catch {}

  return { data, mimeType: 'audio/mp3' }
}

/**
 * Burn subtitles into video using drawtext filter.
 * @param {File} videoFile
 * @param {Array} segments - subtitle segments with text, start, end, verticalPosition?
 * @param {object} style
 * @param {(progress: number) => void} onProgress
 * @returns {Blob}
 */
export async function burnSubtitles(videoFile, segments, style, onProgress) {
  const ffmpeg = await getFFmpeg()
  await ensureFont(ffmpeg)

  ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message))
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(progress, 1))
  })

  const inputName = 'input' + getExtension(videoFile.name)
  const outputName = 'output.mp4'

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

  const vf = buildDrawtextFilter(segments, style)

  await ffmpeg.exec([
    '-i', inputName,
    '-vf', vf,
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)

  try { await ffmpeg.deleteFile(inputName) } catch {}
  try { await ffmpeg.deleteFile(outputName) } catch {}

  ffmpeg.off('log')
  ffmpeg.off('progress')

  return new Blob([data.buffer], { type: 'video/mp4' })
}

function buildDrawtextFilter(segments, style) {
  const {
    fontSize = 18,
    textColor = '#ffffff',
    bold = true,
    shadow = true,
    verticalPosition = 25,
  } = style

  const fontFile = fontLoaded ? '/fonts/NotoSansHebrew.ttf' : ''
  const color = textColor.replace('#', '0x')
  const shadowPart = shadow ? ':shadowx=2:shadowy=2:shadowcolor=0x000000@0.8' : ''

  return segments.map((seg) => {
    const pos = (seg.verticalPosition ?? verticalPosition) / 100
    const text = escapeDrawtext(seg.text)
    const fontPart = fontFile ? `fontfile=${fontFile}:` : ''

    return (
      `drawtext=${fontPart}` +
      `text='${text}':` +
      `enable='between(t,${seg.start},${seg.end})':` +
      `x=(w-text_w)/2:` +
      `y=h*${pos.toFixed(3)}-text_h/2:` +
      `fontsize=${fontSize}:` +
      `fontcolor=${color}` +
      shadowPart
    )
  }).join(',')
}

function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\u2019") // replace apostrophe with right single quote to avoid escaping issues
    .replace(/:/g, '\\:')
    .replace(/%/g, '%%')
    .replace(/[\r\n]+/g, ' ')
    .trim()
}

function getExtension(filename) {
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1] : '.mp4'
}
