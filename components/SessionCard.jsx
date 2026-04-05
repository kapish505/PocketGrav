/**
 * components/SessionCard.jsx
 * ───────────────────────────
 * Card shown on the dashboard for each AntiGravity session.
 * Links to the project detail page.
 */
import Link from "next/link"

export default function SessionCard({ session, taskCounts }) {
  const { done, active, pending, total } = taskCounts || {}
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const isActive = session.status === "active" || session.status === "in_progress"

  // Shorten the UUID to last 8 chars for display
  const shortId = session.id?.slice(-8) || "—"

  // Format the last updated time
  const lastUpdated = session.last_updated
    ? timeAgo(new Date(session.last_updated))
    : "—"

  return (
    <Link
      href={`/project/${session.id}`}
      className={`session-card${isActive ? " is-active" : ""}`}
    >
      <div className="card">
        <div className="session-card-top">
          <span className="session-title">
            {session.title || "Untitled Session"}
          </span>
          <span className={`badge badge-${session.status}`}>
            {session.status}
          </span>
        </div>

        <div className="session-meta">
          <span className="session-id mono">…{shortId}</span>
          <span className="session-time">Updated {lastUpdated}</span>
        </div>

        {/* Progress bar — only if we have tasks */}
        {total > 0 && (
          <div className="progress-bar">
            <div className="progress-bar-header">
              <span className="progress-bar-label">Progress</span>
              <span className="progress-bar-pct">{progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${progress === 100 ? "completed" : ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Task count chips */}
        {total > 0 && (
          <div className="task-preview">
            {done > 0    && <span className="task-preview-chip chip-done">{done} done</span>}
            {active > 0  && <span className="task-preview-chip chip-active">{active} active</span>}
            {pending > 0 && <span className="task-preview-chip chip-pending">{pending} pending</span>}
          </div>
        )}

        {total === 0 && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            No tasks synced yet
          </p>
        )}
      </div>
    </Link>
  )
}

// Helper: relative time string (e.g. "2 minutes ago")
function timeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // seconds ago

  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
