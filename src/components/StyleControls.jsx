export function StyleControls({ style, onChange }) {
  const {
    fontSize,
    textColor,
    bgColor,
    bgOpacity,
    bold,
    shadow,
    verticalPosition,
  } = style

  function set(key, value) {
    onChange({ ...style, [key]: value })
  }

  return (
    <div>
      <div className="style-section">
        <h3>Text</h3>

        <div className="style-row">
          <label>Font size</label>
          <input
            type="range"
            min={16}
            max={64}
            value={fontSize}
            onChange={(e) => set('fontSize', Number(e.target.value))}
          />
          <span className="value-label">{fontSize}px</span>
        </div>

        <div className="style-row">
          <label>Color</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => set('textColor', e.target.value)}
          />
        </div>

        <div className="style-row">
          <label>Bold</label>
          <button
            className={`toggle-btn${bold ? ' on' : ''}`}
            onClick={() => set('bold', !bold)}
          >
            {bold ? 'On' : 'Off'}
          </button>
        </div>

        <div className="style-row">
          <label>Shadow</label>
          <button
            className={`toggle-btn${shadow ? ' on' : ''}`}
            onClick={() => set('shadow', !shadow)}
          >
            {shadow ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="style-section">
        <h3>Background</h3>

        <div className="style-row">
          <label>Color</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => set('bgColor', e.target.value)}
          />
        </div>

        <div className="style-row">
          <label>Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={bgOpacity}
            onChange={(e) => set('bgOpacity', Number(e.target.value))}
          />
          <span className="value-label">{Math.round(bgOpacity * 100)}%</span>
        </div>
      </div>

      <div className="style-section">
        <h3>Position</h3>

        <div className="style-row">
          <label>Vertical</label>
          <input
            type="range"
            min={10}
            max={90}
            value={verticalPosition}
            onChange={(e) => set('verticalPosition', Number(e.target.value))}
          />
          <span className="value-label">{verticalPosition}%</span>
        </div>
      </div>
    </div>
  )
}
