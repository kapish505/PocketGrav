/**
 * lib/auth.js
 * ────────────
 * NextAuth configuration — Google OAuth.
 * Imported by the NextAuth API route and server components
 * that need to get the current session.
 */
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  // Use Google as the only sign-in method
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  // Redirect to our custom login page
  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Include the user's email in the session object
    // so we can use it to filter Supabase data
    async session({ session }) {
      return session
    },

    // Store user email in the JWT token
    async jwt({ token, account, profile }) {
      if (account) {
        token.email = profile?.email
      }
      return token
    },
  },
}
