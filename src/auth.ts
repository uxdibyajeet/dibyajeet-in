import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [GitHub],
  callbacks: {
    signIn({ profile }) {
      const allow = (process.env.ADMIN_GITHUB_USERS ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      if (allow.length === 0) return true;
      return allow.includes(String(profile?.login ?? ""));
    },
  },
});