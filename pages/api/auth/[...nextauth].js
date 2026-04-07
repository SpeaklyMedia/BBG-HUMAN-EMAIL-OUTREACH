import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAdmin, isAllowed, isViewer } from "../../../lib/rbac";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user?.email || "").toLowerCase();
      return isAllowed(email);
    },
    async session({ session }) {
      const email = (session?.user?.email || "").toLowerCase();
      if (session?.user) {
        session.user.role = isAdmin(email) ? "admin" : isViewer(email) ? "viewer" : "unknown";
      }
      return session;
    }
  },
  session: { strategy: "jwt" }
};

export default NextAuth(authOptions);
