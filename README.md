# PocketGrav 🚀

> **Monitor your AI Agents & AntiGravity projects from anywhere in the world.**

PocketGrav is a cloudy-native, phone-first developer dashboard that streams real-time updates from your locally running AntiGravity agent sessions to a live Vercel-hosted web app. 

---

## ✨ Features

- **☁️ Cloud-Native Dashboard**: Deployed on Vercel, accessible from anywhere. No need to share local IPs.
- **🔐 Secure Google Auth**: Login securely via NextAuth. Row-level security ensures you only see sessions attached to your exact email.
- **⚡ Real-Time Supabase Sync**: Local logs, tasks, and system info instantly sync through a Supabase Postgres database.
- **📊 Session Drilldown**: Track progress rings, active task states, and parsed markdown artifacts (`task.md`, `implementation_plan.md`) live as the AI generates them.
- **📱 Clean Mobile UI**: Dark glassmorphism aesthetic built specifically for reading logs and progress easily on mobile.

---

## 🏗 Architecture

```text
Your Laptop                                   The Cloud (Vercel + Supabase)
─────────────────                            ───────────────────────────────

[ 🤖 AntiGravity Agent ]
       ↓
(generates files in)                           [ 🌐 Next.js Dashboard ] 
~/.gemini/antigravity/brain                            ↑
       ↓                                               │ (Realtime Selects)
[ 📡 PocketGrav Reporter ]  ──(HTTP POST)──→   [ 🗄️ Supabase Postgres DB ]
(reporter/reporter.js)
```

---

## 🚀 How to Set Up & Deploy

PocketGrav requires setting up some cloud infrastructure (Supabase & Google Cloud).

### 1. Supabase Setup
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the queries found in `supabase/schema.sql` to generate the correct tables and Row-Level Security policies.
3. Save your **Project URL**, **Anon Key**, and **Service Role Key**.

### 2. Google OAuth Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create an OAuth 2.0 Client ID under **APIs & Services -> Credentials**.
3. Add Authorized Redirect URIs for local development (`http://localhost:3000/api/auth/callback/google`) and your eventual Vercel deployment URL.
4. Save your **Client ID** and **Client Secret**.

### 3. Vercel Deployment
1. Fork or clone this repository and import it into [Vercel](https://vercel.com).
2. Set the following Environment Variables in Vercel. 
   *(You can also set these in `.env.local` for local development)*:
   
   ```env
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # NextAuth
   NEXTAUTH_URL=https://<your-vercel-project>.vercel.app
   NEXTAUTH_SECRET=generate_a_random_32_character_string

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Reporter Ingest API Security
   INGEST_API_KEY=generate_another_random_secret_string
   ```
3. Deploy!

---

## 💻 Running the Local Reporter

The reporter script (`reporter/reporter.js`) watches your local AI environments and beams updates up to your dashboard.

1. Clone this repository locally to the machine your agents run on.
2. In the local repository's `.env.local`, specify these variables:

   ```env
   # Must exactly match the Google Email you log into the dashboard with
   REPORTER_USER_EMAIL=youremail@gmail.com 

   # Path to the active AI/Agent conversations
   ANTIGRAVITY_BRAIN_PATH=/Users/<your-user>/.gemini/antigravity/brain

   # Must match the API key you put in Vercel
   INGEST_API_KEY=your_ingest_api_key

   # The live URL of your deployed dashboard
   INGEST_URL=https://<your-vercel-project>.vercel.app/api/ingest
   ```

3. Start the watcher daemon:
   ```bash
   node reporter/reporter.js
   ```

If configured correctly, the reporter will scan your local directories and push session state straight to your phone. 

---

## 🛠 Tech Stack

- **Framework**: [Next.js App Router (v15+)](https://nextjs.org/)
- **Auth**: [NextAuth.js](https://next-auth.js.org/) (Google Provider)
- **Database**: [Supabase PostgreSQL](https://supabase.com/)
- **Styles**: Vanilla CSS Glassmorphism
- **Watcher**: Native Node.js `chokidar` + `fs.promises`
