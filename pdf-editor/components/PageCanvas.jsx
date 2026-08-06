import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export default function PageCanvas({ pdfBytes, pageIndex, rotation, tool, onAddText }) {
  const canvasRef = useRef(null)
  const [showTextDialog, setShowTextDialog] = useState(false)
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 })
  const [textValue, setTextValue] = useState('')
  const [fontSize, setFontSize] = useState(16)
  const [fontColor, setFontColor] = useState('#000000')
  const scaleRef = useRef(1)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise
      const page = await doc.getPage(pageIndex + 1)
      const baseViewport = page.getViewport({ scale: 1, rotation })
      const container = canvasRef.current?.parentElement
      if (!container || cancelled) return

      const maxW = container.clientWidth - 40
      const maxH = container.clientHeight - 40
      const scale = Math.min(maxW / baseViewport.width, maxH / baseViewport.height, 2)
      scaleRef.current = scale

      const viewport = page.getViewport({ scale, rotation })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
    }
    render()
    return () => { cancelled = true }
  }, [pdfBytes, pageIndex, rotation])

  const handleCanvasClick = (e) => {
    if (tool !== 'text') return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scaleRef.current
    const y = (e.clientY - rect.top) / scaleRef.current
    setClickPos({ x, y })
    setTextValue('')
    setShowTextDialog(true)
  }

  const confirmText = () => {
    if (textValue.trim()) {
      onAddText(textValue, clickPos.x, clickPos.y, fontSize, fontColor)
    }
    setShowTextDialog(false)
  }

  return (
    <div className={`canvas-area ${tool}`}>
      <canvas ref={canvasRef} onClick={handleCanvasClick} />

      {showTextDialog && (
        <>
          <div className="overlay" onClick={() => setShowTextDialog(false)} />
          <div className="text-dialog">
            <h3>Add Text</h3>
            <textarea
              autoFocus
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              placeholder="Enter text..."
            />
            <div className="row">
              <label>
                Size
                <input type="number" min="8" max="72" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              </label>
              <label>
                Color
                <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <button className="cancel" onClick={() => setShowTextDialog(false)}>Cancel</button>
              <button className="confirm" onClick={confirmText}>Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
