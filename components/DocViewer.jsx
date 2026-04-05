/**
 * components/DocViewer.jsx
 * ──────────────────────────
 * Renders raw markdown document content in a terminal-style box.
 * Uses white-space: pre-wrap to preserve markdown formatting visually.
 */
export default function DocViewer({ content }) {
  if (!content) {
    return <p className="doc-empty">No content available</p>
  }

  return (
    <div className="doc-content">
      {content}
    </div>
  )
}
