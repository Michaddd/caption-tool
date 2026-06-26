import { useEffect, useRef, useState } from 'react'

function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`
}

export function SubtitleList({ segments, activeId, defaultVerticalPosition, onSegmentChange, onSegmentSplit }) {
  const activeRef = useRef(null)
  // Track cursor position per segment id
  const [cursors, setCursors] = useState({})

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

  function handleSplit(seg) {
    const cursor = cursors[seg.id] ?? Math.floor(seg.text.length / 2)
    const textA = seg.text.slice(0, cursor).trim()
    const textB = seg.text.slice(cursor).trim()
    if (!textA || !textB) return
    const mid = seg.start + (seg.end - seg.start) / 2
    onSegmentSplit(seg.id, textA, textB, mid)
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
              onSelect={(e) =>
                setCursors((prev) => ({ ...prev, [seg.id]: e.target.selectionStart }))
              }
              onClick={(e) => e.stopPropagation()}
            />
            <div className="seg-actions-row">
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
              <button
                className="split-btn"
                title="Split at cursor position"
                onClick={() => handleSplit(seg)}
              >
                Split
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
