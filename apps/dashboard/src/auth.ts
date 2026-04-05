import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Provision user on Clawnitor backend after GitHub OAuth
      try {
        const res = await fetch(`${API_URL}/api/auth/provision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        // Fetch user info from backend to enrich the token
        try {
          const res = await fetch(
            `${API_URL}/api/auth/me?email=${encodeURIComponent(user.email)}`
          );
          if (res.ok) {
            const data = await res.json();
            token.userId = data.user_id;
            token.tier = data.tier;
            token.apiKeyPrefix = data.key_prefix;
          }
        } catch {
          // Continue without backend data
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        (session as any).tier = token.tier;
        (session as any).apiKeyPrefix = token.apiKeyPrefix;
      }
      return session;
    },
  },
});
