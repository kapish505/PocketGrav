/**
 * app/api/ingest/route.js — Reporter Ingest Endpoint
 * ─────────────────────────────────────────────────────
 * Called by reporter.js on your laptop to push AntiGravity data to Supabase.
 * Protected by a shared API key (INGEST_API_KEY in .env.local).
 *
 * POST /api/ingest
 * Body: { session, tasks, documents, log? }
 */
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request) {
  try {
    // Verify the ingest API key against Supabase
    let apiKey = request.headers.get("x-api-key")
    const authHeader = request.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      apiKey = authHeader.split("Bearer ")[1]
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Find the user by API key
    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("user_email")
      .eq("key", apiKey)
      .single()

    if (!keyRecord) {
      return NextResponse.json({ error: "Unauthorized / Invalid API Key" }, { status: 401 })
    }

    const authenticatedEmail = keyRecord.user_email

    const body = await request.json()
    const { session, tasks, documents, log } = body

    if (!session?.id) {
      return NextResponse.json({ error: "Missing session.id" }, { status: 400 })
    }

    // 1. Upsert the session record securely bypassing the client's email
    const { error: sessionErr } = await supabase
      .from("sessions")
      .upsert({
        id:           session.id,
        user_email:   authenticatedEmail, // Forcing secure backend lookup
        title:        session.title || "Untitled",
        status:       session.status || "unknown",
        progress:     session.progress || 0,
        last_updated: new Date().toISOString(),
        metadata:     session.metadata || {},
      }, { onConflict: "id" })

    if (sessionErr) throw sessionErr

    // 2. Replace tasks for this session
    if (tasks?.length > 0) {
      // Delete old tasks first, then insert fresh ones
      await supabase.from("tasks").delete().eq("session_id", session.id)
      const { error: taskErr } = await supabase.from("tasks").insert(
        tasks.map((t, i) => ({
          session_id:  session.id,
          content:     t.content,
          status:      t.status,
          task_index:  t.index ?? i,
        }))
      )
      if (taskErr) throw taskErr
    }

    // 3. Upsert documents (plan, walkthrough)
    if (documents?.length > 0) {
      for (const doc of documents) {
        await supabase.from("documents").upsert({
          session_id: session.id,
          doc_type:   doc.type,
          content:    doc.content,
          updated_at: new Date().toISOString(),
        }, { onConflict: "session_id,doc_type" })
      }
    }

    // 4. Append a log line if provided
    if (log?.message) {
      await supabase.from("logs").insert({
        session_id: session.id,
        message:    log.message,
        level:      log.level || "info",
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error("[ingest] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
