import { useEffect, useRef, useState } from 'react'
import { SubtitleList } from './SubtitleList.jsx'
import { StyleControls } from './StyleControls.jsx'
import { styleToCSS } from '../utils/subtitleStyle.js'
import { generateSRT } from '../utils/srt.js'
import { burnSubtitles } from '../utils/ffmpeg.js'

export function PreviewEditor({ videoFile, segments, setSegments, style, setStyle, onReset }) {
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeTab, setActiveTab] = useState('subtitles')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportError, setExportError] = useState(null)

  // Create object URL for the video file
  useEffect(() => {
    if (!videoFile) return
    const url = URL.createObjectURL(videoFile)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoFile])

  // Active subtitle based on current time
  const activeSeg = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  )

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  function handleSegmentChange(id, updated) {
    setSegments((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function handleExport() {
    setExportError(null)
    setExporting(true)
    setExportProgress(0)

    try {
      const srtContent = generateSRT(segments)
      const blob = await burnSubtitles(videoFile, srtContent, style, (p) => {
        setExportProgress(p)
      })

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'captioned-video.mp4'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const subtitleCSS = styleToCSS(style)

  return (
    <div className="preview-editor">
      {/* Left: Video preview */}
      <div className="preview-pane">
        <div className="video-wrapper">
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            controls
            onTimeUpdate={handleTimeUpdate}
            playsInline
            preload="auto"
          />
          {activeSeg && (
            <div
              className="subtitle-overlay"
              style={{ top: subtitleCSS.top, transform: subtitleCSS.transform }}
            >
              <span
                className="subtitle-text"
                dir="auto"
                style={{
                  fontSize: subtitleCSS.fontSize,
                  color: subtitleCSS.color,
                  backgroundColor: subtitleCSS.backgroundColor,
                  fontWeight: subtitleCSS.fontWeight,
                  textShadow: subtitleCSS.textShadow,
                }}
              >
                {activeSeg.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls panel */}
      <div className="right-panel">
        <div className="panel-tabs">
          <button
            className={`panel-tab${activeTab === 'subtitles' ? ' active' : ''}`}
            onClick={() => setActiveTab('subtitles')}
          >
            Subtitles ({segments.length})
          </button>
          <button
            className={`panel-tab${activeTab === 'style' ? ' active' : ''}`}
            onClick={() => setActiveTab('style')}
          >
            Style
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'subtitles' ? (
            <SubtitleList
              segments={segments}
              activeId={activeSeg?.id}
              onSegmentChange={handleSegmentChange}
            />
          ) : (
            <StyleControls style={style} onChange={setStyle} />
          )}
        </div>

        <div className="panel-footer">
          <button className="btn btn-secondary" onClick={onReset}>
            New Video
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting || segments.length === 0}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Export overlay */}
      {exporting && (
        <div className="export-overlay">
          <div className="spinner" />
          <h2>Burning subtitles...</h2>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round(exportProgress * 100)}%` }}
            />
          </div>
          <p>{Math.round(exportProgress * 100)}% complete</p>
        </div>
      )}

      {/* Export error */}
      {exportError && !exporting && (
        <div className="export-overlay" onClick={() => setExportError(null)}>
          <div className="error-box" onClick={(e) => e.stopPropagation()}>
            <p>Export failed: {exportError}</p>
            <button className="btn btn-secondary" onClick={() => setExportError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
