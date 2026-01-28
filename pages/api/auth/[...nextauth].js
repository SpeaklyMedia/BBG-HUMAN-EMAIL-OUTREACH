import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAllowed } from "../../../lib/rbac";

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
      return session;
    }
  },
  session: { strategy: "jwt" }
};

export default NextAuth(authOptions);
