import { useRef, useState } from 'react'

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/avi']

export function UploadZone({ onFileSelected }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file) return
    onFileSelected(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
  }

  function handleClick() {
    inputRef.current?.click()
  }

  return (
    <div
      className={`upload-zone${dragging ? ' drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleInputChange}
      />

      <div className="upload-icon">🎬</div>
      <h2>Drop your video here</h2>
      <p>or click to browse</p>
      <p className="formats">MP4, MOV, WebM, MKV, AVI</p>
    </div>
  )
}
