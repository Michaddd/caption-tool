export function ProcessingScreen({ status, error, onRetry, onBack }) {
  if (error) {
    return (
      <div className="processing-screen">
        <div className="error-box">
          <p>{error}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {onRetry && (
              <button className="btn btn-primary" onClick={onRetry}>
                Try Again
              </button>
            )}
            <button className="btn btn-secondary" onClick={onBack}>
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="processing-screen">
      <div className="spinner" />
      <h2>{status || 'Processing...'}</h2>
      <p>This may take a minute for longer videos</p>
    </div>
  )
}
