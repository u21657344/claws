import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { CustomAdapter } from "@/lib/auth-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google({ checks: ["state"], allowDangerousEmailAccountLinking: true })],
  adapter: CustomAdapter(),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
});
