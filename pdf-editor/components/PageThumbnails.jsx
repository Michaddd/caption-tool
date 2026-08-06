import { useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export default function PageThumbnails({ pdfBytes, pages, selectedPage, onSelect, onDelete, onMove, onDuplicate, onRotate }) {
  return (
    <div className="thumbnails">
      {pages.map((origIndex, i) => (
        <ThumbItem
          key={`${origIndex}-${i}`}
          pdfBytes={pdfBytes}
          pageNum={origIndex + 1}
          label={`Page ${i + 1}`}
          selected={i === selectedPage}
          onClick={() => onSelect(i)}
          onDelete={pages.length > 1 ? () => onDelete(i) : null}
          onDuplicate={() => onDuplicate(i)}
          onRotate={() => onRotate(i)}
          onMoveUp={i > 0 ? () => onMove(i, i - 1) : null}
          onMoveDown={i < pages.length - 1 ? () => onMove(i, i + 1) : null}
        />
      ))}
    </div>
  )
}

function ThumbItem({ pdfBytes, pageNum, label, selected, onClick, onDelete, onDuplicate, onRotate, onMoveUp, onMoveDown }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 0.3 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
    }
    render()
    return () => { cancelled = true }
  }, [pdfBytes, pageNum])

  return (
    <div className={`thumb-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="thumb-actions">
        {onDelete && <button onClick={e => { e.stopPropagation(); onDelete() }} title="Delete">Del</button>}
        <button onClick={e => { e.stopPropagation(); onDuplicate() }} title="Duplicate">Dup</button>
        <button onClick={e => { e.stopPropagation(); onRotate() }} title="Rotate">Rot</button>
      </div>
      <canvas ref={canvasRef} />
      <div className="thumb-label">{label}</div>
      <div className="thumb-move">
        <button disabled={!onMoveUp} onClick={e => { e.stopPropagation(); onMoveUp?.() }}>&uarr;</button>
        <button disabled={!onMoveDown} onClick={e => { e.stopPropagation(); onMoveDown?.() }}>&darr;</button>
      </div>
    </div>
  )
}
