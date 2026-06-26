import { useState } from 'react'
import { UploadZone } from './components/UploadZone.jsx'
import { ProcessingScreen } from './components/ProcessingScreen.jsx'
import { PreviewEditor } from './components/PreviewEditor.jsx'
import { extractAudio } from './utils/ffmpeg.js'
import { transcribeAudio } from './utils/transcribe.js'

const STEPS = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  EDITOR: 'editor',
}

const DEFAULT_STYLE = {
  fontSize: 24,
  textColor: '#ffffff',
  bgColor: '#000000',
  bgOpacity: 0.5,
  bold: false,
  shadow: true,
  verticalPosition: 80,
}

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [videoFile, setVideoFile] = useState(null)
  const [segments, setSegments] = useState([])
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingError, setProcessingError] = useState(null)

  async function handleFileSelected(file) {
    await processVideo(file)
  }

  async function processVideo(file) {
    setVideoFile(file)
    setStep(STEPS.PROCESSING)
    setProcessingError(null)
    setProcessingStatus('Initializing...')

    try {
      setProcessingStatus('Extracting audio...')
      const { data: audioData, mimeType } = await extractAudio(
        file,
        (msg) => setProcessingStatus(msg)
      )

      setProcessingStatus('Transcribing and translating to Hebrew...')
      const segs = await transcribeAudio(audioData, mimeType, null)

      setSegments(segs)
      setStep(STEPS.EDITOR)
    } catch (err) {
      console.error(err)
      setProcessingError(err.message || 'Something went wrong')
    }
  }

  function handleRetry() {
    if (videoFile) processVideo(videoFile)
  }

  function handleReset() {
    setStep(STEPS.UPLOAD)
    setVideoFile(null)
    setSegments([])
    setProcessingError(null)
    setProcessingStatus('')
    setStyle(DEFAULT_STYLE)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Caption Tool</h1>
      </header>

      {step === STEPS.UPLOAD && (
        <UploadZone onFileSelected={handleFileSelected} />
      )}

      {step === STEPS.PROCESSING && (
        <ProcessingScreen
          status={processingStatus}
          error={processingError}
          onRetry={handleRetry}
          onBack={handleReset}
        />
      )}

      {step === STEPS.EDITOR && (
        <PreviewEditor
          videoFile={videoFile}
          segments={segments}
          setSegments={setSegments}
          style={style}
          setStyle={setStyle}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
