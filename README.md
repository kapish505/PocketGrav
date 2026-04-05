# PocketGrav 🚀

> **Monitor your AI Agents & AntiGravity projects from anywhere in the world.**

PocketGrav is a cloudy-native, phone-first developer dashboard that streams real-time updates from your locally running AntiGravity agent sessions to a live Vercel-hosted web app. 

---

# PocketGrav 🚀

> **Monitor your AI Agents & AntiGravity projects from anywhere in the world.**

PocketGrav is a cloudy-native, phone-first developer dashboard that streams real-time updates from your locally running AntiGravity agent sessions automatically.

---

## 💻 Zero-Setup Universal CLI

We've bundled the entire PocketGrav experience into a single zero-dependency NPM package.

```bash
npx pocketgrav --help
```

PocketGrav operates in two distinct modes depending on your privacy and persistence needs:

### ⚡ Mode 1: Local Tunnel Mode (Zero Cloud Needed)
If you want absolutely zero friction and no cloud accounts, run:

```bash
npx pocketgrav local
```

**How it works**: 
It boots a local Express webserver reading directly from your memory, spin ups a secure Cloudflare-style reverse tunnel (`localtunnel`), and prints a **QR Code** right to your terminal. Scan the QR code with your phone camera, and you instantly have a real-time tracking dashboard without data ever touching a persistent database.

---

### ☁️ Mode 2: Global Cloud SaaS Sync
If you want persistent tracking across multiple machines or to view old sessions when your laptop is closed, you can sync data directly to our global SaaS platform hosted on Vercel/Supabase.

1. Go to [https://pocket-grav.vercel.app](https://pocket-grav.vercel.app) (or your own self-hosted deployment) and log in with your Google Account.
2. Click on **Settings** in the navbar to generate your strict, private API Key.
3. Run the persistent watcher daemon on your laptop in the background:

```bash
npx pocketgrav cloud --email your.email@gmail.com --key <YOUR_API_KEY>
```

**How it works**:
The daemon utilizes `chokidar` to efficiently watch your local `~/.gemini/antigravity/brain/` directory. Whenever your agent modifies a `task.md` or `walkthrough.md` file, the CLI parses the checklist state, calculates progress percentages, and securely `POST`s the update to the Supabase backend utilizing Row-Level Security.

---

## 🏗 Self-Hosting the SaaS

You can deploy your exact own replica of the PocketGrav Cloud to your own Vercel!

### Infrastructure Checklist
1. **Supabase**: Create a project and run `supabase/schema.sql` in the SQL Editor.
2. **Google Cloud Console**: Create an OAuth 2.0 Web Client.
3. **Vercel**: Deploy the code and bind these environment variables:

```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth
NEXTAUTH_URL=https://<your-vercel>.vercel.app
NEXTAUTH_SECRET=generate_random_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

If you self-host, you just point the CLI to your own URL:
`npx pocketgrav cloud --email x --key y --url https://<your-vercel>.vercel.app/api/ingest`

---

### 🛠 Tech Stack
- **CLI Tool**: Node.js, Commander.js, Localtunnel, Chokidar
- **Web App**: Next.js App Router (v15+)
- **Database / Auth**: Supabase PostgreSQL + NextAuth.js
- **Design**: Vanilla CSS Custom Glassmorphism
