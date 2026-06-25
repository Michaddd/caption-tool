import { useEffect, useRef } from 'react'

function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`
}

export function SubtitleList({ segments, activeId, onSegmentChange }) {
  const activeRef = useRef(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeId])

  if (!segments || segments.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
        No subtitles found
      </div>
    )
  }

  return (
    <div>
      {segments.map((seg) => (
        <div
          key={seg.id}
          ref={seg.id === activeId ? activeRef : null}
          className={`subtitle-item${seg.id === activeId ? ' active' : ''}`}
        >
          <div className="subtitle-time">
            {formatTime(seg.start)} &rarr; {formatTime(seg.end)}
          </div>
          <textarea
            value={seg.text}
            rows={Math.max(1, Math.ceil(seg.text.length / 40))}
            onChange={(e) =>
              onSegmentChange(seg.id, { ...seg, text: e.target.value })
            }
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ))}
    </div>
  )
}
