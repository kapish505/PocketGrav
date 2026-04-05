/**
 * PocketGrav — app.js
 * ====================
 * Client-side JavaScript for the phone dashboard.
 *
 * Responsibilities:
 *  - Connect to the Socket.io server on the laptop
 *  - Receive real-time project/system updates
 *  - Render logs in the terminal window
 *  - Handle navigation between pages
 *  - Send control commands to the server
 *  - Draw the CPU sparkline chart
 *  - Show toast notifications
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentPage: "dashboard",
  logCount: 0,          // total logs received (for badge)
  newLogsOnHide: 0,     // logs received while not on logs page
  cpuHistory: [],       // last 30 CPU % values for sparkline
  connected: false,
};

// ─── Socket.io Connection ─────────────────────────────────────────────────────
// auto-detects the server host (works on both localhost and LAN IP)
const socket = io();

socket.on("connect", () => {
  state.connected = true;
  setConnectionStatus("online");
  showToast("info", "Connected", "PocketGrav server connected.");
});

socket.on("disconnect", () => {
  state.connected = false;
  setConnectionStatus("offline");
  showToast("error", "Disconnected", "Lost connection to server.");
});

socket.on("connect_error", () => {
  setConnectionStatus("connecting");
});

// ─── Project Updates ──────────────────────────────────────────────────────────
socket.on("projectUpdate", (data) => {
  updateProjectCard(data);
});

// ─── System Stats ─────────────────────────────────────────────────────────────
socket.on("systemStats", (data) => {
  updateSystemPage(data);
  updateDashboardSnapshot(data);

  // Track CPU history for sparkline (max 60 values)
  state.cpuHistory.push(data.cpu);
  if (state.cpuHistory.length > 60) {
    state.cpuHistory.shift();
  }
  drawSparkline();
});

// ─── Logs ─────────────────────────────────────────────────────────────────────
// Receive all existing logs on first connect
socket.on("initialLogs", (logs) => {
  logs.forEach(addLogEntry);
});

// Real-time single log line
socket.on("newLog", (entry) => {
  addLogEntry(entry);

  // Show badge if user is not on logs page
  if (state.currentPage !== "logs") {
    state.newLogsOnHide++;
    const badge = document.getElementById("log-badge");
    badge.textContent = state.newLogsOnHide > 99 ? "99+" : state.newLogsOnHide;
    badge.classList.remove("hidden");
  }
});

// When logs are cleared from controls
socket.on("logsCleared", () => {
  document.getElementById("log-entries").innerHTML = "";
  state.logCount = 0;
  state.newLogsOnHide = 0;
  updateLogBadge();
});

// ─── Notifications ────────────────────────────────────────────────────────────
socket.on("notification", (notif) => {
  const buildNotif = document.getElementById("notif-build");
  const errNotif   = document.getElementById("notif-error");

  if (notif.type === "success" && buildNotif?.checked) {
    showToast("success", notif.title, notif.message);
    // Vibrate on supported phones
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  } else if (notif.type === "error" && errNotif?.checked) {
    showToast("error", notif.title, notif.message);
    if (navigator.vibrate) navigator.vibrate(200);
  } else if (notif.type === "warning") {
    showToast("warning", notif.title, notif.message);
  }
});

// ─── Project Card Renderer ────────────────────────────────────────────────────
function updateProjectCard(data) {
  // Name
  document.getElementById("project-name").textContent = data.name;

  // Status badge
  const badge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  badge.className = `badge badge-${data.status}`;
  badge.textContent = capitalize(data.status);
  statusText.textContent = capitalize(data.status);

  // Progress ring animation
  const progress = Math.min(Math.max(data.progress, 0), 100);
  document.getElementById("progress-percent").textContent = `${progress}%`;

  // SVG ring: circumference = 2π × 54 = ~339.29
  const circumference = 339.29;
  const offset = circumference - (progress / 100) * circumference;
  const ring = document.getElementById("ring-progress");
  ring.style.strokeDashoffset = offset;

  // Color the ring based on status
  const colors = {
    running:   "#7c3aed",
    building:  "#f59e0b",
    completed: "#3b82f6",
    error:     "#ef4444",
  };
  ring.style.stroke = colors[data.status] || "#7c3aed";

  // Task
  document.getElementById("current-task").textContent = data.currentTask;

  // Elapsed time — format as Xm Ys
  document.getElementById("elapsed-time").textContent = formatDuration(data.elapsedTime);
}

// ─── System Page Updater ──────────────────────────────────────────────────────
function updateSystemPage(data) {
  // CPU
  const cpuEl = document.getElementById("sys-cpu-val");
  const cpuBar = document.getElementById("sys-cpu-bar");
  if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
  if (cpuBar) cpuBar.style.width = `${data.cpu}%`;

  // Memory
  const memEl    = document.getElementById("sys-mem-val");
  const memBar   = document.getElementById("sys-mem-bar");
  const memUsed  = document.getElementById("sys-mem-used");
  const memTotal = document.getElementById("sys-mem-total");
  if (memEl)  memEl.textContent  = `${data.memory.percent}%`;
  if (memBar) memBar.style.width = `${data.memory.percent}%`;
  if (memUsed)  memUsed.textContent  = data.memory.used;
  if (memTotal) memTotal.textContent = data.memory.total;

  // Uptime
  const uptimeEl = document.getElementById("sys-uptime-display");
  if (uptimeEl) uptimeEl.textContent = formatTime(data.uptime);
}

// ─── Dashboard Snapshot Updater ───────────────────────────────────────────────
function updateDashboardSnapshot(data) {
  const dashCpu    = document.getElementById("dash-cpu");
  const dashMem    = document.getElementById("dash-mem");
  const dashUptime = document.getElementById("dash-uptime");
  const dashCpuBar = document.getElementById("dash-cpu-bar");
  const dashMemBar = document.getElementById("dash-mem-bar");

  if (dashCpu)    dashCpu.textContent    = `${data.cpu}%`;
  if (dashMem)    dashMem.textContent    = `${data.memory.percent}%`;
  if (dashUptime) dashUptime.textContent = formatTime(data.uptime, true);
  if (dashCpuBar) dashCpuBar.style.width = `${data.cpu}%`;
  if (dashMemBar) dashMemBar.style.width = `${data.memory.percent}%`;
}

// ─── Log Terminal Renderer ────────────────────────────────────────────────────
function addLogEntry(entry) {
  const container = document.getElementById("log-entries");
  if (!container) return;

  state.logCount++;

  // Determine log class
  const msg   = entry.message || "";
  let level = "info";
  if (msg.includes("[SUCCESS]") || msg.includes("✅")) level = "success";
  else if (msg.includes("[ERROR]"))   level = "error";
  else if (msg.includes("[WARN]"))    level = "warn";
  else if (msg.includes("[DEBUG]"))   level = "debug";

  // Build log element
  const el = document.createElement("div");
  el.className = `log-entry log-${level}`;
  el.innerHTML = `
    <span class="log-time">${entry.timestamp || ""}</span>
    <span class="log-text">${escapeHtml(msg)}</span>
  `;

  container.appendChild(el);

  // Keep only last 500 DOM entries
  const children = container.children;
  while (children.length > 500) {
    container.removeChild(children[0]);
  }

  // Auto-scroll if enabled
  const autoScroll = document.getElementById("setting-autoscroll");
  if (!autoScroll || autoScroll.checked) {
    scrollToBottom();
  }
}

function scrollToBottom() {
  const terminal = document.getElementById("log-terminal");
  if (terminal) {
    terminal.scrollTop = terminal.scrollHeight;
  }
}

// ─── CPU Sparkline Chart ──────────────────────────────────────────────────────
function drawSparkline() {
  const canvas = document.getElementById("cpu-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.offsetWidth || 340;
  const h = canvas.offsetHeight || 80;

  // Use device pixel ratio for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const data = state.cpuHistory;
  if (data.length < 2) return;

  const maxVal = 100;
  const padX = 2;
  const padY = 4;
  const stepX = (w - padX * 2) / (data.length - 1);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(124, 58, 237, 0.4)");
  grad.addColorStop(1, "rgba(124, 58, 237, 0)");

  // Build path
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - val / maxVal) * (h - padY * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  // Fill below line
  const lastX = padX + (data.length - 1) * stepX;
  const lastY = padY + (1 - data[data.length - 1] / maxVal) * (h - padY * 2);
  ctx.lineTo(lastX, h);
  ctx.lineTo(padX, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw line on top
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - val / maxVal) * (h - padY * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Current value dot
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#a78bfa";
  ctx.fill();
}

// ─── Control Commands ─────────────────────────────────────────────────────────
async function sendControl(action) {
  if (!state.connected) {
    showToast("error", "Not Connected", "Cannot send commands — server offline.");
    return;
  }

  // Disable all control buttons briefly
  const buttons = document.querySelectorAll(".control-btn");
  buttons.forEach(b => { b.disabled = true; b.style.opacity = "0.5"; });

  try {
    const res = await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = await res.json();

    if (data.success) {
      showToast("success", "Command Sent", data.message || action);
    } else {
      showToast("error", "Error", data.error || "Command failed");
    }

    // Add to command history
    addCmdHistory(action);

  } catch (err) {
    showToast("error", "Failed", "Could not send command to server.");
  } finally {
    // Re-enable buttons after 1 second
    setTimeout(() => {
      buttons.forEach(b => { b.disabled = false; b.style.opacity = ""; });
    }, 1000);
  }
}

function addCmdHistory(action) {
  const histEl = document.getElementById("cmd-history");
  if (!histEl) return;

  // Remove empty state
  const empty = histEl.querySelector(".empty-state");
  if (empty) empty.remove();

  const colors = {
    restart: "#22c55e",
    stop: "#ef4444",
    deploy: "#a78bfa",
    clearLogs: "#f59e0b",
  };

  const el = document.createElement("div");
  el.className = "cmd-entry";
  el.innerHTML = `
    <div class="cmd-dot" style="background:${colors[action] || '#64748b'}"></div>
    <span class="cmd-name">${capitalize(action)}</span>
    <span class="cmd-time">${new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
  `;

  // Newest at top
  histEl.insertBefore(el, histEl.firstChild);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page) {
  // Hide all pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  // Hide all nav indicators
  document.querySelectorAll(".nav-indicator").forEach(i => i.classList.add("hidden"));

  // Show target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add("active");

  // Activate nav item
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) {
    navEl.classList.add("active");
    const indicator = document.getElementById(`nav-indicator-${page}`);
    if (indicator) indicator.classList.remove("hidden");
  }

  // Clear log badge when switching to logs
  if (page === "logs") {
    state.newLogsOnHide = 0;
    updateLogBadge();
    // Scroll to bottom of terminal
    setTimeout(scrollToBottom, 100);
  }

  // Redraw chart when switching to system
  if (page === "system") {
    setTimeout(drawSparkline, 100);
  }

  state.currentPage = page;
}

function updateLogBadge() {
  const badge = document.getElementById("log-badge");
  if (!badge) return;
  if (state.newLogsOnHide === 0) {
    badge.classList.add("hidden");
  } else {
    badge.textContent = state.newLogsOnHide > 99 ? "99+" : state.newLogsOnHide;
    badge.classList.remove("hidden");
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
const toastIcons = {
  success: "✅",
  error:   "❌",
  warning: "⚠️",
  info:    "ℹ️",
};

function showToast(type, title, message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${toastIcons[type] || "ℹ️"}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  if (!toast || toast.classList.contains("removing")) return;
  toast.classList.add("removing");
  setTimeout(() => toast.remove(), 300);
}

// ─── Settings: Apply Custom Host ──────────────────────────────────────────────
function applyHost() {
  const host = document.getElementById("setting-host").value.trim();
  if (!host) return;

  showToast("info", "Reconnecting", `Connecting to ${host}...`);

  // Disconnect current socket and reconnect to new host
  socket.disconnect();
  socket.io.uri = `http://${host}`;
  socket.connect();
}

// ─── Connection Status ────────────────────────────────────────────────────────
function setConnectionStatus(status) {
  const dot   = document.getElementById("connection-dot");
  const label = document.getElementById("connection-label");

  if (!dot || !label) return;

  dot.className = `status-dot ${status}`;

  const labels = {
    online:     "Connected",
    offline:    "Offline",
    connecting: "Connecting...",
  };
  label.textContent = labels[status] || status;
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

// Format seconds as HH:MM:SS
function formatTime(seconds, short = false) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (short) {
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

// Format seconds as "Xm Ys" or "Xs"
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// Capitalize first char
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Prevent XSS in log messages
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ─── Resize handler for sparkline ────────────────────────────────────────────
window.addEventListener("resize", () => {
  if (state.currentPage === "system") {
    drawSparkline();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
// Navigate to dashboard on load (ensure correct initial state)
navigate("dashboard");

// Pre-fill the current server host in settings
document.addEventListener("DOMContentLoaded", () => {
  const hostInput = document.getElementById("setting-host");
  if (hostInput) {
    hostInput.placeholder = `${window.location.hostname}:${window.location.port || 3000}`;
  }
});
