/**
 * reporter/reporter.js — Laptop AntiGravity Reporter
 * ═══════════════════════════════════════════════════
 *
 * Run this on your MacBook once to start syncing AntiGravity data to Supabase.
 *
 *   node reporter/reporter.js
 *
 * What it does:
 *   1. Watches your ~/.gemini/antigravity/brain/ directory for changes
 *   2. For each session folder, reads task.md, implementation_plan.md, walkthrough.md
 *   3. Parses tasks ([ ], [x], [/]) and extracts the session title
 *   4. Upserts everything to Supabase via the INGEST API
 *   5. Polls every 15 seconds as a fallback
 *
 * Setup: fill in .env.local at the project root before running.
 */

// Load environment variables from .env.local (one level up from /reporter)
require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") })

const path  = require("path")
const fs    = require("fs")
const http  = require("https")

// ─── Config ──────────────────────────────────────────────────────────────────
const BRAIN_PATH    = process.env.ANTIGRAVITY_BRAIN_PATH  || "/Users/kapish/.gemini/antigravity/brain"
const USER_EMAIL    = process.env.REPORTER_USER_EMAIL
const INGEST_KEY    = process.env.INGEST_API_KEY
const NEXTAUTH_URL  = process.env.NEXTAUTH_URL || "http://localhost:3000"

// When deployed to Vercel, override the ingest URL:
// e.g. INGEST_URL=https://pocketgrav.vercel.app/api/ingest
const INGEST_URL    = process.env.INGEST_URL || `${NEXTAUTH_URL}/api/ingest`

const POLL_INTERVAL = 15000 // 15 seconds

// Validate required env vars
if (!USER_EMAIL) {
  console.error("❌ Missing REPORTER_USER_EMAIL in .env.local")
  process.exit(1)
}
if (!INGEST_KEY) {
  console.error("❌ Missing INGEST_API_KEY in .env.local")
  process.exit(1)
}

console.log("╔══════════════════════════════════════════════╗")
console.log("║       🚀 PocketGrav Reporter Started         ║")
console.log("╠══════════════════════════════════════════════╣")
console.log(`║  Brain path: ${BRAIN_PATH.padEnd(30)} ║`)
console.log(`║  User email: ${USER_EMAIL.padEnd(30)} ║`)
console.log(`║  Ingest URL: ${INGEST_URL.padEnd(30)} ║`)
console.log("╚══════════════════════════════════════════════╝\n")

// ─── Task Parser ──────────────────────────────────────────────────────────────
/**
 * Parses a task.md file and returns:
 *   - title: string (first H1 heading)
 *   - tasks: Array<{ content, status, index }>
 *   - status: "active" | "completed" | "in_progress" | "unknown"
 *   - progress: 0-100
 */
function parseTaskMd(content) {
  const lines = content.split("\n")
  let title = null
  const tasks = []
  let taskIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Extract H1 title
    if (trimmed.startsWith("# ") && !title) {
      title = trimmed.replace(/^#+\s*/, "").trim()
      continue
    }

    // Parse task lines
    const doneMatch    = trimmed.match(/^-\s*\[x\]\s*(.+)/i)
    const activeMatch  = trimmed.match(/^-\s*\[\/\]\s*(.+)/)
    const pendingMatch = trimmed.match(/^-\s*\[\s*\]\s*(.+)/)

    if (doneMatch) {
      tasks.push({ content: doneMatch[1].trim(), status: "done", index: taskIndex++ })
    } else if (activeMatch) {
      tasks.push({ content: activeMatch[1].trim(), status: "in_progress", index: taskIndex++ })
    } else if (pendingMatch) {
      tasks.push({ content: pendingMatch[1].trim(), status: "pending", index: taskIndex++ })
    }
  }

  // Calculate progress and status
  const total   = tasks.length
  const done    = tasks.filter(t => t.status === "done").length
  const running = tasks.filter(t => t.status === "in_progress").length

  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  let status = "unknown"

  if (total > 0) {
    if (done === total)    status = "completed"
    else if (running > 0)  status = "active"
    else if (done > 0)     status = "in_progress"
    else                   status = "unknown"
  }

  return { title, tasks, progress, status }
}

// ─── File Reader ──────────────────────────────────────────────────────────────
function readFileSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8")
    }
  } catch (e) {
    // Ignore read errors
  }
  return null
}

// ─── Ingest API Caller ────────────────────────────────────────────────────────
async function sendToIngest(payload) {
  const body = JSON.stringify(payload)
  const url  = new URL(INGEST_URL)

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Content-Length": Buffer.byteLength(body),
      "x-api-key":     INGEST_KEY,
    },
  }

  return new Promise((resolve, reject) => {
    const protocol = url.protocol === "https:" ? require("https") : require("http")
    const req = protocol.request(options, (res) => {
      let data = ""
      res.on("data", chunk => { data += chunk })
      res.on("end",  () => {
        if (res.statusCode === 200) resolve(JSON.parse(data))
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`))
      })
    })
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

// ─── Session Processor ────────────────────────────────────────────────────────
/**
 * Reads one conversation directory and upserts all its data to Supabase.
 */
async function processSession(sessionId, sessionDir) {
  // Read all relevant files
  const taskRaw    = readFileSafe(path.join(sessionDir, "task.md"))
  const planRaw    = readFileSafe(path.join(sessionDir, "implementation_plan.md"))
  const walktRaw   = readFileSafe(path.join(sessionDir, "walkthrough.md"))

  // Skip if no meaningful files found
  if (!taskRaw && !planRaw && !walktRaw) return

  // Parse task.md
  let parsed = { title: null, tasks: [], progress: 0, status: "unknown" }
  if (taskRaw) {
    try { parsed = parseTaskMd(taskRaw) } catch (e) {}
  }

  // Determine title (fallback chain)
  const title = parsed.title
    || extractH1(planRaw)
    || extractH1(walktRaw)
    || `Session ${sessionId.slice(-8)}`

  // Build documents list
  const documents = []
  if (planRaw)  documents.push({ type: "plan",        content: planRaw })
  if (walktRaw) documents.push({ type: "walkthrough",  content: walktRaw })
  if (taskRaw)  documents.push({ type: "tasks_raw",    content: taskRaw })

  // Send to ingest endpoint
  await sendToIngest({
    session: {
      id:         sessionId,
      user_email: USER_EMAIL,
      title,
      status:     parsed.status,
      progress:   parsed.progress,
    },
    tasks:     parsed.tasks,
    documents,
  })
}

// Helper: extract first H1 from markdown
function extractH1(md) {
  if (!md) return null
  const match = md.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : null
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
/**
 * Scans all subdirectories of the brain directory and processes each.
 */
async function scanAll() {
  if (!fs.existsSync(BRAIN_PATH)) {
    console.warn(`⚠️  Brain path not found: ${BRAIN_PATH}`)
    return
  }

  const entries = fs.readdirSync(BRAIN_PATH, { withFileTypes: true })
  const dirs    = entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && e.name !== "tempmediaStorage")

  let synced = 0
  for (const dir of dirs) {
    const sessionId  = dir.name
    const sessionDir = path.join(BRAIN_PATH, sessionId)

    try {
      await processSession(sessionId, sessionDir)
      synced++
    } catch (err) {
      console.error(`  ✗ ${sessionId}: ${err.message}`)
    }
  }

  if (synced > 0) {
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Synced ${synced}/${dirs.length} sessions`)
  }
}

// ─── File Watcher ─────────────────────────────────────────────────────────────
// Use chokidar to watch for file changes and trigger immediate syncs
let chokidar
try {
  chokidar = require("chokidar")
} catch (e) {
  console.warn("⚠️  chokidar not found — using polling only. Run npm install to fix.")
}

if (chokidar) {
  const watcher = chokidar.watch(BRAIN_PATH, {
    ignored:        /(^|[/\\])\../,   // ignore dotfiles
    persistent:     true,
    ignoreInitial:  true,             // don't fire on startup (scanAll handles that)
    depth:          2,                // only watch session dir files
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  })

  // When any file changes, find its session and sync it
  const onChange = async (filePath) => {
    const relativePath  = path.relative(BRAIN_PATH, filePath)
    const sessionId     = relativePath.split(path.sep)[0]

    // Skip non-session files and hidden dirs
    if (!sessionId || sessionId.startsWith(".")) return

    const sessionDir = path.join(BRAIN_PATH, sessionId)
    console.log(`[${new Date().toLocaleTimeString()}] 📝 Change detected: ${sessionId.slice(-8)}`)

    try {
      await processSession(sessionId, sessionDir)
      console.log(`  ✓ Synced ${sessionId.slice(-8)}`)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
    }
  }

  watcher.on("change", onChange)
  watcher.on("add",    onChange)
  console.log("👁  Watching brain directory for changes...\n")
}

// ─── Start ────────────────────────────────────────────────────────────────────
// Run immediately on start
scanAll().catch(console.error)

// Then poll on interval as a fallback / catch-all
setInterval(() => {
  scanAll().catch(console.error)
}, POLL_INTERVAL)

console.log(`🔄 Polling every ${POLL_INTERVAL / 1000}s as fallback\n`)
