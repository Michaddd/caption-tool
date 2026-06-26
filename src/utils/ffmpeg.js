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
    const fontData = await fontResp.arrayBuffer()
    await ffmpeg.writeFile('/fonts/NotoSansHebrew.ttf', new Uint8Array(fontData))
    fontLoaded = true
  } catch (e) {
    console.warn('Could not load Hebrew font, subtitles may not render correctly:', e)
  }
}

/**
 * Extract audio from a video File as a Uint8Array (mp3).
 * @param {File} videoFile
 * @param {(msg: string) => void} onProgress
 * @returns {{ data: Uint8Array, mimeType: string }}
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

  // Clean up
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  return { data, mimeType: 'audio/mp3' }
}

/**
 * Burn subtitles into video and return a Blob.
 * @param {File} videoFile
 * @param {string} srtContent
 * @param {object} style - subtitle style options
 * @param {(progress: number) => void} onProgress - 0..1
 * @returns {Blob}
 */
export async function burnSubtitles(videoFile, srtContent, style, onProgress) {
  const ffmpeg = await getFFmpeg()
  await ensureFont(ffmpeg)

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(progress, 1))
  })

  const inputName = 'input' + getExtension(videoFile.name)
  const outputName = 'output.mp4'
  const srtName = '/subs.srt'

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile))
  await ffmpeg.writeFile(srtName, new TextEncoder().encode(srtContent))

  const forceStyle = buildForceStyle(style)

  await ffmpeg.exec([
    '-i', inputName,
    '-vf', `subtitles=${srtName}:fontsdir=/fonts:force_style='${forceStyle}'`,
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)

  // Clean up
  try { await ffmpeg.deleteFile(inputName) } catch {}
  try { await ffmpeg.deleteFile(outputName) } catch {}
  try { await ffmpeg.deleteFile(srtName) } catch {}

  ffmpeg.off('progress')

  return new Blob([data.buffer], { type: 'video/mp4' })
}

function getExtension(filename) {
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1] : '.mp4'
}

function buildForceStyle(style) {
  const {
    fontSize = 24,
    textColor = '#ffffff',
    bgColor = '#000000',
    bgOpacity = 0.5,
    bold = false,
    shadow = true,
    verticalPosition = 80,
  } = style

  const primaryColour = hexToASS(textColor, 0)
  const backColour = hexToASS(bgColor, bgOpacity)
  const borderStyle = bgOpacity > 0.01 ? 4 : 1
  const outline = shadow ? 1 : 0
  const shadowVal = shadow ? 1 : 0
  const boldVal = bold ? 1 : 0

  // Alignment: 2 = bottom center; MarginV controls distance from bottom
  // We map verticalPosition (10-90 % from top) to MarginV
  // verticalPosition 80 = near bottom, so MarginV is small
  // We convert: marginV = (100 - verticalPosition) as a percentage of height
  // In ASS/force_style we express as pixel offset from bottom (rough approximation)
  const marginV = Math.round((100 - verticalPosition) * 3)

  return [
    `FontName=NotoSansHebrew`,
    `FontSize=${fontSize}`,
    `Bold=${boldVal}`,
    `PrimaryColour=${primaryColour}`,
    `BackColour=${backColour}`,
    `BorderStyle=${borderStyle}`,
    `Outline=${outline}`,
    `Shadow=${shadowVal}`,
    `Alignment=2`,
    `MarginV=${marginV}`,
  ].join(',')
}

/**
 * Convert hex color + opacity to ASS color format: &HAABBGGRR
 * opacity 0 = fully opaque, 1 = fully transparent (ASS convention)
 */
function hexToASS(hex, opacity) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  // ASS alpha: 0x00 = opaque, 0xFF = transparent
  const alpha = Math.round((1 - opacity) * 255)
  const toHex2 = (n) => n.toString(16).padStart(2, '0').toUpperCase()
  return `&H${toHex2(alpha)}${toHex2(b)}${toHex2(g)}${toHex2(r)}`
}
