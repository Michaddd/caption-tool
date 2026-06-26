import { useEffect, useRef } from 'react'

function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`
}

export function SubtitleList({ segments, activeId, defaultVerticalPosition, onSegmentChange }) {
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
      {segments.map((seg) => {
        const hasCustomPos = seg.verticalPosition !== undefined
        const pos = hasCustomPos ? seg.verticalPosition : defaultVerticalPosition

        return (
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
            <div className="seg-position-row">
              <label>Position</label>
              <input
                type="range"
                min={5}
                max={95}
                value={pos}
                onChange={(e) =>
                  onSegmentChange(seg.id, { ...seg, verticalPosition: Number(e.target.value) })
                }
              />
              <span className="value-label">{pos}%</span>
              {hasCustomPos && (
                <button
                  className="reset-pos-btn"
                  title="Reset to default"
                  onClick={() => {
                    const { verticalPosition: _, ...rest } = seg
                    onSegmentChange(seg.id, rest)
                  }}
                >
                  ↺
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
