import { useState } from 'react'
import { ApiKeyModal, getStoredApiKey } from './components/ApiKeyModal.jsx'
import { UploadZone } from './components/UploadZone.jsx'
import { ProcessingScreen } from './components/ProcessingScreen.jsx'
import { PreviewEditor } from './components/PreviewEditor.jsx'
import { extractAudio } from './utils/ffmpeg.js'
import { transcribeAudio } from './utils/gemini.js'

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
  const [showApiModal, setShowApiModal] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [segments, setSegments] = useState([])
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingError, setProcessingError] = useState(null)

  function handleApiKeySave(key) {
    // key is saved to localStorage in the modal — nothing else needed here
  }

  async function handleFileSelected(file) {
    const apiKey = getStoredApiKey()
    if (!apiKey) {
      // Prompt for key first, then re-trigger after save
      setVideoFile(file)
      setShowApiModal(true)
      return
    }
    await processVideo(file, apiKey)
  }

  async function processVideo(file, apiKey) {
    setVideoFile(file)
    setStep(STEPS.PROCESSING)
    setProcessingError(null)
    setProcessingStatus('Initializing...')

    try {
      // Step 1: extract audio
      setProcessingStatus('Extracting audio...')
      const { data: audioData, mimeType } = await extractAudio(
        file,
        (msg) => setProcessingStatus(msg)
      )

      // Step 2: transcribe
      setProcessingStatus('Transcribing with Gemini...')
      const segs = await transcribeAudio(audioData, mimeType, apiKey)

      setSegments(segs)
      setStep(STEPS.EDITOR)
    } catch (err) {
      console.error(err)
      setProcessingError(err.message || 'Something went wrong')
    }
  }

  function handleRetry() {
    if (videoFile) {
      const apiKey = getStoredApiKey()
      if (!apiKey) {
        setShowApiModal(true)
        return
      }
      processVideo(videoFile, apiKey)
    }
  }

  function handleReset() {
    setStep(STEPS.UPLOAD)
    setVideoFile(null)
    setSegments([])
    setProcessingError(null)
    setProcessingStatus('')
    setStyle(DEFAULT_STYLE)
  }

  // Called when user saves API key from the "no key" prompt during upload
  function handleApiKeySaveFromUpload(key) {
    handleApiKeySave(key)
    if (videoFile) {
      processVideo(videoFile, key)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Caption Tool</h1>
        <button className="icon-btn" onClick={() => setShowApiModal(true)}>
          ⚙ API Key
        </button>
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

      {showApiModal && (
        <ApiKeyModal
          onClose={() => setShowApiModal(false)}
          onSave={
            step === STEPS.UPLOAD && videoFile
              ? handleApiKeySaveFromUpload
              : handleApiKeySave
          }
        />
      )}
    </div>
  )
}
