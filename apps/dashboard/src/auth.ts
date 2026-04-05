import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import {
  authUsers,
  authAccounts,
  authSessions,
  verificationTokens,
} from "@/db/schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
      from: "Clawnitor <login@clawnitor.io>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Provision user on Clawnitor backend after any auth method
      try {
        const res = await fetch(`${API_URL}/api/auth/provision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": INTERNAL_SECRET,
            "X-User-Email": user.email || "",
          },
          body: JSON.stringify({
            email: user.email,
            github_id: account?.providerAccountId,
            name: user.name,
          }),
        });
        if (!res.ok) {
          console.error("Failed to provision user:", await res.text());
        }
      } catch (err) {
        console.error("Backend provision error:", (err as Error).message);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const res = await fetch(
            `${API_URL}/api/auth/me?email=${encodeURIComponent(user.email)}`,
            { headers: { "X-Internal-Secret": INTERNAL_SECRET } }
          );
          if (res.ok) {
            const data = await res.json();
            token.userId = data.user_id;
            token.tier = data.tier;
            token.apiKeyPrefix = data.key_prefix;
            token.betaExpiresAt = data.beta_expires_at;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        (session as any).tier = token.tier;
        (session as any).apiKeyPrefix = token.apiKeyPrefix;
        (session as any).betaExpiresAt = token.betaExpiresAt;
      }
      return session;
    },
  },
});
