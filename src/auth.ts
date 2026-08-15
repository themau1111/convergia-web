import NextAuth from "next-auth";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "oidc",
      name: "Acceso corporativo",
      type: "oidc",
      issuer: process.env.AUTH_OIDC_ISSUER,
      clientId: process.env.AUTH_OIDC_CLIENT_ID,
      clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          audience: process.env.AUTH_OIDC_AUDIENCE,
        },
      },
      profile(profile) {
        return {
          id: String(profile.sub),
          name: typeof profile.name === "string" ? profile.name : null,
          email: typeof profile.email === "string" ? profile.email : null,
        };
      },
    },
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 },
  callbacks: {
    authorized({ auth: session, request }) {
      if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/app")) {
        return Boolean(session);
      }
      return true;
    },
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.accessTokenExpiresAt =
        typeof token.accessTokenExpiresAt === "number" ? token.accessTokenExpiresAt : undefined;
      return session;
    },
  },
});
