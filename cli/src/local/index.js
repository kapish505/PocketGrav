const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const si = require("systeminformation");
const localtunnel = require("localtunnel");
const qrcode = require("qrcode-terminal");

module.exports = async function localCommand() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../../public")));

  const BRAIN_PATH = path.join(os.homedir(), ".gemini/antigravity/brain");

  let projectState = {
    name: "Awaiting Session...",
    status: "running", 
    progress: 0,
    currentTask: "Waiting for Agent to initialize...",
    startTime: Date.now(),
    elapsedTime: 0,
  };

  let logBuffer = [];
  let systemStats = { cpu: 0, memory: { total: 0, used: 0, percent: 0 }, uptime: 0 };
  let lastErrorNotifTime = 0;
  
  let currentSessionId = null;
  let logFileByteSize = 0;

  function addLog(message) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      message,
    };
    logBuffer.push(entry);
    if (logBuffer.length > 200) logBuffer = logBuffer.slice(-200);
    io.emit("newLog", entry);

    if (message.includes("[ERROR]") || message.toLowerCase().includes("error")) {
      const now = Date.now();
      if (now - lastErrorNotifTime > 5000) {
        lastErrorNotifTime = now;
        io.emit("notification", {
          type: "error", title: "Error Detected", message: message, timestamp: new Date().toISOString(),
        });
      }
    }
  }

  function parseTaskMd(content) {
    const lines = content.split("\n")
    let title = null
    const tasks = []
    let taskIndex = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("# ") && !title) {
        title = trimmed.replace(/^#+\s*/, "").trim()
        continue
      }
      const doneMatch    = trimmed.match(/^-\s*\[x\]\s*(.+)/i)
      const activeMatch  = trimmed.match(/^-\s*\[\/\]\s*(.+)/)
      const pendingMatch = trimmed.match(/^-\s*\[\s*\]\s*(.+)/)

      if (doneMatch) tasks.push({ content: doneMatch[1].trim(), status: "done", index: taskIndex++ })
      else if (activeMatch) tasks.push({ content: activeMatch[1].trim(), status: "in_progress", index: taskIndex++ })
      else if (pendingMatch) tasks.push({ content: pendingMatch[1].trim(), status: "pending", index: taskIndex++ })
    }

    const total = tasks.length
    const done = tasks.filter(t => t.status === "done").length
    const running = tasks.filter(t => t.status === "in_progress").length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0
    let status = "running"
    
    if (total > 0) {
      if (done === total) status = "completed"
      else if (running > 0) status = "running"
      else if (done > 0) status = "running"
    }

    let currentTask = "No active tasks..."
    const activeTaskObj = tasks.find(t => t.status === "in_progress")
    if (activeTaskObj) currentTask = activeTaskObj.content
    else if (tasks.length > 0 && done !== total) currentTask = "Planning next steps..."
    else if (done === total && total > 0) currentTask = "✅ All tasks completed!"

    return { title, tasks, progress, status, currentTask }
  }

  function updateProjectFromSession(sessionId) {
    const sessionDir = path.join(BRAIN_PATH, sessionId);
    if (!fs.existsSync(sessionDir)) return;

    let title = `Session ${sessionId.slice(-8)}`;
    
    const planPath = path.join(sessionDir, "implementation_plan.md");
    if (fs.existsSync(planPath)) {
      const planMd = fs.readFileSync(planPath, "utf-8");
      const titleMatch = planMd.match(/^#\s+(.+)/m);
      if (titleMatch) title = titleMatch[1].trim();
    }

    const taskPath = path.join(sessionDir, "task.md");
    if (fs.existsSync(taskPath)) {
      const parsed = parseTaskMd(fs.readFileSync(taskPath, "utf-8"));
      projectState.name = parsed.title || title;
      projectState.progress = parsed.progress;
      projectState.status = parsed.status;
      projectState.currentTask = parsed.currentTask;
    } else {
      projectState.name = title;
      projectState.currentTask = "Monitoring files...";
    }
    
    io.emit("projectUpdate", projectState);
  }

  function pollActiveSessionLogs() {
    if (!currentSessionId) return;
    const logPath = path.join(BRAIN_PATH, currentSessionId, ".system_generated/logs/overview.txt");
    if (fs.existsSync(logPath)) {
      const stat = fs.statSync(logPath);
      if (stat.size > logFileByteSize) {
        const stream = fs.createReadStream(logPath, { start: logFileByteSize, end: stat.size - 1, encoding: "utf-8" });
        stream.on('data', chunk => {
           let lines = chunk.split("\n").filter(l => l.trim().length > 0);
           for (let line of lines) {
             const cleanLine = line.replace(/^\s*\[.*?\]\s*/, '').trim(); // Remove leading timestamps if present
             if (cleanLine) addLog(`[AGENT] ${cleanLine.substring(0, 100)}${cleanLine.length > 100 ? '...' : ''}`);
           }
        });
        logFileByteSize = stat.size;
      } else if (stat.size < logFileByteSize) {
        logFileByteSize = 0; // File was truncated/cleared
      }
    }
  }

  function findNewestSession() {
    if (!fs.existsSync(BRAIN_PATH)) return null;
    const entries = fs.readdirSync(BRAIN_PATH, { withFileTypes: true });
    let newest = null;
    let maxTime = 0;
    for (let e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".")) {
        const stat = fs.statSync(path.join(BRAIN_PATH, e.name));
        if (stat.mtimeMs > maxTime) {
          maxTime = stat.mtimeMs;
          newest = e.name;
        }
      }
    }
    return newest;
  }

  setInterval(() => {
    projectState.elapsedTime = Math.floor((Date.now() - projectState.startTime) / 1000);
    io.emit("projectUpdate", projectState);
  }, 1000);

  async function updateSystemStats() {
    try {
      const [cpu, mem, time] = await Promise.all([si.currentLoad(), si.mem(), si.time()]);
      systemStats = {
        cpu: Math.round(cpu.currentLoad),
        memory: {
          used: Math.round(mem.active / 1024 / 1024 / 1024 * 10) / 10,
          total: Math.round(mem.total / 1024 / 1024 / 1024 * 10) / 10,
          percent: Math.round((mem.active / mem.total) * 100),
        },
        uptime: Math.floor(time.uptime),
      };
      io.emit("systemStats", systemStats);
    } catch (err) {}
  }

  setInterval(updateSystemStats, 2000);

  let chokidar;
  try { chokidar = require("chokidar") } catch (e) {}

  if (chokidar) {
    const watcher = chokidar.watch(BRAIN_PATH, {
      ignored: /(^|[/\\])\../, persistent: true, depth: 3
    });

    watcher.on("all", (event, filePath) => {
      const relativePath = path.relative(BRAIN_PATH, filePath);
      const sessionId = relativePath.split(path.sep)[0];
      if (!sessionId || sessionId.startsWith(".")) return;
      
      if (currentSessionId !== sessionId && event === "change") {
         currentSessionId = sessionId;
         projectState.startTime = Date.now();
         logFileByteSize = 0;
         addLog(`[SYSTEM] Attached to active session: ${sessionId.slice(-8)}`);
      }

      if (currentSessionId === sessionId) {
         updateProjectFromSession(sessionId);
      }
    });

    setInterval(pollActiveSessionLogs, 2000);

  } else {
    setInterval(() => {
      const newest = findNewestSession();
      if (newest) {
        if (newest !== currentSessionId) {
          currentSessionId = newest;
          projectState.startTime = Date.now();
          logFileByteSize = 0;
          addLog(`[SYSTEM] Attached to active session: ${newest.slice(-8)}`);
        }
        updateProjectFromSession(currentSessionId);
        pollActiveSessionLogs();
      }
    }, 2000);
  }

  app.get("/api/status", (req, res) => res.json({ project: projectState, system: systemStats }));
  app.get("/api/logs", (req, res) => res.json(logBuffer));
  app.post("/api/control", (req, res) => {
    addLog(`[WARN] Action sent to agent: ${req.body.action}`);
    res.json({ success: true, message: "Action received" });
  });

  app.use((req, res) => res.sendFile(path.join(__dirname, "../../public", "index.html")));

  io.on("connection", (socket) => {
    socket.emit("projectUpdate", projectState);
    socket.emit("systemStats", systemStats);
    socket.emit("initialLogs", logBuffer);
  });

  updateSystemStats();
  
  currentSessionId = findNewestSession();
  if (currentSessionId) {
    updateProjectFromSession(currentSessionId);
    pollActiveSessionLogs();
  } else {
    addLog("[SYSTEM] Waiting for an AntiGravity session to start...");
  }

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, async () => {
    console.log(`\nLocal server listening on http://localhost:${PORT}`)
    try {
      const tunnel = await localtunnel({ port: PORT, subdomain: 'pocketgrav-' + Math.floor(Math.random()*10000) })
      console.log(`\n🌐 Secure Public Tunnel active:`)
      console.log(`   ${tunnel.url}\n`)
      console.log(`📱 Scan this QR Code on your phone:\n`)
      qrcode.generate(tunnel.url, { small: true })
    } catch(e) {
      console.log("Failed to start tunnel:", e)
    }
  });
}
