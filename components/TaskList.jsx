/**
 * components/TaskList.jsx
 * ─────────────────────────
 * Renders a list of task rows from the database.
 * Shows done ✓, in_progress ⟳, and pending tasks.
 */
export default function TaskList({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return <p className="doc-empty">No tasks found</p>
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const isDone    = task.status === "done"
        const isActive  = task.status === "in_progress"
        const isPending = task.status === "pending"

        return (
          <div
            key={task.id}
            className={`task-item ${isDone ? "is-done" : isActive ? "is-active" : "is-pending"}`}
          >
            {/* Checkbox icon */}
            <div className={`task-checkbox ${isDone ? "done" : isActive ? "active" : "pending"}`}>
              {isDone   && "✓"}
              {isActive && "⟳"}
            </div>

            {/* Task text */}
            <span className={`task-text ${isDone ? "is-done" : ""}`}>
              {task.content}
            </span>
          </div>
        )
      })}
    </div>
  )
}
