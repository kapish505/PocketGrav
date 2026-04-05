-- ══════════════════════════════════════════════════════════════════════════
-- PocketGrav — Supabase Schema
-- Run this in: supabase.com → Your Project → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════════════

-- Sessions: one row per AntiGravity conversation/project
create table if not exists public.sessions (
  id           text primary key,          -- conversation UUID from brain/ dir
  user_email   text not null,             -- Gmail of the user who owns this
  title        text default 'Untitled',  -- extracted from task.md heading
  status       text default 'unknown',   -- active | completed | in_progress | unknown
  progress     integer default 0,        -- 0-100 percent done
  last_updated timestamptz default now(),
  metadata     jsonb default '{}'
);

-- Tasks: parsed from task.md files
create table if not exists public.tasks (
  id          bigserial primary key,
  session_id  text references public.sessions(id) on delete cascade,
  content     text not null,              -- the task text
  status      text not null,             -- done | in_progress | pending
  task_index  integer not null,          -- order within the session
  updated_at  timestamptz default now()
);

-- Documents: raw markdown content (plan, walkthrough)
create table if not exists public.documents (
  id          bigserial primary key,
  session_id  text references public.sessions(id) on delete cascade,
  doc_type    text not null,             -- 'plan' | 'walkthrough' | 'tasks_raw'
  content     text,
  updated_at  timestamptz default now(),
  unique (session_id, doc_type)          -- one doc per type per session
);

-- Logs: streamed lines from reporter
create table if not exists public.logs (
  id          bigserial primary key,
  session_id  text references public.sessions(id) on delete cascade,
  message     text not null,
  level       text default 'info',       -- info | warn | error | success | debug
  created_at  timestamptz default now()
);

-- API Keys: uniquely generated per user for the CLI tool
create table if not exists public.api_keys (
  id          text primary key default gen_random_uuid(),
  user_email  text not null unique,
  key         text not null unique,
  created_at  timestamptz default now()
);

-- ── Enable Realtime ───────────────────────────────────────────────────────────
-- This lets the phone browser get instant updates via Supabase Realtime
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.logs;

-- ── Indexes for performance ───────────────────────────────────────────────────
create index if not exists sessions_email_idx on public.sessions (user_email);
create index if not exists tasks_session_idx  on public.tasks    (session_id, task_index);
create index if not exists docs_session_idx   on public.documents(session_id, doc_type);
create index if not exists logs_session_idx   on public.logs     (session_id, created_at desc);
create index if not exists api_keys_key_idx     on public.api_keys (key);
