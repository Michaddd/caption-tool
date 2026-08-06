export default function Toolbar({ tool, setTool, onDownload, onAddMergeFile, mergeQueue, onRemoveMergeFile, onNewFile }) {
  return (
    <div className="toolbar">
      <button onClick={onNewFile}>New</button>
      <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')}>Select</button>
      <button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')}>Add Text</button>

      <div className="spacer" />

      <div className="merge-queue">
        {mergeQueue.length > 0 && <span>Merge:</span>}
        {mergeQueue.map((f, i) => (
          <span key={i} className="merge-tag">
            {f.name}
            <button onClick={() => onRemoveMergeFile(i)}>&times;</button>
          </span>
        ))}
      </div>

      <label className="merge-btn">
        + Merge PDF
        <input
          type="file"
          accept=".pdf"
          hidden
          onChange={e => {
            if (e.target.files[0]) onAddMergeFile(e.target.files[0])
            e.target.value = ''
          }}
        />
      </label>

      <button className="download-btn" onClick={onDownload}>Download PDF</button>
    </div>
  )
}
