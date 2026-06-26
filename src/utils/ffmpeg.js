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
 * Burn subtitles into video.
 * Subtitles are rendered via browser Canvas (full Unicode RTL support),
 * then overlaid on the video using FFmpeg's overlay filter.
 */
export async function burnSubtitles(videoFile, segments, style, onProgress) {
  const ffmpeg = await getFFmpeg()

  ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message))
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(progress, 1))
  })

  const inputName = 'input' + getExtension(videoFile.name)
  const outputName = 'output.mp4'

  // Get actual video dimensions
  const dimensions = await getVideoDimensions(videoFile)

  // Render each subtitle as a transparent PNG using the browser's Canvas
  // (same rendering engine as the preview — full RTL/BiDi support)
  const subtitleBlobs = await renderSubtitleImages(segments, style, dimensions)

  // Write video to FFmpeg FS
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

  // Write subtitle images to FFmpeg FS
  for (let i = 0; i < subtitleBlobs.length; i++) {
    await ffmpeg.writeFile(`sub${i}.png`, new Uint8Array(await subtitleBlobs[i].arrayBuffer()))
  }

  // Build filter complex: chain overlay filters for each subtitle segment
  const filterComplex = buildOverlayFilter(segments)

  // Build input arguments: video + one input per subtitle image
  const inputArgs = ['-i', inputName]
  for (let i = 0; i < segments.length; i++) {
    inputArgs.push('-i', `sub${i}.png`)
  }

  await ffmpeg.exec([
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '0:a?',
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)

  try { await ffmpeg.deleteFile(inputName) } catch {}
  try { await ffmpeg.deleteFile(outputName) } catch {}
  for (let i = 0; i < subtitleBlobs.length; i++) {
    try { await ffmpeg.deleteFile(`sub${i}.png`) } catch {}
  }

  ffmpeg.off('log')
  ffmpeg.off('progress')

  return new Blob([data.buffer], { type: 'video/mp4' })
}

function getVideoDimensions(videoFile) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.onloadedmetadata = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      URL.revokeObjectURL(video.src)
      video.src = ''
      resolve({ width: w, height: h })
    }
    video.src = URL.createObjectURL(videoFile)
  })
}

let webFontLoaded = false

async function ensureWebFont(bold) {
  if (webFontLoaded) return
  try {
    const regularFace = new FontFace('NotoSansHebrew', 'url(/fonts/NotoSansHebrew.ttf)', { weight: '400' })
    const boldFace = new FontFace('NotoSansHebrew', 'url(/fonts/NotoSansHebrew-Bold.ttf)', { weight: '700' })
    const [r, b] = await Promise.all([regularFace.load(), boldFace.load()])
    document.fonts.add(r)
    document.fonts.add(b)
    webFontLoaded = true
  } catch (e) {
    console.warn('Could not load subtitle web font:', e)
  }
}

async function renderSubtitleImages(segments, style, { width, height }) {
  const {
    fontSize = 36,
    textColor = '#ffffff',
    bgColor = '#000000',
    bgOpacity = 0,
    bold = true,
    shadow = true,
    verticalPosition = 25,
  } = style

  await ensureWebFont(bold)

  return Promise.all(segments.map((seg) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, width, height)

    const fontSpec = `${bold ? 'bold' : 'normal'} ${fontSize}px NotoSansHebrew, Arial, sans-serif`
    ctx.font = fontSpec
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'

    const x = width / 2
    const segVertPos = seg.verticalPosition ?? verticalPosition
    const y = height * (segVertPos / 100)

    // Draw background box if visible
    if (bgOpacity > 0) {
      const metrics = ctx.measureText(seg.text)
      const textW = metrics.width
      const textH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
      const pad = { x: 10, y: 4 }
      const clean = bgColor.replace('#', '')
      const r = parseInt(clean.substring(0, 2), 16)
      const g = parseInt(clean.substring(2, 4), 16)
      const b = parseInt(clean.substring(4, 6), 16)
      ctx.fillStyle = `rgba(${r},${g},${b},${bgOpacity})`
      ctx.fillRect(
        x - textW / 2 - pad.x,
        y - metrics.actualBoundingBoxAscent - pad.y,
        textW + pad.x * 2,
        textH + pad.y * 2
      )
    }

    // Draw shadow
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.shadowBlur = 3
    }

    ctx.fillStyle = textColor
    ctx.fillText(seg.text, x, y)

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }))
}

function buildOverlayFilter(segments) {
  if (segments.length === 0) return '[0:v]copy[vout]'

  return segments.map((seg, i) => {
    const inVideo = i === 0 ? '[0:v]' : `[v${i}]`
    const inSub = `[${i + 1}:v]`
    const out = i === segments.length - 1 ? '[vout]' : `[v${i + 1}]`
    return `${inVideo}${inSub}overlay=0:0:enable='between(t,${seg.start},${seg.end})'${out}`
  }).join(';')
}

function getExtension(filename) {
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts[parts.length - 1] : '.mp4'
}
