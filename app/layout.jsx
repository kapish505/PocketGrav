/**
 * app/layout.jsx — Root Layout
 * ─────────────────────────────
 * Wraps every page in the app.
 * Loads fonts, global CSS, and the session provider.
 */
import "./globals.css"
import { Providers } from "./providers"

export const metadata = {
  title: "PocketGrav — AntiGravity Monitor",
  description: "Monitor your AntiGravity agent sessions from anywhere on your phone",
}

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {/* Animated background — visible on all pages */}
        <div className="bg-grid" />
        <div className="bg-glow" />

        {/* Session provider makes auth available to all child components */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
