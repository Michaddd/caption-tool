import { useEffect, useRef, useState } from 'react'

function formatTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ms}`
}

function parseTime(str) {
  const match = str.trim().match(/^(\d+):(\d{2})(?:\.(\d))?$/)
  if (!match) return null
  const m = parseInt(match[1], 10)
  const sec = parseInt(match[2], 10)
  const d = match[3] ? parseInt(match[3], 10) : 0
  return m * 60 + sec + d / 10
}

export function SubtitleList({ segments, activeId, defaultVerticalPosition, onSegmentChange, onSegmentSplit, onSegmentDelete }) {
  const activeRef = useRef(null)
  const [cursors, setCursors] = useState({})
  const [timeEdits, setTimeEdits] = useState({})

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
              <input
                className="time-input"
                value={timeEdits[seg.id]?.start ?? formatTime(seg.start)}
                onChange={(e) =>
                  setTimeEdits((prev) => ({
                    ...prev,
                    [seg.id]: { ...prev[seg.id], start: e.target.value },
                  }))
                }
                onBlur={(e) => {
                  const val = parseTime(e.target.value)
                  if (val !== null && val < seg.end) {
                    onSegmentChange(seg.id, { ...seg, start: val })
                  }
                  setTimeEdits((prev) => {
                    const next = { ...prev }
                    if (next[seg.id]) {
                      const { start: _, ...rest } = next[seg.id]
                      next[seg.id] = rest
                    }
                    return next
                  })
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="time-arrow">&rarr;</span>
              <input
                className="time-input"
                value={timeEdits[seg.id]?.end ?? formatTime(seg.end)}
                onChange={(e) =>
                  setTimeEdits((prev) => ({
                    ...prev,
                    [seg.id]: { ...prev[seg.id], end: e.target.value },
                  }))
                }
                onBlur={(e) => {
                  const val = parseTime(e.target.value)
                  if (val !== null && val > seg.start) {
                    onSegmentChange(seg.id, { ...seg, end: val })
                  }
                  setTimeEdits((prev) => {
                    const next = { ...prev }
                    if (next[seg.id]) {
                      const { end: _, ...rest } = next[seg.id]
                      next[seg.id] = rest
                    }
                    return next
                  })
                }}
                onClick={(e) => e.stopPropagation()}
              />
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
              <button
                className="delete-btn"
                title="Delete caption"
                onClick={() => onSegmentDelete(seg.id)}
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
