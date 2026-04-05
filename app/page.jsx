/**
 * app/page.jsx — Landing Page
 * ──────────────────────────
 * A gorgeous landing page introducing the PocketGrav unified platform.
 */
import Link from 'next/link'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  // If already logged in, redirect to dashboard so we don't spam the landing page
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid #1a1a1a', marginBottom: '80px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="2" fill="#a78bfa" opacity="0.6"/>
          </svg>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>PocketGrav</span>
        </div>
        <Link 
          href="/login"
          style={{ padding: '8px 16px', background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', borderRadius: '6px', fontWeight: '500', textDecoration: 'none', border: '1px solid rgba(124, 58, 237, 0.2)', transition: 'all 0.2s' }}
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '80px', paddingBottom: '80px' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1.1, background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Monitor your AntiGravity Agents from anywhere.
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#a1a1aa', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
            PocketGrav is the ultimate mobile companion for AntiGravity developers. Watch live task execution, read architecture logs, and check system health frictionlessly via local tunnels or persistent cloud sync.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
            <Link 
              href="/login"
              style={{ padding: '14px 32px', background: '#7c3aed', color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '1.1rem', textDecoration: 'none', transition: 'background 0.2s' }}
            >
              Get Started for Free
            </Link>
            <a 
              href="https://github.com/kapish505/PocketGrav"
              target="_blank" rel="noopener noreferrer"
              style={{ padding: '14px 32px', background: '#1a1a1a', color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '1.1rem', textDecoration: 'none', border: '1px solid #333' }}
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Feature Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginTop: '40px' }}>
          
          <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#34d399' }}>⚡</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff' }}>Local Tunnel Mode</h3>
            <p style={{ color: '#a1a1aa', lineHeight: 1.5 }}>
              Want absolute zero setup? Run our local command and we instantly beam a secure Cloudflare-style localtunnel directly from your laptop to your phone via QR code. No accounts needed.
            </p>
            <div style={{ background: '#09090b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a', marginTop: '8px', fontFamily: 'monospace', color: '#34d399' }}>
              npx pocketgrav local
            </div>
          </div>

          <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#a78bfa' }}>☁️</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff' }}>Global Cloud Sync</h3>
            <p style={{ color: '#a1a1aa', lineHeight: 1.5 }}>
              Keep your laptop reporting in the background dynamically to our SaaS dashboard. We parse your brain checklists, extract H1 markdown paths, and securely sync using your private API key.
            </p>
            <div style={{ background: '#09090b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a', marginTop: '8px', fontFamily: 'monospace', color: '#a78bfa', wordBreak: 'break-all' }}>
              npx pocketgrav cloud --email x --key y
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '32px 0', textAlign: 'center', color: '#71717a', fontSize: '0.9rem', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        Designed for AntiGravity Developers. Published securely on NPM.
      </footer>
    </div>
  )
}
