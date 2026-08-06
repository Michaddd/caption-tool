import { useState, useCallback } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import PageThumbnails from './components/PageThumbnails.jsx'
import PageCanvas from './components/PageCanvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import './App.css'

export default function App() {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [fileName, setFileName] = useState('')
  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(0)
  const [annotations, setAnnotations] = useState({})
  const [tool, setTool] = useState('select')
  const [mergeQueue, setMergeQueue] = useState([])

  const loadPdf = useCallback(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const pageCount = doc.getPageCount()
    setPdfDoc(doc)
    setPdfBytes(bytes)
    setFileName(file.name)
    setPages(Array.from({ length: pageCount }, (_, i) => i))
    setSelectedPage(0)
    setAnnotations({})
    setMergeQueue([])
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') loadPdf(file)
  }, [loadPdf])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0]
    if (file) loadPdf(file)
  }, [loadPdf])

  const deletePage = useCallback((pageIndex) => {
    setPages(prev => {
      const next = prev.filter((_, i) => i !== pageIndex)
      if (selectedPage >= next.length) setSelectedPage(Math.max(0, next.length - 1))
      return next
    })
  }, [selectedPage])

  const movePage = useCallback((from, to) => {
    setPages(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setSelectedPage(to)
  }, [])

  const duplicatePage = useCallback((pageIndex) => {
    setPages(prev => {
      const next = [...prev]
      next.splice(pageIndex + 1, 0, prev[pageIndex])
      return next
    })
  }, [])

  const rotatePage = useCallback((pageIndex) => {
    setAnnotations(prev => {
      const key = pages[pageIndex]
      const existing = prev[key] || { texts: [], rotation: 0 }
      return { ...prev, [key]: { ...existing, rotation: (existing.rotation || 0) + 90 } }
    })
  }, [pages])

  const addText = useCallback((pageIndex, text, x, y, size = 16, color = '#000000') => {
    const key = pages[pageIndex]
    setAnnotations(prev => {
      const existing = prev[key] || { texts: [], rotation: 0 }
      return {
        ...prev,
        [key]: {
          ...existing,
          texts: [...existing.texts, { text, x, y, size, color }],
        },
      }
    })
  }, [pages])

  const addMergeFile = useCallback(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    setMergeQueue(prev => [...prev, { name: file.name, bytes }])
  }, [])

  const removeMergeFile = useCallback((index) => {
    setMergeQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const downloadPdf = useCallback(async () => {
    if (!pdfDoc) return

    const newDoc = await PDFDocument.create()

    // Copy pages in current order
    for (const origIndex of pages) {
      const [copied] = await newDoc.copyPages(pdfDoc, [origIndex])
      const ann = annotations[origIndex]
      if (ann?.rotation) {
        const current = copied.getRotation().angle
        copied.setRotation({ type: 'degrees', angle: (current + ann.rotation) % 360 })
      }
      if (ann?.texts) {
        for (const t of ann.texts) {
          const r = parseInt(t.color.slice(1, 3), 16) / 255
          const g = parseInt(t.color.slice(3, 5), 16) / 255
          const b = parseInt(t.color.slice(5, 7), 16) / 255
          copied.drawText(t.text, {
            x: t.x,
            y: copied.getHeight() - t.y,
            size: t.size,
            color: rgb(r, g, b),
          })
        }
      }
      newDoc.addPage(copied)
    }

    // Merge queued PDFs
    for (const queued of mergeQueue) {
      const mergeDoc = await PDFDocument.load(queued.bytes)
      const mergePages = await newDoc.copyPages(mergeDoc, mergeDoc.getPageIndices())
      for (const p of mergePages) newDoc.addPage(p)
    }

    const outBytes = await newDoc.save()
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace('.pdf', '-edited.pdf')
    a.click()
    URL.revokeObjectURL(url)
  }, [pdfDoc, pages, annotations, mergeQueue, fileName])

  if (!pdfDoc) {
    return (
      <div className="landing" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <div className="landing-content">
          <h1>PDF Editor</h1>
          <p>Edit, merge, reorder, rotate, and annotate PDFs - entirely in your browser.</p>
          <p className="privacy">Your files never leave your device.</p>
          <div className="upload-zone">
            <span>Drop a PDF here or</span>
            <label className="file-btn">
              Choose File
              <input type="file" accept=".pdf" onChange={handleFileInput} hidden />
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor">
      <Toolbar
        tool={tool}
        setTool={setTool}
        onDownload={downloadPdf}
        onAddMergeFile={addMergeFile}
        mergeQueue={mergeQueue}
        onRemoveMergeFile={removeMergeFile}
        onNewFile={() => { setPdfDoc(null); setPdfBytes(null) }}
      />
      <div className="editor-body">
        <PageThumbnails
          pdfBytes={pdfBytes}
          pages={pages}
          selectedPage={selectedPage}
          onSelect={setSelectedPage}
          onDelete={deletePage}
          onMove={movePage}
          onDuplicate={duplicatePage}
          onRotate={rotatePage}
        />
        <PageCanvas
          pdfBytes={pdfBytes}
          pageIndex={pages[selectedPage]}
          rotation={annotations[pages[selectedPage]]?.rotation || 0}
          tool={tool}
          onAddText={(text, x, y, size, color) => addText(selectedPage, text, x, y, size, color)}
        />
      </div>
    </div>
  )
}
