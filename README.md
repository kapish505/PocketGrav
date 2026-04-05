# PocketGrav 🚀

> **Monitor your AntiGravity projects from your phone — in real time.**

PocketGrav is a beautiful, phone-first developer dashboard that lets you watch your laptop's AntiGravity project builds, logs, and system stats from anywhere on your local network.

---

## ✨ Features

| Feature | Details |
|---|---|
| ⚡ Live Project Status | Progress ring, current task, build status badge |
| 📋 Live Logs | Real-time terminal-style log stream via Socket.io |
| 🖥 System Stats | Real CPU %, Memory, Uptime + sparkline history |
| 🎮 Controls | Restart / Stop / Deploy / Clear Logs |
| 🔔 Notifications | Toast alerts on build complete or errors |
| 📱 Mobile First | Designed for your phone browser, works on desktop too |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js
```

Then open on your **phone browser**:
```
http://<your-laptop-ip>:3000
```

> **Tip**: Find your laptop's IP with `ifconfig | grep "inet "` on Mac.

---

## 📁 Project Structure

```
PocketGrav/
├── public/
│   ├── index.html     ← All 5 pages (Dashboard, Logs, System, Controls, Settings)
│   ├── style.css      ← Dark glassmorphism theme
│   └── app.js         ← Socket.io client, navigation, charts
├── server.js          ← Express + Socket.io + system stats + simulation
├── package.json
└── README.md
```

---

## 🎨 Design

- **Dark theme** with deep `#0a0a0f` background
- **Glassmorphism** cards with blur + border glow
- **JetBrains Mono** for logs and stats
- **Inter** for UI text
- **Animated progress ring** that changes color by status:
  - 🟢 Green = Running
  - 🔵 Blue = Completed
  - 🔴 Red = Error
  - 🟡 Yellow = Building

---

## 📡 How It Works

```
Your Laptop (server.js)
      │
      │  Socket.io WebSocket
      │  (real-time events)
      ▼
Your Phone Browser (app.js)
      │
      │  Renders live:
      ├─ Project progress & status
      ├─ Log stream
      ├─ CPU / Memory / Uptime
      └─ Toast notifications
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Realtime | Socket.io |
| System Info | `systeminformation` npm package |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Fonts | Google Fonts (Inter + JetBrains Mono) |
| Database | None (in-memory) |

---

## 🔧 Customization

- **Server port**: Change `PORT` in `server.js` (default: 3000)
- **Build tasks**: Edit `buildTasks` array in `server.js`
- **Log messages**: Edit `fakeLogs` array in `server.js`
- **Real project integration**: Replace the simulation `setInterval` with actual child process spawning using `child_process.spawn()`

---

Made with ⚡ for the AntiGravity ecosystem.
