/**
 * PocketGrav - Server Entry Point
 * ================================
 * Express + Socket.io server that:
 * - Serves the frontend static files
 * - Streams real system stats (CPU, Memory)
 * - Simulates AntiGravity project progress
 * - Handles control commands from the phone
 *
 * Run with: node server.js
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const si = require("systeminformation");
const localtunnel = require("localtunnel");
const qrcode = require("qrcode-terminal");

module.exports = async function localCommand() {
  // ─── App Setup ───────────────────────────────────────────────────────────────
  const app = express();
  const server = http.createServer(app);

  // Allow cross-origin from phone browser on same network
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.use(cors());
  app.use(express.json());

  // Serve frontend files from /public
  app.use(express.static(path.join(__dirname, "../../public")));

  // ─── In-Memory State ─────────────────────────────────────────────────────────
  // This holds all project state in memory (no DB needed)
  let projectState = {
    name: "AntiGravity Core Build",
    status: "running",        // running | completed | error | building
    progress: 0,              // 0-100
    currentTask: "Initializing modules...",
    startTime: Date.now(),
    elapsedTime: 0,
  };

  // Log buffer — stores the last 200 log lines
  let logBuffer = [];

  // Server stats cache
  let systemStats = {
    cpu: 0,
    memory: { used: 0, total: 0, percent: 0 },
    uptime: 0,
  };

  // ─── AntiGravity Project Simulation ──────────────────────────────────────────
  // These tasks are shown sequentially as the simulated build progresses
  const buildTasks = [
    "🔍 Scanning workspace files...",
    "📦 Installing dependencies...",
    "🧠 Loading AI model weights...",
    "🔗 Connecting to vector store...",
    "⚙️  Compiling core modules...",
    "🧪 Running unit tests...",
    "🔄 Syncing with context store...",
    "🚀 Optimizing embeddings...",
    "📊 Generating build report...",
    "✅ Finalizing deployment artifacts...",
  ];

  // Fake log messages injected every ~1s
  const fakeLogs = [
    "[INFO] Loading config from ~/.antigravity/config.json",
    "[INFO] Context window allocated: 128k tokens",
    "[DEBUG] Skill loader: found 47 skills in registry",
    "[WARN] Rate limit approaching — 82% of quota used",
    "[INFO] Socket connection established on port 3000",
    "[DEBUG] Memory pressure: 4.2GB / 16GB active",
    "[INFO] Build cache hit — skipping src/models/embedder.js",
    "[ERROR] Timeout on vector store ping — retrying...",
    "[INFO] Retry succeeded — vector store online",
    "[INFO] Compiling TypeScript: 0 errors, 2 warnings",
    "[DEBUG] Spawning worker thread for heavy computation",
    "[INFO] Context7 docs fetched — 1.2MB",
    "[INFO] Running eval suite: 24/24 passed",
    "[INFO] Artifact fingerprint: sha256:4f2a91bc...",
    "[WARN] Deprecated API usage in skill: code-refactoring",
    "[INFO] Build step 3/10 complete",
    "[DEBUG] CPU affinity set to cores 0-3",
    "[INFO] Deploy target: vercel-production",
    "[INFO] Uploading build artifacts (12.4 MB)...",
    "[SUCCESS] Build completed in 47.3s",
  ];

  // ─── Simulation Engine ────────────────────────────────────────────────────────
  let simulationInterval = null;
  let logInterval = null;
  let taskIndex = 0;
  let simProgress = 0;

  function startSimulation() {
    // Clear any running sim first
    if (simulationInterval) clearInterval(simulationInterval);
    if (logInterval) clearInterval(logInterval);

    // Reset state
    simProgress = 0;
    taskIndex = 0;
    projectState.startTime = Date.now();
    projectState.status = "building";
    projectState.progress = 0;
    projectState.currentTask = buildTasks[0];

    addLog("[INFO] 🚀 PocketGrav Simulation started");

    // Progress simulation — increases every 3 seconds
    simulationInterval = setInterval(() => {
      if (simProgress >= 100) {
        clearInterval(simulationInterval);
        projectState.status = "completed";
        projectState.progress = 100;
        projectState.currentTask = "✅ Build Completed Successfully";
        addLog("[SUCCESS] 🎉 Build finished! All systems nominal.");

        // Notify clients of completion
        io.emit("notification", {
          type: "success",
          title: "Build Completed",
          message: "AntiGravity Core Build completed successfully!",
          timestamp: new Date().toISOString(),
        });

        // Auto-restart after 10s for continuous demo
        setTimeout(() => {
          startSimulation();
        }, 10000);
        return;
      }

      simProgress = Math.min(simProgress + Math.random() * 4 + 1, 100);
      projectState.progress = Math.floor(simProgress);
      projectState.status = simProgress < 100 ? "running" : "completed";

      // Update current task based on progress
      const taskStep = Math.floor((simProgress / 100) * buildTasks.length);
      if (taskStep < buildTasks.length && taskIndex !== taskStep) {
        taskIndex = taskStep;
        projectState.currentTask = buildTasks[taskStep];
        addLog(`[INFO] Task: ${buildTasks[taskStep]}`);
      }

      // Update elapsed
      projectState.elapsedTime = Math.floor((Date.now() - projectState.startTime) / 1000);

      // Broadcast updated project state to all connected phones
      io.emit("projectUpdate", projectState);
    }, 2000);

    // Log injector — adds a fake log every 1.5 seconds
    logInterval = setInterval(() => {
      const log = fakeLogs[Math.floor(Math.random() * fakeLogs.length)];
      addLog(log);
    }, 1500);
  }

  // Store and emit a log entry
  function addLog(message) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      message,
    };
    logBuffer.push(entry);

    // Keep only last 200 logs
    if (logBuffer.length > 200) {
      logBuffer = logBuffer.slice(-200);
    }

    // Broadcast to all connected clients immediately
    io.emit("newLog", entry);

    // Also check for error logs and send notifications
    if (message.includes("[ERROR]")) {
      io.emit("notification", {
        type: "error",
        title: "Error Detected",
        message: message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ─── System Stats Polling ─────────────────────────────────────────────────────
  // Reads real CPU and memory from the laptop using systeminformation
  async function updateSystemStats() {
    try {
      const [cpu, mem, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.time(),
      ]);

      systemStats = {
        cpu: Math.round(cpu.currentLoad),
        memory: {
          used: Math.round(mem.active / 1024 / 1024 / 1024 * 10) / 10, // GB
          total: Math.round(mem.total / 1024 / 1024 / 1024 * 10) / 10,  // GB
          percent: Math.round((mem.active / mem.total) * 100),
        },
        uptime: Math.floor(time.uptime),
      };

      io.emit("systemStats", systemStats);
    } catch (err) {
      // Fallback with random data if si fails
      systemStats = {
        cpu: Math.floor(Math.random() * 40 + 20),
        memory: {
          used: (Math.random() * 8 + 4).toFixed(1),
          total: 16,
          percent: Math.floor(Math.random() * 40 + 30),
        },
        uptime: Math.floor(process.uptime()),
      };
      io.emit("systemStats", systemStats);
    }
  }

  // Poll system stats every 2 seconds
  setInterval(updateSystemStats, 2000);

  // ─── REST API Endpoints ───────────────────────────────────────────────────────
  // These handle control commands from the front-end

  // Get current project state
  app.get("/api/status", (req, res) => {
    res.json({ project: projectState, system: systemStats });
  });

  // Get all logs
  app.get("/api/logs", (req, res) => {
    res.json(logBuffer);
  });

  // Control actions — restart / stop / deploy / clear
  app.post("/api/control", (req, res) => {
    const { action } = req.body;

    switch (action) {
      case "restart":
        addLog("[INFO] 🔄 Restart command received from PocketGrav");
        startSimulation();
        res.json({ success: true, message: "Project restarted" });
        break;

      case "stop":
        clearInterval(simulationInterval);
        clearInterval(logInterval);
        projectState.status = "error";
        projectState.currentTask = "⛔ Stopped by user";
        addLog("[WARN] ⛔ Project stopped by user command");
        io.emit("projectUpdate", projectState);
        io.emit("notification", {
          type: "warning",
          title: "Project Stopped",
          message: "Project was manually stopped.",
          timestamp: new Date().toISOString(),
        });
        res.json({ success: true, message: "Project stopped" });
        break;

      case "deploy":
        addLog("[INFO] 🚀 Deploying to production...");
        addLog("[INFO] Uploading artifacts to Vercel...");
        setTimeout(() => {
          addLog("[SUCCESS] ✅ Deployed to https://pocketgrav.vercel.app");
          io.emit("notification", {
            type: "success",
            title: "Deployed!",
            message: "Project deployed to production successfully.",
            timestamp: new Date().toISOString(),
          });
        }, 3000);
        res.json({ success: true, message: "Deployment initiated" });
        break;

      case "clearLogs":
        logBuffer = [];
        addLog("[INFO] 🧹 Logs cleared by user");
        io.emit("logsCleared");
        res.json({ success: true, message: "Logs cleared" });
        break;

      default:
        res.status(400).json({ error: "Unknown action" });
    }
  });

  // Fallback: serve index.html for all non-API routes
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../../public", "index.html"));
  });

  // ─── Socket.io Events ─────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`📱 Phone connected: ${socket.id}`);
    addLog(`[INFO] 📱 PocketGrav client connected`);

    // Send current state immediately on connection
    socket.emit("projectUpdate", projectState);
    socket.emit("systemStats", systemStats);
    socket.emit("initialLogs", logBuffer);

    socket.on("disconnect", () => {
      console.log(`📱 Phone disconnected: ${socket.id}`);
      addLog(`[INFO] 📴 PocketGrav client disconnected`);
    });
  });

  // Kick off the simulation on start
  startSimulation();
  updateSystemStats();

  // Start Server
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
