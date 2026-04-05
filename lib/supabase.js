/**
 * lib/supabase.js
 * ────────────────
 * Supabase client factory.
 * getSupabaseAdmin() uses the service role key (full DB access).
 * Only call this in server-side code (API routes, server components).
 * Never expose the service role key to the browser.
 */
import { createClient } from "@supabase/supabase-js"

// Admin client — bypasses Row Level Security, full access
// Use ONLY in server-side code
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Public client — use in browser/client components only if needed
export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
