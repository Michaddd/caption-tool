import { useState } from 'react'

const STORAGE_KEY = 'gemini_api_key'

export function ApiKeyModal({ onClose, onSave }) {
  const [key, setKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [show, setShow] = useState(false)

  function handleSave() {
    const trimmed = key.trim()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    onSave(trimmed)
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Gemini API Key</h2>
        <p>
          Your key is stored locally in your browser (localStorage) and never
          sent anywhere except directly to Google's Gemini API.
        </p>

        <div className="form-group">
          <label>API Key</label>
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="AIza..."
            autoFocus
          />
        </div>

        <div className="form-group">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex' }}>
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            Show key
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!key.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export function getStoredApiKey() {
  return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || ''
}
