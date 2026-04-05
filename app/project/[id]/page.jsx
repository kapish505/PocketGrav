/**
 * app/project/[id]/page.jsx — Project Detail
 * ────────────────────────────────────────────
 * Shows full detail for one AntiGravity session:
 * - Task checklist (parsed from task.md)
 * - Implementation plan (raw markdown)
 * - Walkthrough (raw markdown)
 * - Recent logs
 *
 * Server component with auto-refresh every 10s.
 */
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSupabaseAdmin } from "@/lib/supabase"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import RefreshTimer from "@/components/RefreshTimer"
import LogoutButton from "@/components/LogoutButton"
import TaskList from "@/components/TaskList"
import DocViewer from "@/components/DocViewer"

export const dynamic = "force-dynamic"

export default async function ProjectPage({ params }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const supabase = getSupabaseAdmin()

  // Fetch session record
  const { data: projectSession } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.id)
    .eq("user_email", session.user.email)  // security: own data only
    .single()

  // 404 if session not found or not owned by this user
  if (!projectSession) notFound()

  // Fetch tasks (ordered by index)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("session_id", params.id)
    .order("task_index", { ascending: true })

  // Fetch documents (plan, walkthrough)
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("session_id", params.id)

  // Fetch last 60 log lines
  const { data: logs } = await supabase
    .from("logs")
    .select("*")
    .eq("session_id", params.id)
    .order("created_at", { ascending: false })
    .limit(60)

  // Get doc content by type
  const getDoc = (type) => documents?.find(d => d.doc_type === type)?.content || null

  // Task stats
  const done    = tasks?.filter(t => t.status === "done").length    || 0
  const active  = tasks?.filter(t => t.status === "in_progress").length || 0
  const pending = tasks?.filter(t => t.status === "pending").length  || 0
  const total   = tasks?.length || 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  // Format last updated time
  const lastUpdated = projectSession.last_updated
    ? new Date(projectSession.last_updated).toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
      })
    : "—"

  return (
    <div className="page-wrapper">
      <RefreshTimer interval={10000} />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="app-title">PocketGrav</div>
            <div className="app-subtitle">Project Detail</div>
          </div>
        </div>
        <div className="header-right">
          <div className="refresh-ring" />
          <LogoutButton />
        </div>
      </header>

      <div className="project-page">

        {/* Back link */}
        <Link href="/dashboard" className="back-btn">
          ← All Sessions
        </Link>

        {/* Project header */}
        <div className="project-header">
          <h1 className="project-title">{projectSession.title || "Untitled Session"}</h1>
          <span className={`badge badge-${projectSession.status}`}>
            {projectSession.status}
          </span>
        </div>

        {/* Stats row */}
        <div className="stats-row" style={{ marginBottom: "16px" }}>
          <div className="stat-box">
            <div className="stat-box-value" style={{ color: "#22c55e" }}>{done}</div>
            <div className="stat-box-label">Done</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value" style={{ color: "#f59e0b" }}>{active}</div>
            <div className="stat-box-label">In Progress</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value" style={{ color: "#475569" }}>{pending}</div>
            <div className="stat-box-label">Pending</div>
          </div>
        </div>

        {/* Overall progress bar */}
        {total > 0 && (
          <div className="card" style={{ marginBottom: "16px", padding: "16px" }}>
            <div className="progress-bar">
              <div className="progress-bar-header">
                <span className="progress-bar-label">Overall Progress</span>
                <span className="progress-bar-pct">{progress}%</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${progress === 100 ? "completed" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
              Last updated {lastUpdated}
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="project-sections">

          {/* Task List */}
          {tasks && tasks.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: "14px" }}>
                <span>📋</span> Task Checklist
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
                  {done}/{total} done
                </span>
              </div>
              <TaskList tasks={tasks} />
            </div>
          )}

          {/* Implementation Plan */}
          {getDoc("plan") && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: "14px" }}>
                <span>🗺</span> Implementation Plan
                <span className="doc-type-badge" style={{ marginLeft: "auto" }}>implementation_plan.md</span>
              </div>
              <DocViewer content={getDoc("plan")} />
            </div>
          )}

          {/* Walkthrough */}
          {getDoc("walkthrough") && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: "14px" }}>
                <span>📖</span> Walkthrough
                <span className="doc-type-badge" style={{ marginLeft: "auto" }}>walkthrough.md</span>
              </div>
              <DocViewer content={getDoc("walkthrough")} />
            </div>
          )}

          {/* Logs */}
          {logs && logs.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: "14px" }}>
                <span>🔴</span> Recent Logs
                <span className="live-dot" style={{ marginLeft: "6px" }} />
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
                  last {logs.length}
                </span>
              </div>
              <div className="log-terminal">
                {/* Show newest at bottom */}
                {[...logs].reverse().map((log) => (
                  <div key={log.id} className="log-line">
                    <span className="log-ts">
                      {new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <span className={`log-msg level-${log.level}`}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state if no data */}
          {total === 0 && !getDoc("plan") && !getDoc("walkthrough") && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-title">Waiting for data</div>
                <div className="empty-state-text">
                  The reporter is syncing this session. Check back in a moment.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
